
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { Task, TaskLevel, TaskStatus } from '../types';
import { generateUUID, formatDate } from './utils';

interface ChatBotProps {
  tasks: Task[];
  onAddTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  showButton?: boolean;
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

const ChatBot: React.FC<ChatBotProps> = ({ tasks, onAddTask, onUpdateTask, onDeleteTask, showButton = true }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Hello! I am your Workhand Assistant. I can help you manage your construction schedule. Try asking "What tasks are delayed?" or "Add a new workphase for Plumbing".' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const executeFunction = async (name: string, args: any) => {
    switch (name) {
      case 'addTask':
        const newTask: Task = {
          id: generateUUID(),
          name: args.name,
          level: (args.level as TaskLevel) || 'Workphase',
          parentId: args.parentId,
          startDate: args.startDate,
          endDate: args.endDate,
          agency: args.agency || '',
          status: (args.status as TaskStatus) || 'In Progress',
          progress: args.status === 'Done' ? 100 : (args.progress || 0),
          isExpanded: true,
        };
        onAddTask(newTask);
        return `Successfully added task "${newTask.name}" (${newTask.level}) starting on ${newTask.startDate}.`;
      
      case 'updateTask':
        const taskToUpdate = tasks.find(t => t.id === args.id || t.name.toLowerCase().includes(args.id.toLowerCase()));
        if (!taskToUpdate) return "Error: Could not find that task to update.";
        const updatedTask = { ...taskToUpdate, ...args.updates };
        onUpdateTask(updatedTask);
        return `Successfully updated task "${updatedTask.name}"`;

      case 'deleteTask':
        const taskToDelete = tasks.find(t => t.id === args.id || t.name.toLowerCase().includes(args.id.toLowerCase()));
        if (!taskToDelete) return "Error: Could not find that task to delete.";
        onDeleteTask(taskToDelete.id);
        return `Successfully deleted task "${taskToDelete.name}" and its children.`;

      default:
        return "Unknown function called.";
    }
  };

  const handleSuggestion = (text: string) => {
    setInput(text);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const now = new Date();
      const currentDateStr = formatDate(now);
      
      const addTaskTool = {
        name: 'addTask',
        parameters: {
          type: Type.OBJECT,
          description: 'Adds a new task to the construction schedule. MANDATORY: Name, Level, StartDate, EndDate.',
          properties: {
            name: { type: Type.STRING, description: 'The name of the task.' },
            level: { type: Type.STRING, enum: ['Workphase', 'Mainwork', 'In-work', 'Subwork'], description: 'The hierarchy level.' },
            startDate: { type: Type.STRING, description: 'ISO date string YYYY-MM-DD.' },
            endDate: { type: Type.STRING, description: 'ISO date string YYYY-MM-DD.' },
            agency: { type: Type.STRING, description: 'Responsible agency.' },
            status: { type: Type.STRING, enum: ['In Progress', 'Done', 'Delay'], description: 'Current status.' },
            parentId: { type: Type.STRING, description: 'ID of the parent task if applicable.' },
            progress: { type: Type.NUMBER, description: '0-100 percentage.' }
          },
          required: ['name', 'level', 'startDate', 'endDate']
        }
      };

      const updateTaskTool = {
        name: 'updateTask',
        parameters: {
          type: Type.OBJECT,
          description: 'Updates an existing task.',
          properties: {
            id: { type: Type.STRING, description: 'The ID or exact name of the task to update.' },
            updates: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                status: { type: Type.STRING, enum: ['In Progress', 'Done', 'Delay'] },
                progress: { type: Type.NUMBER },
                startDate: { type: Type.STRING },
                endDate: { type: Type.STRING },
                delayReason: { type: Type.STRING }
              }
            }
          },
          required: ['id', 'updates']
        }
      };

      const deleteTaskTool = {
        name: 'deleteTask',
        parameters: {
          type: Type.OBJECT,
          description: 'Deletes a task and its children.',
          properties: {
            id: { type: Type.STRING, description: 'The ID or exact name of the task to delete.' }
          },
          required: ['id']
        }
      };

      const systemInstruction = `You are the Workhand Project Manager AI. Today's date is ${currentDateStr}.
      
      STRICT RULES:
      1. To ADD a task, you MUST have: Name, Hierarchy Level, Start Date, and End Date.
      2. If any of these 4 fields are missing from the user's request, DO NOT call 'addTask'. Instead, respond by asking the user specifically for the missing information.
      3. Use a professional yet friendly tone.
      4. If the user mentions "next week" or "tomorrow", calculate the dates based on ${currentDateStr}.
      5. Current project tasks: ${JSON.stringify(tasks)}.
      
      Hierarchy Levels explained:
      - Workphase: High-level phase.
      - Mainwork: Major activity.
      - In-work: Medium detail.
      - Subwork: Granular task.`;

      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [
          ...messages.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] })),
          { role: 'user', parts: [{ text: userMsg }] }
        ],
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: [addTaskTool, updateTaskTool, deleteTaskTool] }]
        }
      });

      let finalResponseText = response.text || "";

      if (response.functionCalls) {
        for (const call of response.functionCalls) {
          const toolResult = await executeFunction(call.name, call.args);
          finalResponseText = (finalResponseText ? finalResponseText + "\n\n" : "") + toolResult;
        }
      }

      if (!finalResponseText) {
        finalResponseText = "I'm sorry, I couldn't process that. Could you please provide more details like the task name, hierarchy level, and dates?";
      }

      setMessages(prev => [...prev, { role: 'model', text: finalResponseText }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: 'I encountered an error. Please check your internet connection and try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = [
    "What tasks are delayed?",
    "Add a task for Electrical",
    "Show current workphases",
    "Mark foundation as done"
  ];

  return (
    <>
      {/* Floating Button */}
      {showButton && (
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="fixed bottom-8 right-8 w-16 h-16 bg-blue-600 text-white rounded-2xl shadow-2xl flex items-center justify-center hover:bg-blue-700 transition-all hover:scale-105 active:scale-95 z-[200] group"
        >
          {isOpen ? (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
          ) : (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
          )}
        </button>
      )}

      {/* Chat Window */}
      <div className={`
        fixed bottom-28 right-4 md:right-8 w-[calc(100vw-32px)] md:w-[420px] h-[650px] max-h-[80vh] bg-white rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-gray-100 flex flex-col overflow-hidden z-[200] transition-all duration-300 transform origin-bottom-right
        ${isOpen ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-10 opacity-0 scale-90 pointer-events-none'}
      `}>
        {/* Header */}
        <div className="p-6 bg-gray-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/20">AI</div>
            <div>
              <h4 className="font-black text-sm tracking-tight">Project Assistant</h4>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Active • Gemini 3 Pro</span>
              </div>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-xl transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`
                max-w-[88%] p-4 rounded-2xl text-sm leading-relaxed shadow-sm transition-all
                ${m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-gray-700 border border-gray-100 rounded-tl-none'}
              `}>
                {m.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Analyzing Schedule</span>
              </div>
            </div>
          )}
        </div>

        {/* Suggestion Chips */}
        {!isLoading && (
          <div className="px-6 py-2 overflow-x-auto whitespace-nowrap scrollbar-hide flex gap-2 border-t border-gray-50">
            {suggestions.map((s, i) => (
              <button 
                key={i} 
                onClick={() => handleSuggestion(s)}
                className="text-[10px] font-bold text-gray-400 border border-gray-100 bg-white hover:border-blue-200 hover:text-blue-600 px-3 py-1.5 rounded-full transition-all shrink-0 uppercase tracking-tight"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="p-4 bg-white border-t border-gray-100">
          <div className="relative flex items-center bg-gray-100 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-600/20 focus-within:bg-white transition-all">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="E.g. Add roofing starting next Monday..."
              className="w-full pl-5 pr-14 py-4 bg-transparent border-none text-sm font-bold text-gray-700 placeholder:text-gray-300 placeholder:font-bold outline-none"
            />
            <button 
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="absolute right-2 w-10 h-10 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/20 active:scale-90 flex items-center justify-center"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
            </button>
          </div>
          <p className="text-[9px] text-center text-gray-400 mt-3 font-bold uppercase tracking-widest">Construction Project Assistant</p>
        </div>
      </div>
    </>
  );
};

export default ChatBot;

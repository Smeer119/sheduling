
import React, { useState, useEffect, useMemo } from 'react';
import { Task, TaskLevel, TaskStatus } from './types';
import { flattenTasks, getMonthRange, generateUUID, formatDate } from './workhand/utils';
import SidebarView from './workhand/SidebarView';
import GanttView from './workhand/GanttView';
import TaskModal from './workhand/TaskModal';
import ChatBot from './workhand/ChatBot';

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('workhand_v2_tasks');
    // Start with empty tasks if nothing in localStorage
    return saved ? JSON.parse(saved) : [];
  });

  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [parentForNewSubtask, setParentForNewSubtask] = useState<{id: string, level: TaskLevel} | undefined>();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('workhand_v2_tasks', JSON.stringify(tasks));
  }, [tasks]);

  const { start: monthStart, end: monthEnd } = useMemo(() => getMonthRange(currentMonthDate), [currentMonthDate]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [tasks, searchQuery]);

  const visibleTasks = useMemo(() => flattenTasks(filteredTasks), [filteredTasks]);

  const handleUpdateTask = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  };

  const startDeleteFlow = (id: string) => {
    setDeleteDialogId(id);
  };

  const finalDeleteTask = (id: string) => {
    const idsToDelete = new Set([id]);
    const findChildren = (pid: string) => {
      tasks.forEach(t => {
        if (t.parentId === pid) {
          idsToDelete.add(t.id);
          findChildren(t.id);
        }
      });
    };
    findChildren(id);
    setTasks(prev => prev.filter(t => !idsToDelete.has(t.id)));
    setDeleteDialogId(null);
  };

  const handleToggleExpand = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, isExpanded: !t.isExpanded } : t));
  };

  const handleSaveTask = (task: Task) => {
    if (editingTask) {
      handleUpdateTask(task);
    } else {
      setTasks(prev => [...prev, task]);
    }
    closeModal();
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTask(undefined);
    setParentForNewSubtask(undefined);
  };

  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('taskId', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (e: React.DragEvent, dropId: string) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('taskId');
    if (draggedId === dropId) return;

    const isChild = (parentId: string, targetId: string): boolean => {
        const children = tasks.filter(t => t.parentId === parentId);
        for (const child of children) {
            if (child.id === targetId) return true;
            if (isChild(child.id, targetId)) return true;
        }
        return false;
    };

    if (isChild(draggedId, dropId)) {
        alert("Cannot drag a parent into its own child hierarchy.");
        return;
    }

    const draggedTask = tasks.find(t => t.id === draggedId);
    const dropTask = tasks.find(t => t.id === dropId);
    
    if (draggedTask && dropTask) {
      setTasks(prev => {
        const nextLevelMap: Record<TaskLevel, TaskLevel> = {
            'Workphase': 'Mainwork',
            'Mainwork': 'In-work',
            'In-work': 'Subwork',
            'Subwork': 'Subwork'
        };
        const updated = prev.map(t => {
            if (t.id === draggedId) {
                return { ...t, parentId: dropId, level: nextLevelMap[dropTask.level] };
            }
            return t;
        });
        return updated;
      });
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white text-gray-900 font-sans selection:bg-blue-100">
      <aside className="hidden md:flex w-20 bg-gray-950 flex-col items-center py-8 gap-10 shrink-0 border-r border-white/5">
        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black shadow-2xl shadow-blue-500/40 text-2xl transition-transform hover:scale-105">W</div>
        <nav className="flex flex-col gap-8 text-gray-500">
           <button className="p-2.5 bg-white/5 text-blue-400 rounded-2xl transition-all shadow-inner"><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7"></path></svg></button>
           <button className="p-2.5 hover:bg-white/10 rounded-2xl transition-all hover:text-white"><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></button>
           <button className="p-2.5 hover:bg-white/10 rounded-2xl transition-all hover:text-white"><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg></button>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-24 border-b border-gray-100 flex items-center justify-between px-6 md:px-10 bg-white shrink-0 z-50">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-3 text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tightest">Workhand</h1>
                <span className="hidden sm:inline-block px-2 py-0.5 bg-blue-600 text-[10px] font-black text-white rounded-md uppercase tracking-widest">PRO</span>
              </div>
              <p className="text-[10px] md:text-xs font-black text-gray-400 uppercase tracking-widest mt-0.5">Project Control Panel</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 md:gap-5">
             <div className="hidden lg:flex items-center bg-gray-50 border border-gray-100 rounded-2xl px-5 py-2.5 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                <svg className="w-4 h-4 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                <input 
                  type="text" 
                  placeholder="Filter nodes..." 
                  className="bg-transparent border-none outline-none text-sm font-bold w-56 text-gray-700 placeholder:text-gray-300 placeholder:font-bold"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
             </div>
             <button 
               onClick={() => { setEditingTask(undefined); setIsModalOpen(true); }}
               className="bg-blue-600 text-white px-5 md:px-8 py-3.5 rounded-2xl font-black text-sm hover:bg-blue-700 shadow-2xl shadow-blue-500/30 transition-all active:scale-[0.96] flex items-center gap-2"
             >
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
               <span className="hidden sm:inline">Add Workphase</span>
               <span className="sm:hidden">Add</span>
             </button>
          </div>
        </header>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          <div className={`
            absolute inset-0 z-[60] bg-white transition-transform duration-500 ease-in-out transform md:relative md:translate-x-0
            ${isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
          `}>
            <SidebarView 
              tasks={visibleTasks} 
              onToggleExpand={handleToggleExpand}
              onEdit={(t) => { setEditingTask(t); setIsModalOpen(true); }}
              onDelete={startDeleteFlow}
              onAddSubtask={(pid, lvl) => { setParentForNewSubtask({ id: pid, level: lvl }); setEditingTask(undefined); setIsModalOpen(true); }}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
            />
            {isMobileMenuOpen && (
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="absolute top-6 right-6 md:hidden p-3 bg-gray-900 text-white rounded-2xl shadow-xl active:scale-90 transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            )}
          </div>

          <GanttView 
            tasks={visibleTasks} 
            startDate={monthStart} 
            endDate={monthEnd}
            currentDate={currentMonthDate}
            onMonthChange={setCurrentMonthDate}
            onUpdateTask={handleUpdateTask}
            onEditTask={(t) => { setEditingTask(t); setIsModalOpen(true); }}
          />
        </div>
      </main>

      {/* AI ChatBot */}
      <ChatBot 
        tasks={tasks}
        onAddTask={(t) => setTasks(prev => [...prev, t])}
        onUpdateTask={handleUpdateTask}
        onDeleteTask={(id) => finalDeleteTask(id)}
      />

      {isModalOpen && (
        <TaskModal 
          task={editingTask}
          parentId={parentForNewSubtask?.id}
          defaultLevel={parentForNewSubtask?.level}
          onSave={handleSaveTask}
          onClose={closeModal}
        />
      )}

      {deleteDialogId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-gray-950/80 backdrop-blur-md animate-in fade-in duration-300 p-6">
          <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mb-6">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">Delete this node?</h3>
            <p className="text-gray-500 mb-8 font-medium leading-relaxed text-sm">Deleting this node will recursively remove all associated child tasks. This action is irreversible.</p>
            <div className="flex gap-4">
              <button onClick={() => setDeleteDialogId(null)} className="flex-1 py-4 border border-gray-100 rounded-2xl font-black text-sm text-gray-400 hover:bg-gray-50 transition-all uppercase tracking-widest">Cancel</button>
              <button onClick={() => finalDeleteTask(deleteDialogId)} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black text-sm hover:bg-red-700 shadow-2xl shadow-red-500/20 transition-all active:scale-95 uppercase tracking-widest">Delete All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

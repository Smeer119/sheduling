
import React from 'react';
import { Task, TaskLevel, TASK_LEVEL_COLORS, STATUS_COLORS } from '../types';

interface SidebarViewProps {
  tasks: Task[];
  onToggleExpand: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onAddSubtask: (parentId: string, level: TaskLevel) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, id: string) => void;
}

const SidebarView: React.FC<SidebarViewProps> = ({ 
  tasks, 
  onToggleExpand, 
  onEdit, 
  onDelete, 
  onAddSubtask,
  onDragStart,
  onDragOver,
  onDrop
}) => {
  const getLevelDepth = (level: TaskLevel): number => {
    switch (level) {
      case 'Workphase': return 0;
      case 'Mainwork': return 1;
      case 'In-work': return 2;
      case 'Subwork': return 3;
      default: return 0;
    }
  };

  const getNextLevel = (level: TaskLevel): TaskLevel => {
    switch (level) {
      case 'Workphase': return 'Mainwork';
      case 'Mainwork': return 'In-work';
      case 'In-work': return 'Subwork';
      case 'Subwork': return 'Subwork';
      default: return 'Workphase';
    }
  };

  return (
    <div className="w-full md:w-[420px] bg-white border-r border-gray-100 overflow-y-auto h-full flex flex-col shrink-0">
      <div className="p-5 border-b border-gray-50 flex justify-between items-center bg-white sticky top-0 z-10">
        <div>
          <h3 className="font-black text-gray-900 tracking-tight text-lg">Task Hierarchy</h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Project Structure</p>
        </div>
        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md uppercase tracking-widest">{tasks.length} Nodes</span>
      </div>
      
      <div className="flex-1 pb-24">
        {tasks.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-gray-300">
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No tasks yet</p>
            <p className="text-xs text-gray-300 mt-2">Use the "Add" button or Chat AI to start</p>
          </div>
        ) : (
          tasks.map((task) => {
            const depth = getLevelDepth(task.level);
            const hasChildren = tasks.some(t => t.parentId === task.id);
            
            return (
              <div 
                key={task.id} 
                draggable
                onDragStart={(e) => onDragStart(e, task.id)}
                onDragOver={(e) => onDragOver(e, task.id)}
                onDrop={(e) => onDrop(e, task.id)}
                className={`group border-b border-gray-50 flex flex-col hover:bg-blue-50/40 transition-all cursor-grab active:cursor-grabbing relative py-4 pr-4`}
                style={{ paddingLeft: `${depth * 24 + 16}px` }}
              >
                {depth > 0 && (
                  <>
                    <div className="absolute left-[16px] top-0 bottom-0 w-[1px] bg-gray-100" style={{ left: `${(depth - 1) * 24 + 26}px` }} />
                    <div className="absolute w-4 h-[1px] bg-gray-100 top-1/2" style={{ left: `${(depth - 1) * 24 + 26}px` }} />
                  </>
                )}

                <div className="flex items-center gap-2 relative z-10">
                  <button 
                    onClick={() => onToggleExpand(task.id)}
                    className={`w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white shadow-sm text-gray-400 hover:text-blue-600 transition-all ${task.isExpanded ? 'rotate-90' : ''} ${!hasChildren ? 'invisible' : ''}`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path></svg>
                  </button>
                  
                  <div 
                    className="w-1.5 h-6 rounded-full shrink-0 shadow-sm" 
                    style={{ backgroundColor: TASK_LEVEL_COLORS[task.level] }}
                  />
                  
                  <div className="flex-1 min-w-0" onClick={() => onEdit(task)}>
                    <div className="flex items-center gap-2">
                      {/* Hierarchy Indicator Dot */}
                      <div className={`w-2 h-2 rounded-full shrink-0 ${hasChildren ? 'border-2 border-blue-400' : 'bg-gray-300'}`} />
                      
                      <span className={`truncate text-sm font-bold tracking-tight ${task.level === 'Workphase' ? 'text-gray-900 text-[15px]' : 'text-gray-700'}`}>
                        {task.name}
                      </span>
                      {task.status === 'Delay' && (
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-sm shadow-red-200" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span 
                        className="text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded shadow-sm"
                        style={{ backgroundColor: `${STATUS_COLORS[task.status]}15`, color: STATUS_COLORS[task.status] }}
                      >
                        {task.status}
                      </span>
                      {task.agency && (
                        <span className="text-[9px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 uppercase tracking-tighter">
                          {task.agency}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onAddSubtask(task.id, getNextLevel(task.level)); }}
                      className="p-1.5 bg-white rounded-lg text-gray-400 hover:text-blue-600 shadow-sm border border-gray-100 transition-all"
                      title="Add Child"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                      className="p-1.5 bg-white rounded-lg text-gray-400 hover:text-red-600 shadow-sm border border-gray-100 transition-all"
                      title="Delete Node"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                </div>
                {task.status === 'Delay' && task.delayReason && (
                  <div className="mt-2 ml-10 p-2 bg-red-50/50 rounded-lg border border-red-100 text-[9px] text-red-600 font-medium leading-tight">
                    <span className="font-black uppercase mr-1">Delay:</span> {task.delayReason}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default SidebarView;

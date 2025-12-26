
import React, { useRef, useEffect } from 'react';
import { Task, STATUS_COLORS } from '../types';
import { DAY_WIDTH, getDayOffset, getDuration, formatDate, getMonthName } from './utils';

interface GanttViewProps {
  tasks: Task[];
  startDate: string;
  endDate: string;
  onUpdateTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  currentDate: Date;
  onMonthChange: (date: Date) => void;
}

const GanttView: React.FC<GanttViewProps> = ({ 
  tasks, startDate, endDate, onUpdateTask, onEditTask, currentDate, onMonthChange 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rowHeight = 61;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days: Date[] = [];
  const curr = new Date(start);
  while (curr <= end) {
    days.push(new Date(curr));
    curr.setDate(curr.getDate() + 1);
  }

  const todayStr = formatDate(new Date());
  const todayOffset = getDayOffset(todayStr, startDate) * DAY_WIDTH;

  const handlePrevMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() - 1);
    onMonthChange(d);
  };

  const handleNextMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + 1);
    onMonthChange(d);
  };

  const handleDragStart = (e: React.MouseEvent, task: Task, action: 'move' | 'resize-start' | 'resize-end') => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const initialStart = new Date(task.startDate);
    const initialEnd = new Date(task.endDate);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const dayDelta = Math.round(deltaX / DAY_WIDTH);
      if (dayDelta === 0 && action === 'move') return;

      let newStart = new Date(initialStart);
      let newEnd = new Date(initialEnd);

      if (action === 'move') {
        newStart.setDate(initialStart.getDate() + dayDelta);
        newEnd.setDate(initialEnd.getDate() + dayDelta);
      } else if (action === 'resize-start') {
        newStart.setDate(initialStart.getDate() + dayDelta);
        if (newStart > newEnd) newStart = new Date(newEnd);
      } else if (action === 'resize-end') {
        newEnd.setDate(initialEnd.getDate() + dayDelta);
        if (newEnd < newStart) newEnd = new Date(newStart);
      }

      onUpdateTask({
        ...task,
        startDate: formatDate(newStart),
        endDate: formatDate(newEnd),
      });
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  useEffect(() => {
    if (containerRef.current && todayOffset > 0) {
      const viewWidth = containerRef.current.clientWidth;
      containerRef.current.scrollLeft = Math.max(0, todayOffset - (viewWidth / 2));
    }
  }, [startDate, todayOffset]);

  const renderConnections = () => {
    return (
      <svg 
        className="absolute top-0 left-0 pointer-events-none overflow-visible" 
        style={{ width: days.length * DAY_WIDTH, height: tasks.length * rowHeight, zIndex: 5 }}
      >
        {tasks.map((task, index) => {
          if (!task.parentId) return null;
          const parentIndex = tasks.findIndex(t => t.id === task.parentId);
          if (parentIndex === -1) return null;

          const xChildStart = getDayOffset(task.startDate, startDate) * DAY_WIDTH;
          const yChildMid = index * rowHeight + (rowHeight / 2);

          const parent = tasks[parentIndex];
          const xParentStart = getDayOffset(parent.startDate, startDate) * DAY_WIDTH;
          const yParentMid = parentIndex * rowHeight + (rowHeight / 2);

          // We draw a line starting from a bit inside parent start, dropping down to child mid
          const anchorX = xParentStart + 15;
          
          return (
            <g key={`conn-${task.id}`}>
              <path 
                d={`M ${anchorX} ${yParentMid} L ${anchorX} ${yChildMid} L ${xChildStart} ${yChildMid}`}
                fill="none"
                stroke="#cbd5e1"
                strokeWidth="1.5"
                strokeDasharray="4 2" // Dotted lines
              />
              <circle cx={anchorX} cy={yParentMid} r="2" fill="#94a3b8" />
              <circle cx={xChildStart} cy={yChildMid} r="2" fill="#94a3b8" />
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      <div className="bg-white border-b border-gray-100 h-16 flex items-center justify-between px-6 shrink-0 z-40">
        <div className="flex items-center gap-6">
          <div className="flex items-center bg-gray-100 p-1 rounded-xl">
            <button onClick={handlePrevMonth} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-gray-500 hover:text-blue-600 transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
            </button>
            <h2 className="text-sm font-black text-gray-900 min-w-[140px] text-center tracking-tight px-4 uppercase">
              {getMonthName(currentDate)}
            </h2>
            <button onClick={handleNextMonth} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-gray-500 hover:text-blue-600 transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path></svg>
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onMonthChange(new Date())} 
            className="text-[10px] font-black uppercase tracking-widest text-blue-600 px-4 py-2 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all"
          >
            Go to Today
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-auto relative scroll-smooth" ref={containerRef}>
        <div className="sticky top-0 z-30 flex bg-white border-b border-gray-100" style={{ width: days.length * DAY_WIDTH }}>
          {days.map((day, i) => {
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            const isToday = formatDate(day) === todayStr;
            return (
              <div 
                key={i} 
                className={`flex flex-col items-center justify-center h-20 border-r border-gray-50 text-[10px] select-none transition-colors ${isWeekend ? 'bg-gray-50/40' : 'bg-white'}`}
                style={{ width: DAY_WIDTH }}
              >
                <span className={`uppercase font-black tracking-widest text-[9px] mb-1 ${isWeekend ? 'text-gray-300' : 'text-gray-400'}`}>
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'][day.getDay()]}
                </span>
                <span className={`font-black w-7 h-7 flex items-center justify-center rounded-lg transition-all text-sm ${isToday ? 'bg-blue-600 text-white shadow-lg shadow-blue-300' : 'text-gray-700'}`}>
                  {day.getDate()}
                </span>
              </div>
            );
          })}
        </div>

        <div className="absolute top-0 left-0 h-full pointer-events-none w-full" style={{ zIndex: 0 }}>
          {days.map((day, i) => (
            <div 
              key={i} 
              className={`absolute top-0 h-full border-r border-gray-50/50 ${day.getDay() === 0 || day.getDay() === 6 ? 'bg-gray-50/20' : ''}`}
              style={{ left: i * DAY_WIDTH, width: DAY_WIDTH }}
            />
          ))}
          <div className="absolute top-0 h-full border-l-2 border-blue-400 border-dashed z-20 opacity-50" style={{ left: todayOffset }} />
        </div>

        <div className="relative flex flex-col pt-0" style={{ width: days.length * DAY_WIDTH }}>
          {renderConnections()}
          
          {tasks.map((task) => {
            const left = getDayOffset(task.startDate, startDate) * DAY_WIDTH;
            const duration = getDuration(task.startDate, task.endDate);
            const width = duration * DAY_WIDTH;
            const barColor = STATUS_COLORS[task.status];

            return (
              <div key={task.id} className="h-[61px] flex items-center relative border-b border-gray-50/30 group">
                <div 
                  className="absolute h-9 rounded-xl shadow-md flex items-center cursor-pointer group/bar overflow-hidden group-hover:shadow-xl transition-all z-10"
                  style={{ 
                    left: left, 
                    width: width, 
                    backgroundColor: barColor,
                    border: `2px solid white`
                  }}
                  onClick={() => onEditTask(task)}
                  onMouseDown={(e) => handleDragStart(e, task, 'move')}
                >
                  <div 
                    className="absolute left-0 top-0 h-full bg-black/15 transition-all"
                    style={{ width: `${task.progress}%` }}
                  />
                  
                  <div className="relative z-10 px-4 flex items-center justify-between w-full h-full min-w-0">
                    <span className="text-white text-[11px] font-black truncate drop-shadow-md tracking-tight">
                      {task.name} <span className="opacity-80 font-bold ml-1.5">{task.progress}%</span>
                    </span>
                  </div>

                  <div className="absolute left-0 top-0 w-2.5 h-full cursor-ew-resize hover:bg-white/30 z-20" onMouseDown={(e) => { e.stopPropagation(); handleDragStart(e, task, 'resize-start'); }} />
                  <div className="absolute right-0 top-0 w-2.5 h-full cursor-ew-resize hover:bg-white/30 z-20" onMouseDown={(e) => { e.stopPropagation(); handleDragStart(e, task, 'resize-end'); }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GanttView;

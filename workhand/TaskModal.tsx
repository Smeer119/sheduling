
import React, { useState, useEffect } from 'react';
import { Task, TaskLevel, TaskStatus, STATUS_COLORS } from '../types';
import { generateUUID, formatDate } from './utils';

interface TaskModalProps {
  task?: Task;
  onSave: (task: Task) => void;
  onClose: () => void;
  parentId?: string;
  defaultLevel?: TaskLevel;
}

const TaskModal: React.FC<TaskModalProps> = ({ task, onSave, onClose, parentId, defaultLevel }) => {
  const [name, setName] = useState(task?.name || '');
  const [level, setLevel] = useState<TaskLevel>(task?.level || defaultLevel || 'Workphase');
  const [startDate, setStartDate] = useState(task?.startDate || formatDate(new Date()));
  const [endDate, setEndDate] = useState(task?.endDate || formatDate(new Date(new Date().setDate(new Date().getDate() + 5))));
  const [progress, setProgress] = useState(task?.progress || 0);
  const [description, setDescription] = useState(task?.description || '');
  const [agency, setAgency] = useState(task?.agency || '');
  const [status, setStatus] = useState<TaskStatus>(task?.status || 'In Progress');
  const [delayReason, setDelayReason] = useState(task?.delayReason || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startDate || !endDate) return;
    if (status === 'Delay' && !delayReason) {
      alert('Please provide a reason for the delay.');
      return;
    }

    // Fixed: Removed 'agencies' property as it is not part of the Task interface
    const newTask: Task = {
      id: task?.id || generateUUID(),
      name,
      level,
      parentId: task?.parentId || parentId,
      startDate,
      endDate,
      progress: status === 'Done' ? 100 : progress,
      description,
      agency,
      status,
      delayReason: status === 'Delay' ? delayReason : '',
      isExpanded: task ? task.isExpanded : true
    };
    onSave(newTask);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col scale-in-center">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{task ? 'Task Details' : 'Create New Task'}</h2>
            {task && <span className="text-xs text-gray-400 font-mono">ID: {task.id}</span>}
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">Task Name</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all font-medium"
                placeholder="What needs to be done?"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Responsible Agency</label>
              <input 
                type="text" 
                value={agency} 
                onChange={(e) => setAgency(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none"
                placeholder="e.g. Acme Corp"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Status</label>
              <select 
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none font-semibold text-gray-700"
                style={{ color: STATUS_COLORS[status] }}
              >
                <option value="In Progress">In Progress</option>
                <option value="Done">Done</option>
                <option value="Delay">Delay</option>
              </select>
            </div>

            {status === 'Delay' && (
              <div className="md:col-span-2 animate-in slide-in-from-top-2 duration-200">
                <label className="block text-sm font-bold text-red-600 mb-2">Reason for Delay</label>
                <textarea 
                  value={delayReason}
                  onChange={(e) => setDelayReason(e.target.value)}
                  className="w-full px-4 py-3 bg-red-50 border border-red-100 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                  rows={2}
                  placeholder="Explain why the task is delayed..."
                  required
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 md:col-span-2">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Start Date</label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">End Date</label>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Hierarchy Level</label>
              <select 
                value={level}
                onChange={(e) => setLevel(e.target.value as TaskLevel)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="Workphase">Workphase</option>
                <option value="Mainwork">Mainwork</option>
                <option value="In-work">In-work</option>
                <option value="Subwork">Subwork</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Progress ({progress}%)</label>
              <input 
                type="range" 
                min="0" max="100"
                value={status === 'Done' ? 100 : progress}
                disabled={status === 'Done'}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 mt-4"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                rows={4}
                placeholder="Additional task details..."
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-200 rounded-xl text-gray-700 font-bold hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
            >
              {task ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;

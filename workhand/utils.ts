
import { Task } from '../types';

export const DAY_WIDTH = 48;

export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const getDuration = (start: string, end: string): number => {
  const s = new Date(start);
  const e = new Date(end);
  const diffTime = Math.abs(e.getTime() - s.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

export const isOverdue = (task: Task): boolean => {
  if (task.status === 'Done') return false;
  const today = new Date();
  const end = new Date(task.endDate);
  return today > end || task.status === 'Delay';
};

export const getDayOffset = (date: string, baseDate: string): number => {
  const d = new Date(date);
  const base = new Date(baseDate);
  const diffTime = d.getTime() - base.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

export const generateUUID = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

export const flattenTasks = (tasks: Task[], parentId: string | undefined = undefined): Task[] => {
  let result: Task[] = [];
  const filtered = tasks.filter(t => t.parentId === parentId);
  
  for (const task of filtered) {
    result.push(task);
    if (task.isExpanded !== false) {
      result = [...result, ...flattenTasks(tasks, task.id)];
    }
  }
  return result;
};

export const getMonthRange = (date: Date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return {
    start: formatDate(start),
    end: formatDate(end)
  };
};

export const getMonthName = (date: Date) => {
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
};

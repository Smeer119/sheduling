
export type TaskLevel = 'Workphase' | 'Mainwork' | 'In-work' | 'Subwork';
export type TaskStatus = 'In Progress' | 'Done' | 'Delay';

export interface Task {
  id: string;
  name: string;
  level: TaskLevel;
  parentId?: string;
  startDate: string; // ISO string
  endDate: string;   // ISO string
  progress: number;  // 0-100
  agency: string;
  status: TaskStatus;
  delayReason?: string;
  description?: string;
  color?: string;
  dependencies?: string[];
  isExpanded?: boolean;
}

export const TASK_LEVEL_COLORS: Record<TaskLevel, string> = {
  'Workphase': '#3b82f6', // Blue
  'Mainwork': '#10b981',  // Emerald
  'In-work': '#8b5cf6',   // Violet
  'Subwork': '#f59e0b',   // Amber
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  'In Progress': '#3b82f6',
  'Done': '#10b981',
  'Delay': '#ef4444',
};

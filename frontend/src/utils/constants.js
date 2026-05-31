export const ROLES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  MEMBER: 'MEMBER',
};

export const TASK_STATUS = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  IN_REVIEW: 'IN_REVIEW',
  DONE: 'DONE',
  BLOCKED: 'BLOCKED',
};

export const TASK_PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
};

export const STATUS_LABELS = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
  BLOCKED: 'Blocked',
};

export const STATUS_COLORS = {
  TODO: 'bg-slate-100 text-slate-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  IN_REVIEW: 'bg-yellow-100 text-yellow-700',
  DONE: 'bg-green-100 text-green-700',
  BLOCKED: 'bg-red-100 text-red-700',
};

export const PRIORITY_COLORS = {
  LOW: 'bg-slate-100 text-slate-600',
  MEDIUM: 'bg-orange-100 text-orange-600',
  HIGH: 'bg-red-100 text-red-600',
};

export const PRIORITY_DOT_COLORS = {
  LOW: 'bg-slate-400',
  MEDIUM: 'bg-orange-400',
  HIGH: 'bg-red-500',
};

// Valid transitions from each status
export const STATUS_TRANSITIONS = {
  TODO: ['IN_PROGRESS', 'BLOCKED'],
  IN_PROGRESS: ['IN_REVIEW', 'BLOCKED'],
  IN_REVIEW: ['DONE', 'BLOCKED'],
  DONE: [],
  BLOCKED: [],
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const isOverdue = (dueDate, status) => {
  if (!dueDate || status === 'DONE') return false;
  return new Date(dueDate) < new Date();
};

export const getErrorMessage = (error) => {
  return (
    error?.response?.data?.message ||
    error?.message ||
    'An unexpected error occurred'
  );
};

export const ROLE_BADGE_COLORS = {
  ADMIN: 'bg-purple-100 text-purple-700',
  MANAGER: 'bg-blue-100 text-blue-700',
  MEMBER: 'bg-slate-100 text-slate-700',
};

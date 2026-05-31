import React from 'react';
import { Link } from 'react-router-dom';
import {
  PencilSquareIcon,
  TrashIcon,
  UserCircleIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import { StatusBadge, PriorityBadge } from '../common/Badge';
import { formatDate, isOverdue } from '../../utils/constants';
import { useAuthStore } from '../../store/authStore';

export const TaskCard = ({ task, onEdit, onDelete }) => {
  const canManageTasks = useAuthStore((s) => s.canManageTasks());
  const overdue = isOverdue(task.dueDate, task.status);

  return (
    <div className="card p-4 hover:shadow-md transition-shadow group">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <Link
          to={`/tasks/${task._id}`}
          className="text-sm font-semibold text-slate-900 hover:text-primary-600 transition-colors line-clamp-2 flex-1"
        >
          {task.title}
        </Link>
        {canManageTasks && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button
              onClick={() => onEdit(task)}
              className="p-1 rounded text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
              title="Edit task"
            >
              <PencilSquareIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(task)}
              className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Delete task"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-slate-500 mb-3 line-clamp-2">{task.description}</p>
      )}

      {/* Badges */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <StatusBadge status={task.status} />
        <PriorityBadge priority={task.priority} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
        <div className="flex items-center gap-1.5">
          <UserCircleIcon className="h-3.5 w-3.5" />
          <span>{task.assignee?.name || 'Unassigned'}</span>
        </div>
        {task.dueDate && (
          <div className={`flex items-center gap-1 ${overdue ? 'text-red-500 font-medium' : ''}`}>
            <CalendarDaysIcon className="h-3.5 w-3.5" />
            <span>{overdue ? '⚠ ' : ''}{formatDate(task.dueDate)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

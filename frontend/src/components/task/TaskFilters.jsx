import React from 'react';
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { TASK_STATUS, TASK_PRIORITY, STATUS_LABELS } from '../../utils/constants';

const STATUSES = Object.values(TASK_STATUS);
const PRIORITIES = Object.values(TASK_PRIORITY);

export const TaskFilters = ({ filters, onChange }) => {
  const handleChange = (key, value) => {
    onChange({ ...filters, [key]: value, page: 1 });
  };

  const hasActiveFilters = filters.status || filters.priority || filters.assignee;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1.5 text-sm text-slate-500">
        <FunnelIcon className="h-4 w-4" />
        <span className="font-medium">Filter:</span>
      </div>

      {/* Status */}
      <select
        className="input w-auto text-sm py-1.5"
        value={filters.status || ''}
        onChange={(e) => handleChange('status', e.target.value || undefined)}
      >
        <option value="">All Statuses</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>{STATUS_LABELS[s]}</option>
        ))}
      </select>

      {/* Priority */}
      <select
        className="input w-auto text-sm py-1.5"
        value={filters.priority || ''}
        onChange={(e) => handleChange('priority', e.target.value || undefined)}
      >
        <option value="">All Priorities</option>
        {PRIORITIES.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>

      {/* Sort */}
      <select
        className="input w-auto text-sm py-1.5"
        value={`${filters.sortBy || 'createdAt'}_${filters.sortOrder || 'desc'}`}
        onChange={(e) => {
          const [sortBy, sortOrder] = e.target.value.split('_');
          onChange({ ...filters, sortBy, sortOrder, page: 1 });
        }}
      >
        <option value="createdAt_desc">Newest First</option>
        <option value="createdAt_asc">Oldest First</option>
        <option value="dueDate_asc">Due Date (Asc)</option>
        <option value="dueDate_desc">Due Date (Desc)</option>
        <option value="priority_desc">Priority (High)</option>
      </select>

      {/* Clear filters */}
      {hasActiveFilters && (
        <button
          onClick={() => onChange({ page: 1, limit: filters.limit })}
          className="text-sm text-red-500 hover:text-red-700 font-medium"
        >
          Clear filters
        </button>
      )}
    </div>
  );
};

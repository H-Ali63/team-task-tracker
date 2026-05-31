import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PencilSquareIcon,
  TrashIcon,
  UserCircleIcon,
  CalendarDaysIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { taskService } from '../services/taskService';
import { useAuthStore } from '../store/authStore';
import { StatusBadge, PriorityBadge } from '../components/common/Badge';
import { TaskFormModal } from '../components/task/TaskFormModal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Spinner } from '../components/common/Spinner';
import {
  STATUS_TRANSITIONS,
  STATUS_LABELS,
  formatDate,
  isOverdue,
  getErrorMessage,
} from '../utils/constants';

const InfoRow = ({ label, children }) => (
  <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
    <span className="text-sm text-slate-500 w-28 flex-shrink-0">{label}</span>
    <div className="flex-1">{children}</div>
  </div>
);

export const TaskDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, canManageTasks } = useAuthStore((s) => ({
    user: s.user,
    canManageTasks: s.canManageTasks(),
  }));

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  const fetchTask = () => {
    setLoading(true);
    taskService
      .get(id)
      .then(setTask)
      .catch(() => toast.error('Task not found'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTask(); }, [id]);

  const handleStatusChange = async (newStatus) => {
    setStatusLoading(true);
    try {
      const updated = await taskService.updateStatus(id, newStatus);
      setTask(updated);
      toast.success(`Status updated to ${STATUS_LABELS[newStatus]}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setStatusLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await taskService.delete(id);
      toast.success('Task deleted');
      navigate('/tasks');
    } catch (err) {
      toast.error(getErrorMessage(err));
      setDeleteLoading(false);
    }
  };

  // Can this user change the status?
  const isAssignee = task?.assignee?._id === user?._id || task?.assignee === user?._id;
  const canChangeStatus = isAssignee || canManageTasks;
  const availableTransitions = task ? STATUS_TRANSITIONS[task.status] : [];

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-32">
        <p className="text-slate-500">Task not found.</p>
        <Link to="/tasks" className="text-primary-600 hover:underline mt-2 block">
          ← Back to tasks
        </Link>
      </div>
    );
  }

  const overdue = isOverdue(task.dueDate, task.status);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back + Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 text-sm transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </button>
        {canManageTasks && (
          <div className="flex items-center gap-2">
            <button onClick={() => setEditOpen(true)} className="btn-secondary gap-2 text-sm">
              <PencilSquareIcon className="h-4 w-4" />
              Edit
            </button>
            <button onClick={() => setDeleteOpen(true)} className="btn-danger gap-2 text-sm">
              <TrashIcon className="h-4 w-4" />
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Main Card */}
      <div className="card p-6 space-y-5">
        {/* Title + badges */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-3">{task.title}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
            {overdue && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                ⚠ Overdue
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        {task.description && (
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Description</h3>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
              {task.description}
            </p>
          </div>
        )}

        {/* Details */}
        <div className="border border-slate-200 rounded-xl px-4">
          <InfoRow label="Assignee">
            <div className="flex items-center gap-2">
              <UserCircleIcon className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-900">
                {task.assignee?.name || 'Unassigned'}
              </span>
              {task.assignee?.email && (
                <span className="text-xs text-slate-500">({task.assignee.email})</span>
              )}
            </div>
          </InfoRow>
          <InfoRow label="Due Date">
            <div className={`flex items-center gap-2 text-sm ${overdue ? 'text-red-600 font-medium' : 'text-slate-900'}`}>
              <CalendarDaysIcon className="h-4 w-4" />
              {formatDate(task.dueDate)}
            </div>
          </InfoRow>
          <InfoRow label="Created by">
            <span className="text-sm text-slate-900">{task.createdBy?.name || '—'}</span>
          </InfoRow>
          <InfoRow label="Created">
            <span className="text-sm text-slate-900">{formatDate(task.createdAt)}</span>
          </InfoRow>
          {task.completedAt && (
            <InfoRow label="Completed">
              <span className="text-sm text-green-700 font-medium">{formatDate(task.completedAt)}</span>
            </InfoRow>
          )}
        </div>

        {/* Status Transition Panel */}
        {canChangeStatus && availableTransitions.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Move to next status</h3>
            <div className="flex flex-wrap gap-2">
              {availableTransitions.map((nextStatus) => (
                <button
                  key={nextStatus}
                  onClick={() => handleStatusChange(nextStatus)}
                  disabled={statusLoading}
                  className="btn-secondary gap-2 text-sm"
                >
                  {statusLoading ? (
                    <Spinner size="sm" />
                  ) : (
                    <>
                      <ArrowRightIcon className="h-4 w-4" />
                      {STATUS_LABELS[nextStatus]}
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {task.status === 'DONE' && (
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg text-green-700 text-sm font-medium">
            ✓ This task is complete
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <TaskFormModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        task={task}
        onSuccess={fetchTask}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Delete Task"
        message={`Delete "${task.title}"? This cannot be undone.`}
      />
    </div>
  );
};

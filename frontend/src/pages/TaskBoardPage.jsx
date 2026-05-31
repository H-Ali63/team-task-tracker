import React, { useState, useEffect, useCallback } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { taskService } from '../services/taskService';
import { useAuthStore } from '../store/authStore';
import { TaskCard } from '../components/task/TaskCard';
import { TaskFilters } from '../components/task/TaskFilters';
import { TaskFormModal } from '../components/task/TaskFormModal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Pagination } from '../components/common/Pagination';
import { Spinner } from '../components/common/Spinner';
import { getErrorMessage } from '../utils/constants';

export const TaskBoardPage = () => {
  const canManageTasks = useAuthStore((s) => s.canManageTasks());

  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ page: 1, limit: 12 });

  // Modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await taskService.list(filters);
      setTasks(data.tasks || []);
      setPagination(data.pagination);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleEdit = (task) => {
    setEditingTask(task);
    setFormOpen(true);
  };

  const handleCreate = () => {
    setEditingTask(null);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingTask(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await taskService.delete(deleteTarget._id);
      toast.success('Task deleted');
      setDeleteTarget(null);
      fetchTasks();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TaskFilters filters={filters} onChange={setFilters} />
        {canManageTasks && (
          <button onClick={handleCreate} className="btn-primary gap-2">
            <PlusIcon className="h-4 w-4" />
            New Task
          </button>
        )}
      </div>

      {/* Task Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-24">
          <Spinner size="lg" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-slate-500 text-lg">No tasks found.</p>
          <p className="text-slate-400 text-sm mt-1">
            {canManageTasks ? 'Create your first task to get started.' : 'No tasks assigned to you yet.'}
          </p>
          {canManageTasks && (
            <button onClick={handleCreate} className="btn-primary mt-4 mx-auto">
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Task
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <TaskCard
              key={task._id}
              task={task}
              onEdit={handleEdit}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && (
        <Pagination
          pagination={pagination}
          onChange={(page) => setFilters((f) => ({ ...f, page }))}
        />
      )}

      {/* Create / Edit Modal */}
      <TaskFormModal
        isOpen={formOpen}
        onClose={handleCloseForm}
        task={editingTask}
        onSuccess={fetchTasks}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Delete Task"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
      />
    </div>
  );
};

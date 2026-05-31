import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardDocumentListIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { taskService } from '../services/taskService';
import { useAuthStore } from '../store/authStore';
import { StatusBadge, PriorityBadge } from '../components/common/Badge';
import { Spinner } from '../components/common/Spinner';
import { formatDate, isOverdue } from '../utils/constants';

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="card p-5 flex items-center gap-4">
    <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${color}`}>
      <Icon className="h-6 w-6 text-white" />
    </div>
    <div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  </div>
);

export const DashboardPage = () => {
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    taskService
      .list({ limit: 50 })
      .then((data) => setTasks(data.tasks || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    total: tasks.length,
    inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
    done: tasks.filter((t) => t.status === 'DONE').length,
    overdue: tasks.filter((t) => isOverdue(t.dueDate, t.status)).length,
  };

  const recentTasks = tasks.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          Good day, {user?.name?.split(' ')[0]} 
        </h2>
        <p className="text-slate-500 mt-1">Here's what's happening in your workspace.</p>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="flex justify-center py-8"><Spinner size="lg" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={ClipboardDocumentListIcon} label="Total Tasks" value={stats.total} color="bg-slate-700" />
          <StatCard icon={ClockIcon} label="In Progress" value={stats.inProgress} color="bg-blue-500" />
          <StatCard icon={CheckCircleIcon} label="Completed" value={stats.done} color="bg-green-500" />
          <StatCard icon={ExclamationCircleIcon} label="Overdue" value={stats.overdue} color="bg-red-500" />
        </div>
      )}

      {/* Recent Tasks */}
      <div className="card">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Recent Tasks</h3>
          <Link to="/tasks" className="text-sm text-primary-600 hover:underline">
            View all →
          </Link>
        </div>
        {loading ? (
          <div className="p-8 flex justify-center"><Spinner /></div>
        ) : recentTasks.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No tasks yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentTasks.map((task) => (
              <div key={task._id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <Link to={`/tasks/${task._id}`} className="text-sm font-medium text-slate-900 hover:text-primary-600 truncate block">
                    {task.title}
                  </Link>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {task.assignee ? `Assigned to ${task.assignee.name}` : 'Unassigned'} • Due {formatDate(task.dueDate)}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <PriorityBadge priority={task.priority} />
                  <StatusBadge status={task.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

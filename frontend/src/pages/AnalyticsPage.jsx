import React, { useState, useEffect } from 'react';
import {
  ExclamationCircleIcon,
  ClockIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { taskService } from '../services/taskService';
import { Spinner } from '../components/common/Spinner';
import { getErrorMessage } from '../utils/constants';

const MetricCard = ({ icon: Icon, label, value, subtext, color }) => (
  <div className="card p-6">
    <div className="flex items-center gap-4">
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className="text-3xl font-bold text-slate-900">{value}</p>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {subtext && <p className="text-xs text-slate-500 mt-0.5">{subtext}</p>}
      </div>
    </div>
  </div>
);

export const AnalyticsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    taskService
      .getAnalytics()
      .then(setData)
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  const totalOverdue = data?.overdueByUser?.reduce((sum, u) => sum + u.overdueCount, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Task Analytics</h2>
        <p className="text-sm text-slate-500">Organization-wide task performance metrics</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          icon={ExclamationCircleIcon}
          label="Total Overdue Tasks"
          value={totalOverdue}
          subtext="Active tasks past due date"
          color="bg-red-500"
        />
        <MetricCard
          icon={CheckCircleIcon}
          label="Tasks Completed"
          value={data?.totalCompleted ?? 0}
          subtext="Total DONE tasks"
          color="bg-green-500"
        />
        <MetricCard
          icon={ClockIcon}
          label="Avg Completion Time"
          value={data?.avgCompletionHours != null ? `${data.avgCompletionHours}h` : '—'}
          subtext="Average hours from creation to DONE"
          color="bg-blue-500"
        />
      </div>

      {/* Overdue by User */}
      <div className="card">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Overdue Tasks by Assignee</h3>
          <p className="text-sm text-slate-500">Active tasks that have passed their due date</p>
        </div>
        {!data?.overdueByUser?.length ? (
          <div className="p-8 text-center">
            <p className="text-green-600 font-medium">🎉 No overdue tasks!</p>
            <p className="text-sm text-slate-500 mt-1">All tasks are on schedule.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.overdueByUser.map((row) => (
              <div key={row.assigneeId} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center">
                    <span className="text-slate-700 font-semibold text-sm">
                      {(row.name || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{row.name || 'Unknown'}</p>
                    <p className="text-xs text-slate-500">{row.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-red-600">{row.overdueCount}</span>
                  <span className="text-sm text-slate-500">overdue</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

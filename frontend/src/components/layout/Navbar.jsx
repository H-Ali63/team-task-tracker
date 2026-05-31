import React from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../store/authStore';

export const Navbar = ({ title }) => {
  const { user } = useAuthStore();

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
      <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors">
          <BellIcon className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center">
            <span className="text-white text-sm font-semibold">
              {user?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-sm font-medium text-slate-700 hidden sm:block">
            {user?.name}
          </span>
        </div>
      </div>
    </header>
  );
};

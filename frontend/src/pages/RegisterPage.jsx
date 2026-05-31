import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { authService } from '../services/authService';
import { useAuthStore } from '../store/authStore';
import { getErrorMessage } from '../utils/constants';
import { Spinner } from '../components/common/Spinner';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [mode, setMode] = useState('create'); // 'create' or 'join'
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    organizationName: '',
    organizationId: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        ...(mode === 'create'
          ? { organizationName: form.organizationName }
          : { organizationId: form.organizationId }),
      };
      const data = await authService.register(payload);
      setAuth(data.user, data.accessToken, data.refreshToken);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary-600 mb-4">
            <ClipboardDocumentListIcon className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Create Account</h1>
          <p className="text-slate-400 mt-1">Join or create your workspace</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Mode toggle */}
          <div className="flex rounded-lg border border-slate-200 p-1 mb-6">
            {['create', 'join'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                  mode === m
                    ? 'bg-primary-600 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {m === 'create' ? 'New Organization' : 'Join Existing'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input className="input" type="text" placeholder="Alice Johnson" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" placeholder="Min. 6 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
            </div>

            {mode === 'create' ? (
              <div>
                <label className="label">Organization Name</label>
                <input className="input" type="text" placeholder="Acme Corp" value={form.organizationName} onChange={(e) => setForm({ ...form, organizationName: e.target.value })} required />
                <p className="text-xs text-slate-500 mt-1">You'll be assigned as ADMIN</p>
              </div>
            ) : (
              <div>
                <label className="label">Organization ID</label>
                <input className="input" type="text" placeholder="Paste organization ID" value={form.organizationId} onChange={(e) => setForm({ ...form, organizationId: e.target.value })} required />
                <p className="text-xs text-slate-500 mt-1">You'll join as MEMBER</p>
              </div>
            )}

            <button type="submit" className="btn-primary w-full py-2.5 mt-2" disabled={loading}>
              {loading ? <Spinner size="sm" /> : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

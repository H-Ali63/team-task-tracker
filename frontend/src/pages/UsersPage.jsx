import React, { useState, useEffect, useCallback } from 'react';
import {
  BuildingOffice2Icon,
  ClipboardDocumentIcon,
  ShieldCheckIcon,
  NoSymbolIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { userService } from '../services/userService';
import { useAuthStore } from '../store/authStore';
import { RoleBadge } from '../components/common/Badge';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Modal } from '../components/common/Modal';
import { Spinner } from '../components/common/Spinner';
import { formatDate, getErrorMessage, ROLES } from '../utils/constants';

const ROLE_OPTIONS = Object.values(ROLES);

const getOrganizationId = (organizationId) => {
  if (!organizationId) return '';
  if (typeof organizationId === 'string') return organizationId;
  return organizationId._id || organizationId.id || '';
};

export const UsersPage = () => {
  const { user: currentUser, updateUser } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleTarget, setRoleTarget] = useState(null); // { user, newRole }
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const organizationId = getOrganizationId(currentUser?.organizationId);
  const isAdmin = currentUser?.role === ROLES.ADMIN;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await userService.list();
      setUsers(data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    if (!isAdmin || organizationId) return;

    userService
      .getProfile()
      .then((profile) => updateUser(profile))
      .catch(() => {});
  }, [isAdmin, organizationId, updateUser]);

  const handleCopyOrganizationId = async () => {
    if (!organizationId) return;

    try {
      await navigator.clipboard.writeText(organizationId);
      toast.success('Organization ID copied');
    } catch {
      toast.error('Unable to copy organization ID');
    }
  };

  const openRoleModal = (user) => {
    setRoleTarget(user);
    setSelectedRole(user.role);
    setRoleModalOpen(true);
  };

  const handleRoleChange = async () => {
    if (!roleTarget || selectedRole === roleTarget.role) {
      setRoleModalOpen(false);
      return;
    }
    setActionLoading(true);
    try {
      await userService.updateRole(roleTarget._id, selectedRole);
      toast.success(`${roleTarget.name}'s role updated to ${selectedRole}`);
      setRoleModalOpen(false);
      setRoleTarget(null);
      fetchUsers();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    setActionLoading(true);
    try {
      await userService.deactivate(deactivateTarget._id);
      toast.success(`${deactivateTarget.name} has been deactivated`);
      setDeactivateTarget(null);
      fetchUsers();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Team Members</h2>
          <p className="text-sm text-slate-500">
            {users.length} member{users.length !== 1 ? 's' : ''} in your organization
          </p>
        </div>
      </div>

      {isAdmin && (
        <div className="card p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                <BuildingOffice2Icon className="h-5 w-5 text-primary-700" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-900">Admin Profile</h3>
                <p className="text-sm text-slate-500">Invite teammates with this organization ID.</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs font-medium text-slate-500">Organization ID</p>
                <p className="font-mono text-sm text-slate-900 break-all">
                  {organizationId || 'Unavailable'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopyOrganizationId}
                disabled={!organizationId}
                className="btn-secondary gap-2 whitespace-nowrap"
              >
                <ClipboardDocumentIcon className="h-4 w-4" />
                Copy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">Member</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">Role</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">Status</th>
                  <th className="text-left px-5 py-3 font-semibold text-slate-700">Joined</th>
                  <th className="text-right px-5 py-3 font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isSelf = u._id === currentUser?._id;
                  return (
                    <tr key={u._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-primary-700 font-semibold text-sm">
                              {u.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {u.name}
                              {isSelf && (
                                <span className="ml-2 text-xs text-slate-400">(you)</span>
                              )}
                            </p>
                            <p className="text-xs text-slate-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                            u.isActive ? 'text-green-600' : 'text-slate-400'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              u.isActive ? 'bg-green-500' : 'bg-slate-300'
                            }`}
                          />
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-500">{formatDate(u.createdAt)}</td>
                      <td className="px-5 py-4">
                        {!isSelf && u.isActive && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openRoleModal(u)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                              title="Change role"
                            >
                              <ShieldCheckIcon className="h-3.5 w-3.5" />
                              Change Role
                            </button>
                            <button
                              onClick={() => setDeactivateTarget(u)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Deactivate user"
                            >
                              <NoSymbolIcon className="h-3.5 w-3.5" />
                              Deactivate
                            </button>
                          </div>
                        )}
                        {isSelf && (
                          <span className="text-xs text-slate-400 text-right block pr-2">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Role Change Modal */}
      <Modal
        isOpen={roleModalOpen}
        onClose={() => { setRoleModalOpen(false); setRoleTarget(null); }}
        title="Change Role"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Changing role for <span className="font-semibold">{roleTarget?.name}</span>
          </p>
          <div>
            <label className="label">New Role</label>
            <select
              className="input"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setRoleModalOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleRoleChange} disabled={actionLoading}>
              {actionLoading ? <Spinner size="sm" /> : 'Update Role'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Deactivate Confirm */}
      <ConfirmDialog
        isOpen={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleDeactivate}
        loading={actionLoading}
        title="Deactivate User"
        message={`Deactivate "${deactivateTarget?.name}"? They will no longer be able to log in.`}
      />
    </div>
  );
};

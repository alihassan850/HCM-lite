import React, { useState, useEffect } from 'react';
import { Users, Plus, KeyRound, UserCheck, UserX, Shield } from 'lucide-react';
import { usersApi } from '../../api/users.api';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import { formatDate } from '../../utils/formatDate';

export default function Logins() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [resetModal, setResetModal] = useState(false);
  const [targetUser, setTargetUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [createForm, setCreateForm] = useState({ email: '', password: '' });
  const [tempPass, setTempPass] = useState('Saylani@123');

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      setLoading(true);
      const res = await usersApi.listUsers();
      setUsers(res.data.users || []);
    } catch (err) {
      setError('Failed to fetch user accounts.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateHr(e) {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      await usersApi.createHrUser(createForm);
      setCreateModal(false);
      setCreateForm({ email: '', password: '' });
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create HR account.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleStatus(user) {
    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    if (!window.confirm(`Are you sure you want to change this user status to ${nextStatus}?`)) return;

    try {
      await usersApi.toggleStatus(user.id, nextStatus);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Action failed.');
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      await usersApi.resetPassword(targetUser.id, tempPass);
      setResetModal(false);
      setTargetUser(null);
      alert(`Password reset for ${targetUser.email}. User must change it on next login.`);
      loadUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Password reset failed.');
    } finally {
      setSubmitting(false);
    }
  }

  const columns = [
    {
      header: 'User Account',
      key: 'email',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs uppercase">
            {row.email.charAt(0)}
          </div>
          <div>
            <span className="font-bold text-slate-900 block">{row.email}</span>
            <span className="text-xs text-slate-400">
              {row.first_name ? `${row.first_name} ${row.last_name} (${row.employee_code})` : 'Unlinked system login'}
            </span>
          </div>
        </div>
      )
    },
    {
      header: 'Role Level',
      key: 'role',
      render: (row) => (
        <Badge variant={row.role === 'admin' ? 'purple' : row.role === 'hr' ? 'teal' : 'info'}>
          {row.role.toUpperCase()}
        </Badge>
      )
    },
    {
      header: 'Account Status',
      key: 'status',
      render: (row) => (
        <Badge variant={row.status === 'active' ? 'success' : 'danger'}>
          {row.status.toUpperCase()}
        </Badge>
      )
    },
    {
      header: 'First-Login Flag',
      key: 'must_change_password',
      render: (row) => (
        row.must_change_password ? (
          <span className="text-amber-600 font-semibold text-xs">Password Change Pending</span>
        ) : (
          <span className="text-slate-400 text-xs">Standard</span>
        )
      )
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={KeyRound}
            onClick={() => {
              setTargetUser(row);
              setError(null);
              setResetModal(true);
            }}
            title="Reset Password"
          >
            Reset
          </Button>

          {row.role !== 'admin' && (
            <Button
              variant={row.status === 'active' ? 'danger' : 'secondary'}
              size="sm"
              icon={row.status === 'active' ? UserX : UserCheck}
              onClick={() => handleToggleStatus(row)}
            >
              {row.status === 'active' ? 'Deactivate' : 'Activate'}
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">User Account Governance</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Create HR administrative credentials, toggle access rights, and reset employee temporary keys
          </p>
        </div>

        <Button
          variant="primary"
          icon={Plus}
          onClick={() => {
            setError(null);
            setCreateModal(true);
          }}
        >
          Create HR Login
        </Button>
      </div>

      <Table
        columns={columns}
        data={users}
        isLoading={loading}
      />

      {/* Create HR Modal */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Provision HR Operator Login">
        <form onSubmit={handleCreateHr} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium rounded-xl">
              {error}
            </div>
          )}

          <Input
            label="Corporate Email"
            type="email"
            value={createForm.email}
            onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
            placeholder="hr.officer@company.com"
            required
          />

          <Input
            label="Temporary Initial Password"
            type="password"
            value={createForm.password}
            onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
            placeholder="Minimum 6 characters"
            helperText="The user will be required to change this upon first sign-in."
            required
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Provision HR Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      {targetUser && (
        <Modal
          isOpen={resetModal}
          onClose={() => {
            setResetModal(false);
            setTargetUser(null);
          }}
          title={`Reset Password: ${targetUser.email}`}
        >
          <form onSubmit={handleResetPassword} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium rounded-xl">
                {error}
              </div>
            )}

            <Input
              label="New Temporary Password"
              value={tempPass}
              onChange={(e) => setTempPass(e.target.value)}
              placeholder="e.g. Temp@2026"
              helperText="The user's must_change_password flag will be set to 1."
              required
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setResetModal(false);
                  setTargetUser(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="danger" loading={submitting}>
                Apply Password Reset
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

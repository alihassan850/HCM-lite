import React, { useState, useEffect } from 'react';
import { Building2, Plus, Trash2, Users } from 'lucide-react';
import { setupApi } from '../../api/setup.api';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import { formatDate } from '../../utils/formatDate';

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({ name: '', description: '' });

  useEffect(() => {
    loadDepartments();
  }, []);

  async function loadDepartments() {
    try {
      setLoading(true);
      const res = await setupApi.getDepartments();
      setDepartments(res.data.departments || []);
    } catch (err) {
      setError('Failed to fetch departments.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      await setupApi.createDepartment(form);
      setModalOpen(false);
      setForm({ name: '', description: '' });
      loadDepartments();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create department.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this department?')) return;
    try {
      await setupApi.deleteDepartment(id);
      loadDepartments();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete department.');
    }
  }

  const columns = [
    {
      header: 'Department Name',
      key: 'name',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-slate-900 block">{row.name}</span>
            <span className="text-xs text-slate-400">{row.description || 'No description'}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Active Staff',
      key: 'employee_count',
      render: (row) => (
        <Badge variant={row.employee_count > 0 ? 'teal' : 'default'}>
          <Users className="w-3 h-3 mr-1 inline" />
          {row.employee_count || 0} employees
        </Badge>
      )
    },
    {
      header: 'Created On',
      key: 'created_at',
      render: (row) => formatDate(row.created_at)
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (row) => (
        <button
          onClick={() => handleDelete(row.id)}
          className="text-slate-400 hover:text-rose-600 transition-colors p-1"
          title="Delete Department"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Department Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Organize company business units, divisions, and operational cost centers
          </p>
        </div>

        <Button
          variant="primary"
          icon={Plus}
          onClick={() => {
            setError(null);
            setModalOpen(true);
          }}
        >
          Add Department
        </Button>
      </div>

      <Table
        columns={columns}
        data={departments}
        isLoading={loading}
        emptyMessage="No departments configured yet. Click 'Add Department' to create one."
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create New Department">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium rounded-xl">
              {error}
            </div>
          )}

          <Input
            label="Department Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Engineering, Human Resources, Finance"
            required
          />

          <Input
            label="Description (Optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Brief scope of this department"
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Create Department
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

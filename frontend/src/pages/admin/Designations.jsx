import React, { useState, useEffect } from 'react';
import { Briefcase, Plus, Trash2 } from 'lucide-react';
import { setupApi } from '../../api/setup.api';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import { formatDate } from '../../utils/formatDate';

export default function Designations() {
  const [designations, setDesignations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({ title: '', department_id: '' });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [desRes, deptRes] = await Promise.all([
        setupApi.getDesignations(),
        setupApi.getDepartments()
      ]);
      setDesignations(desRes.data.designations || []);
      setDepartments(deptRes.data.departments || []);
    } catch (err) {
      setError('Failed to fetch designations.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      await setupApi.createDesignation(form);
      setModalOpen(false);
      setForm({ title: '', department_id: '' });
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create designation.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this job designation?')) return;
    try {
      await setupApi.deleteDesignation(id);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete designation.');
    }
  }

  const columns = [
    {
      header: 'Designation Title',
      key: 'title',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center font-bold text-xs">
            <Briefcase className="w-4 h-4" />
          </div>
          <span className="font-bold text-slate-900">{row.title}</span>
        </div>
      )
    },
    {
      header: 'Assigned Department',
      key: 'department_name',
      render: (row) => (
        <Badge variant="info">
          {row.department_name || 'General / All'}
        </Badge>
      )
    },
    {
      header: 'Staff Count',
      key: 'employee_count',
      render: (row) => `${row.employee_count || 0} employees`
    },
    {
      header: 'Added On',
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
          title="Delete Designation"
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
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Designations & Roles</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure hierarchical corporate titles, job ranks, and department alignments
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
          Add Designation
        </Button>
      </div>

      <Table
        columns={columns}
        data={designations}
        isLoading={loading}
        emptyMessage="No designations configured yet."
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create Job Designation">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium rounded-xl">
              {error}
            </div>
          )}

          <Input
            label="Designation Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Senior Software Engineer, HR Officer, Accountant"
            required
          />

          <Select
            label="Department"
            value={form.department_id}
            onChange={(e) => setForm({ ...form, department_id: e.target.value })}
            options={departments.map(d => ({ value: d.id, label: d.name }))}
            placeholder="Select department (optional)"
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Save Designation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

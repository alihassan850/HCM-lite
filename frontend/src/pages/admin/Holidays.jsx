import React, { useState, useEffect } from 'react';
import { CalendarCheck, Plus, Trash2 } from 'lucide-react';
import { setupApi } from '../../api/setup.api';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { formatDate } from '../../utils/formatDate';

export default function Holidays() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({ name: '', holiday_date: '' });

  useEffect(() => {
    loadHolidays();
  }, []);

  async function loadHolidays() {
    try {
      setLoading(true);
      const res = await setupApi.getHolidays();
      setHolidays(res.data.holidays || []);
    } catch (err) {
      setError('Failed to fetch holidays.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      await setupApi.createHoliday(form);
      setModalOpen(false);
      setForm({ name: '', holiday_date: '' });
      loadHolidays();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add public holiday.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this public holiday entry?')) return;
    try {
      await setupApi.deleteHoliday(id);
      loadHolidays();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete holiday.');
    }
  }

  const columns = [
    {
      header: 'Holiday Observance',
      key: 'name',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
            <CalendarCheck className="w-4 h-4" />
          </div>
          <span className="font-bold text-slate-900">{row.name}</span>
        </div>
      )
    },
    {
      header: 'Calendar Date',
      key: 'holiday_date',
      render: (row) => (
        <span className="font-mono font-semibold text-slate-700">
          {formatDate(row.holiday_date)} ({row.holiday_date})
        </span>
      )
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (row) => (
        <button
          onClick={() => handleDelete(row.id)}
          className="text-slate-400 hover:text-rose-600 transition-colors p-1"
          title="Delete Holiday"
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
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Public Holidays Calendar</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Designated company-wide official non-working days (excluded from employee leave balances)
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
          Add Holiday
        </Button>
      </div>

      <Table
        columns={columns}
        data={holidays}
        isLoading={loading}
        emptyMessage="No public holidays scheduled yet. Click 'Add Holiday' to create one."
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Public Holiday">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium rounded-xl">
              {error}
            </div>
          )}

          <Input
            label="Holiday Title"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Eid-ul-Fitr, Independence Day, Quaid-e-Azam Day"
            required
          />

          <Input
            label="Calendar Date (YYYY-MM-DD)"
            type="date"
            value={form.holiday_date}
            onChange={(e) => setForm({ ...form, holiday_date: e.target.value })}
            required
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Add to Calendar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

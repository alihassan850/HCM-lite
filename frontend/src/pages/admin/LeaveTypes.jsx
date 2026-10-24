import React, { useState, useEffect } from 'react';
import { CalendarDays, Edit2, CheckCircle2 } from 'lucide-react';
import { setupApi } from '../../api/setup.api';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';

export default function LeaveTypes() {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [quota, setQuota] = useState('');
  const [isPaid, setIsPaid] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadLeaveTypes();
  }, []);

  async function loadLeaveTypes() {
    try {
      setLoading(true);
      const res = await setupApi.getLeaveTypes();
      setLeaveTypes(res.data.leave_types || []);
    } catch (err) {
      setError('Failed to fetch leave types.');
    } finally {
      setLoading(false);
    }
  }

  function handleOpenEdit(lt) {
    setSelected(lt);
    setQuota(String(lt.yearly_quota));
    setIsPaid(lt.is_paid);
    setError(null);
  }

  async function handleSave(e) {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      await setupApi.updateLeaveType(selected.id, {
        yearly_quota: Number(quota),
        is_paid: Number(isPaid)
      });
      setSelected(null);
      loadLeaveTypes();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update leave type quota.');
    } finally {
      setSubmitting(false);
    }
  }

  const columns = [
    {
      header: 'Leave Policy Name',
      key: 'name',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs">
            <CalendarDays className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-slate-900 block">{row.name}</span>
            <span className="text-xs text-slate-400 font-mono uppercase">Code: {row.code}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Annual Allocation Quota',
      key: 'yearly_quota',
      render: (row) => (
        <span className="font-extrabold text-slate-800">
          {row.code === 'unpaid' ? 'Unlimited' : `${row.yearly_quota} Days / Year`}
        </span>
      )
    },
    {
      header: 'Remuneration Type',
      key: 'is_paid',
      render: (row) => (
        <Badge variant={row.is_paid ? 'success' : 'warning'}>
          {row.is_paid ? 'Paid Leave' : 'Unpaid (Salary Deducted)'}
        </Badge>
      )
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (row) => (
        <Button
          variant="secondary"
          size="sm"
          icon={Edit2}
          onClick={() => handleOpenEdit(row)}
        >
          Adjust Quota
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Leave Policy & Quotas</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Standard organizational leave allocations applied across payroll & attendance calculations
        </p>
      </div>

      <Table
        columns={columns}
        data={leaveTypes}
        isLoading={loading}
      />

      {/* Edit Quota Modal */}
      {selected && (
        <Modal
          isOpen={!!selected}
          onClose={() => setSelected(null)}
          title={`Update Quota: ${selected.name}`}
        >
          <form onSubmit={handleSave} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium rounded-xl">
                {error}
              </div>
            )}

            <Input
              label="Yearly Allowance (Days)"
              type="number"
              value={quota}
              onChange={(e) => setQuota(e.target.value)}
              disabled={selected.code === 'unpaid'}
              helperText={selected.code === 'unpaid' ? 'Unpaid leave quota is unlimited by default.' : 'Standard Saylani brief: Annual=14, Sick=8, Casual=10'}
              required
            />

            <div className="pt-1">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Compensation Type
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input
                    type="radio"
                    name="isPaid"
                    checked={isPaid === 1}
                    onChange={() => setIsPaid(1)}
                    className="text-teal-600 focus:ring-teal-500"
                  />
                  <span>Paid Leave</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input
                    type="radio"
                    name="isPaid"
                    checked={isPaid === 0}
                    onChange={() => setIsPaid(0)}
                    className="text-teal-600 focus:ring-teal-500"
                  />
                  <span>Unpaid Leave</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3">
              <Button variant="secondary" onClick={() => setSelected(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={submitting}>
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

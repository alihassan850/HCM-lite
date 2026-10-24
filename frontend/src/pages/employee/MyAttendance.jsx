import React, { useState, useEffect } from 'react';
import { CalendarCheck, Clock, Plus, AlertCircle, Camera, Globe } from 'lucide-react';
import { attendanceApi } from '../../api/attendance.api';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import { formatDate, formatTime } from '../../utils/formatDate';

export default function MyAttendance() {
  const currentMonth = new Date().toISOString().substring(0, 7);
  const [month, setMonth] = useState(currentMonth);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [correctionModal, setCorrectionModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    proposed_check_in: '09:00',
    proposed_check_out: '18:00',
    reason: ''
  });

  useEffect(() => {
    loadAttendance();
  }, [month]);

  async function loadAttendance() {
    try {
      setLoading(true);
      const res = await attendanceApi.getMyCalendar({ month });
      setRecords(res.data.records || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestCorrection(e) {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      const res = await attendanceApi.requestCorrection(form);
      setSuccess(res.data.message);
      setCorrectionModal(false);
      setForm({
        date: new Date().toISOString().split('T')[0],
        proposed_check_in: '09:00',
        proposed_check_out: '18:00',
        reason: ''
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit correction.');
    } finally {
      setSubmitting(false);
    }
  }

  const columns = [
    {
      header: 'Attendance Date',
      key: 'attendance_date',
      render: (r) => (
        <span className="font-semibold text-slate-800 text-xs">
          {formatDate(r.attendance_date)}
        </span>
      )
    },
    {
      header: 'Check In',
      key: 'check_in',
      render: (r) => (
        r.check_in ? (
          <span className="font-mono text-xs text-slate-800">
            {formatTime(r.check_in)}
          </span>
        ) : '—'
      )
    },
    {
      header: 'Check Out',
      key: 'check_out',
      render: (r) => (
        r.check_out ? (
          <span className="font-mono text-xs text-slate-800">
            {formatTime(r.check_out)}
          </span>
        ) : '—'
      )
    },
    {
      header: 'Logged Hours',
      key: 'total_hours',
      render: (r) => (r.total_hours > 0 ? `${r.total_hours} hrs` : '—')
    },
    {
      header: 'Punch Source',
      key: 'source',
      render: (r) => (
        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-medium">
          {r.source === 'camera' ? <Camera className="w-3.5 h-3.5 text-teal-600" /> : <Globe className="w-3.5 h-3.5 text-slate-400" />}
          {r.source ? r.source.toUpperCase() : 'WEB'}
        </span>
      )
    },
    {
      header: 'Status',
      key: 'status',
      render: (r) => {
        const variants = {
          present: 'success',
          late: 'warning',
          half_day: 'danger',
          on_leave: 'info',
          absent: 'danger'
        };
        return (
          <Badge variant={variants[r.status] || 'default'}>
            {r.status?.toUpperCase() || 'UNKNOWN'}
          </Badge>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">My Attendance Calendar</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Personal check-in records, working duration logs, and correction requests
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-44"
          />
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => {
              setError(null);
              setCorrectionModal(true);
            }}
          >
            Request Correction
          </Button>
        </div>
      </div>

      {success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium rounded-xl">
          {success}
        </div>
      )}

      <Table
        columns={columns}
        data={records}
        isLoading={loading}
        emptyMessage={`No attendance entries found for ${month}.`}
      />

      {/* Request Correction Modal */}
      <Modal
        isOpen={correctionModal}
        onClose={() => setCorrectionModal(false)}
        title="Request Attendance Correction"
      >
        <form onSubmit={handleRequestCorrection} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium rounded-xl">
              {error}
            </div>
          )}

          <Input
            label="Shift Date (YYYY-MM-DD)"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Proposed Check In"
              type="time"
              value={form.proposed_check_in}
              onChange={(e) => setForm({ ...form, proposed_check_in: e.target.value })}
              required
            />
            <Input
              label="Proposed Check Out"
              type="time"
              value={form.proposed_check_out}
              onChange={(e) => setForm({ ...form, proposed_check_out: e.target.value })}
              required
            />
          </div>

          <Input
            label="Reason / Explanation for HR"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            placeholder="e.g. Card scanner malfunction, on-field client meeting"
            required
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setCorrectionModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Submit Request to HR
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

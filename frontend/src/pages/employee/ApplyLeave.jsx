import React, { useState, useEffect } from 'react';
import { CalendarDays, Sparkles, Send, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { leaveApi } from '../../api/leave.api';
import { aiApi } from '../../api/ai.api';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import AiBadge from '../../components/ai/AiBadge';
import { formatDate } from '../../utils/formatDate';

export default function ApplyLeave() {
  const [balances, setBalances] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Smart Leave state
  const [smartPrompt, setSmartPrompt] = useState('');
  const [smartLoading, setSmartLoading] = useState(false);
  const [smartSuccess, setSmartSuccess] = useState(false);

  // Standard Form state
  const [form, setForm] = useState({
    leave_type_id: '',
    start_date: '',
    end_date: '',
    reason: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [balRes, reqRes] = await Promise.all([
        leaveApi.getBalances(),
        leaveApi.listRequests()
      ]);
      setBalances(balRes.data.balances || []);
      setMyRequests(reqRes.data.requests || []);
      if (balRes.data.balances?.length > 0 && !form.leave_type_id) {
        setForm(f => ({ ...f, leave_type_id: balRes.data.balances[0].leave_type_id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Handle Smart Leave Natural Language parsing
  async function handleSmartLeave(e) {
    e.preventDefault();
    if (!smartPrompt.trim()) return;

    try {
      setSmartLoading(true);
      setError(null);
      const res = await aiApi.smartLeave(smartPrompt);
      const p = res.data.prefilled;
      setForm({
        leave_type_id: p.leave_type_id,
        start_date: p.start_date,
        end_date: p.end_date,
        reason: p.reason
      });
      setSmartSuccess(true);
    } catch (err) {
      setError('AI could not parse your sentence. Please fill out the form manually.');
    } finally {
      setSmartLoading(false);
    }
  }

  async function handleSubmitLeave(e) {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);
      const res = await leaveApi.applyLeave(form);
      setSuccess(res.data.message);
      setForm({
        leave_type_id: balances[0]?.leave_type_id || '',
        start_date: '',
        end_date: '',
        reason: ''
      });
      setSmartPrompt('');
      setSmartSuccess(false);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit leave application.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelRequest(id) {
    if (!window.confirm('Cancel this pending leave application?')) return;
    try {
      await leaveApi.cancelRequest(id);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel leave request.');
    }
  }

  const columns = [
    {
      header: 'Leave Type',
      key: 'leave_type_name',
      render: (r) => (
        <Badge variant={r.leave_type_code === 'sick' ? 'warning' : 'teal'}>
          {r.leave_type_name}
        </Badge>
      )
    },
    {
      header: 'Date Range',
      key: 'dates',
      render: (r) => (
        <div>
          <span className="font-semibold text-slate-800 text-xs block">
            {formatDate(r.start_date)} &rarr; {formatDate(r.end_date)}
          </span>
          <span className="text-[11px] text-slate-400 font-bold">
            {r.days_count} Working Day{r.days_count > 1 ? 's' : ''}
          </span>
        </div>
      )
    },
    {
      header: 'Reason',
      key: 'reason',
      render: (r) => <span className="text-xs text-slate-600 line-clamp-2 max-w-xs">{r.reason}</span>
    },
    {
      header: 'Status',
      key: 'status',
      render: (r) => (
        <Badge
          variant={
            r.status === 'approved'
              ? 'success'
              : r.status === 'rejected' || r.status === 'cancelled'
              ? 'danger'
              : 'warning'
          }
        >
          {r.status.toUpperCase()}
        </Badge>
      )
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (r) => (
        r.status === 'pending' ? (
          <Button
            variant="ghost"
            size="sm"
            icon={XCircle}
            onClick={() => handleCancelRequest(r.id)}
          >
            Cancel
          </Button>
        ) : (
          <span className="text-xs text-slate-400 italic">Closed</span>
        )
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Apply for Leave</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Submit working-day leave applications with automated holiday skipping and balance validation
        </p>
      </div>

      {/* Leave Balances Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {balances.map((b) => (
          <div key={b.code} className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm text-center">
            <span className="text-xs font-bold uppercase text-slate-500 block">{b.name}</span>
            <span className="text-3xl font-black text-slate-900 block mt-1">
              {b.code === 'unpaid' ? '∞' : b.remaining}
            </span>
            <span className="text-xs text-slate-400 mt-0.5 block">
              {b.code === 'unpaid' ? 'Unlimited' : `${b.used} used / ${b.yearly_quota} quota`}
            </span>
          </div>
        ))}
      </div>

      {/* Feature #21: Smart Leave Natural Language Input Card */}
      <Card
        className="border-teal-200 bg-gradient-to-r from-teal-50/50 via-white to-sky-50/30"
        title={
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-600 animate-pulse" />
            <span>Smart Leave Assistant</span>
          </div>
        }
        subtitle="Type your request in plain English or Roman Urdu to automatically pre-fill dates and category"
        action={<AiBadge />}
      >
        <form onSubmit={handleSmartLeave} className="flex flex-col sm:flex-row gap-2">
          <Input
            value={smartPrompt}
            onChange={(e) => setSmartPrompt(e.target.value)}
            placeholder='e.g. "Need next Monday and Tuesday off for my sister wedding" or "kal meri tabiyat theek nahi thi"'
            className="flex-1"
          />
          <Button
            type="submit"
            variant="primary"
            loading={smartLoading}
            icon={Sparkles}
            className="sm:w-auto"
          >
            Smart Parse
          </Button>
        </form>

        {smartSuccess && (
          <div className="mt-3 p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
            <span>Fields pre-filled below! Please review the dates and click <strong>Submit Leave Request</strong>.</span>
          </div>
        )}
      </Card>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium rounded-xl">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Manual Application Form */}
      <Card title="Leave Application Form" subtitle="Confirm leave category, date range, and business justification">
        <form onSubmit={handleSubmitLeave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Leave Category"
              value={form.leave_type_id}
              onChange={(e) => setForm({ ...form, leave_type_id: e.target.value })}
              options={balances.map(b => ({
                value: b.leave_type_id,
                label: `${b.name} (${b.code === 'unpaid' ? 'Unlimited' : `${b.remaining} remaining`})`
              }))}
              required
            />
            <Input
              label="Start Date"
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              required
            />
            <Input
              label="End Date"
              type="date"
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              required
            />
          </div>

          <Input
            label="Reason / Purpose of Absence"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            placeholder="Please provide details for the approving supervisor..."
            required
          />

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={submitting}
              icon={Send}
            >
              Submit Leave Request
            </Button>
          </div>
        </form>
      </Card>

      {/* Requests History */}
      <Card title="My Application History" subtitle="Live approval tracking and status">
        <Table
          columns={columns}
          data={myRequests}
          isLoading={loading}
          emptyMessage="You have not submitted any leave applications yet."
        />
      </Card>
    </div>
  );
}

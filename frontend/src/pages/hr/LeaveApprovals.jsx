import React, { useState, useEffect } from 'react';
import { CalendarDays, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { leaveApi } from '../../api/leave.api';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { formatDate } from '../../utils/formatDate';

export default function LeaveApprovals() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState(null);
  const [actionType, setActionType] = useState('approved');
  const [reviewComment, setReviewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    try {
      setLoading(true);
      const res = await leaveApi.listRequests();
      setRequests(res.data.requests || []);
    } catch (err) {
      setError('Failed to fetch leave requests.');
    } finally {
      setLoading(false);
    }
  }

  function openReviewModal(req, type) {
    setSelectedReq(req);
    setActionType(type);
    setReviewComment('');
    setError(null);
  }

  async function handleReview(e) {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      await leaveApi.reviewRequest(selectedReq.id, {
        status: actionType,
        review_comment: reviewComment
      });
      setSelectedReq(null);
      loadRequests();
    } catch (err) {
      setError(err.response?.data?.error || 'Review submission failed.');
    } finally {
      setSubmitting(false);
    }
  }

  const columns = [
    {
      header: 'Employee Details',
      key: 'name',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 block">{row.first_name} {row.last_name}</span>
          <span className="text-xs text-slate-400 font-mono">{row.employee_code} &bull; {row.department_name || 'N/A'}</span>
        </div>
      )
    },
    {
      header: 'Leave Type',
      key: 'leave_type_name',
      render: (row) => (
        <Badge variant={row.leave_type_code === 'sick' ? 'warning' : row.leave_type_code === 'casual' ? 'teal' : 'purple'}>
          {row.leave_type_name}
        </Badge>
      )
    },
    {
      header: 'Duration & Range',
      key: 'dates',
      render: (row) => (
        <div>
          <span className="font-semibold text-slate-800 text-xs block">
            {formatDate(row.start_date)} &rarr; {formatDate(row.end_date)}
          </span>
          <span className="text-[11px] text-slate-400 font-bold">
            {row.days_count} Working Day{row.days_count > 1 ? 's' : ''}
          </span>
        </div>
      )
    },
    {
      header: 'Reason',
      key: 'reason',
      render: (row) => (
        <span className="text-xs text-slate-600 line-clamp-2 max-w-xs">{row.reason}</span>
      )
    },
    {
      header: 'Status',
      key: 'status',
      render: (row) => (
        <Badge
          variant={
            row.status === 'approved'
              ? 'success'
              : row.status === 'rejected'
              ? 'danger'
              : 'warning'
          }
        >
          {row.status.toUpperCase()}
        </Badge>
      )
    },
    {
      header: 'Decision',
      key: 'actions',
      render: (row) => (
        row.status === 'pending' ? (
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              icon={CheckCircle2}
              onClick={() => openReviewModal(row, 'approved')}
            >
              Approve
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={XCircle}
              onClick={() => openReviewModal(row, 'rejected')}
            >
              Reject
            </Button>
          </div>
        ) : (
          <span className="text-xs text-slate-400 italic">
            Reviewed ({row.reviewer_email?.split('@')[0] || 'HR'})
          </span>
        )
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Leave Approvals Inbox</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Review working-day leave applications, inspect balance balances, and record approval remarks
        </p>
      </div>

      <Table
        columns={columns}
        data={requests}
        isLoading={loading}
        emptyMessage="No pending leave applications awaiting approval."
      />

      {/* Review Modal */}
      {selectedReq && (
        <Modal
          isOpen={!!selectedReq}
          onClose={() => setSelectedReq(null)}
          title={`${actionType === 'approved' ? 'Approve' : 'Reject'} Leave Application`}
        >
          <form onSubmit={handleReview} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium rounded-xl">
                {error}
              </div>
            )}

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1.5">
              <p><strong>Applicant:</strong> {selectedReq.first_name} {selectedReq.last_name} ({selectedReq.employee_code})</p>
              <p><strong>Category:</strong> {selectedReq.leave_type_name}</p>
              <p><strong>Timeline:</strong> {formatDate(selectedReq.start_date)} to {formatDate(selectedReq.end_date)} ({selectedReq.days_count} working days)</p>
              <p><strong>Reason:</strong> {selectedReq.reason}</p>
            </div>

            <Input
              label="Decision Remarks / Comments"
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="e.g. Approved as requested. Coverage confirmed."
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setSelectedReq(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant={actionType === 'approved' ? 'primary' : 'danger'}
                loading={submitting}
              >
                Confirm {actionType === 'approved' ? 'Approval' : 'Rejection'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

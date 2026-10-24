import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, XCircle, MessageSquare } from 'lucide-react';
import { attendanceApi } from '../../api/attendance.api';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { formatDate } from '../../utils/formatDate';

export default function Corrections() {
  const [corrections, setCorrections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState(null);
  const [actionType, setActionType] = useState('approved');
  const [reviewComment, setReviewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCorrections();
  }, []);

  async function loadCorrections() {
    try {
      setLoading(true);
      const res = await attendanceApi.listCorrections();
      setCorrections(res.data.corrections || []);
    } catch (err) {
      setError('Failed to fetch attendance corrections.');
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
      await attendanceApi.reviewCorrection(selectedReq.id, {
        status: actionType,
        review_comment: reviewComment
      });
      setSelectedReq(null);
      loadCorrections();
    } catch (err) {
      setError(err.response?.data?.error || 'Review submission failed.');
    } finally {
      setSubmitting(false);
    }
  }

  const columns = [
    {
      header: 'Employee',
      key: 'name',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 block">{row.first_name} {row.last_name}</span>
          <span className="text-xs text-slate-400 font-mono">{row.employee_code} &bull; {row.department_name || 'N/A'}</span>
        </div>
      )
    },
    {
      header: 'Shift Date',
      key: 'date',
      render: (row) => formatDate(row.date)
    },
    {
      header: 'Requested Punch',
      key: 'punch',
      render: (row) => (
        <span className="font-mono text-xs text-slate-800">
          {row.proposed_check_in} &rarr; {row.proposed_check_out}
        </span>
      )
    },
    {
      header: 'Justification / Reason',
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
      header: 'Actions',
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
            Reviewed by {row.reviewer_email?.split('@')[0] || 'HR'}
          </span>
        )
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Attendance Corrections Queue</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Review employee manual check-in adjustment requests, verify justifications, and approve updates
        </p>
      </div>

      <Table
        columns={columns}
        data={corrections}
        isLoading={loading}
        emptyMessage="No pending attendance correction requests found."
      />

      {/* Review Modal */}
      {selectedReq && (
        <Modal
          isOpen={!!selectedReq}
          onClose={() => setSelectedReq(null)}
          title={`${actionType === 'approved' ? 'Approve' : 'Reject'} Attendance Correction`}
        >
          <form onSubmit={handleReview} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium rounded-xl">
                {error}
              </div>
            )}

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
              <p><strong>Employee:</strong> {selectedReq.first_name} {selectedReq.last_name} ({selectedReq.employee_code})</p>
              <p><strong>Date:</strong> {formatDate(selectedReq.date)}</p>
              <p><strong>Proposed Times:</strong> {selectedReq.proposed_check_in} to {selectedReq.proposed_check_out}</p>
              <p><strong>Reason:</strong> {selectedReq.reason}</p>
            </div>

            <Input
              label="Reviewer Comments (Optional)"
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="e.g. Verified with department lead; approved."
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

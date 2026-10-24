import React, { useState, useEffect } from 'react';
import { ShieldAlert, Search, Eye } from 'lucide-react';
import { commsApi } from '../../api/comms.api';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import { formatDateTime } from '../../utils/formatDate';

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    loadLogs();
  }, [page, actionFilter, entityFilter]);

  async function loadLogs() {
    try {
      setLoading(true);
      const res = await commsApi.getAuditLogs({
        action: actionFilter || undefined,
        entity: entityFilter || undefined,
        page,
        limit: 20
      });
      setLogs(res.data.logs || []);
      setPagination(res.data.pagination || { totalPages: 1, total: 0 });
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  }

  const columns = [
    {
      header: 'Timestamp',
      key: 'created_at',
      render: (row) => (
        <span className="text-xs text-slate-500 font-mono whitespace-nowrap">
          {formatDateTime(row.created_at)}
        </span>
      )
    },
    {
      header: 'Actor',
      key: 'actor_name',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 block">{row.actor_name || 'System'}</span>
          <span className="text-[10px] text-slate-400 capitalize">{row.actor_role}</span>
        </div>
      )
    },
    {
      header: 'Action Executed',
      key: 'action',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200/60">
          {row.action}
        </span>
      )
    },
    {
      header: 'Target Entity',
      key: 'entity',
      render: (row) => (
        <span className="text-xs text-slate-700">
          <strong>{row.entity}</strong> {row.entity_id ? `(#${row.entity_id})` : ''}
        </span>
      )
    },
    {
      header: 'IP Address',
      key: 'ip_address',
      render: (row) => <span className="text-xs font-mono text-slate-400">{row.ip_address || '—'}</span>
    },
    {
      header: 'Data Diff',
      key: 'diff',
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          icon={Eye}
          onClick={() => setSelectedLog(row)}
        >
          View Payload
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">System Audit Trail</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Immutable forensic log of administrative mutations, approvals, and credential modifications
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="w-full sm:w-64">
          <Input
            placeholder="Filter by action (e.g. LOGIN)..."
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="w-full sm:w-64">
          <Input
            placeholder="Filter by entity (e.g. Employee)..."
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <Table
        columns={columns}
        data={logs}
        isLoading={loading}
        emptyMessage="No audit logs matched query."
      />

      <Pagination
        currentPage={page}
        totalPages={pagination.totalPages}
        totalItems={pagination.total}
        pageSize={20}
        onPageChange={(p) => setPage(p)}
      />

      {/* JSON Payload Inspector Modal */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title={`Audit Payload: ${selectedLog.action} (${selectedLog.entity} #${selectedLog.entity_id || ''})`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4 text-xs font-mono">
            {selectedLog.before_json && (
              <div>
                <span className="font-bold text-slate-500 block mb-1">State Before Action:</span>
                <pre className="p-3 bg-slate-900 text-rose-300 rounded-xl overflow-x-auto text-[11px] leading-relaxed">
                  {JSON.stringify(JSON.parse(selectedLog.before_json), null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.after_json && (
              <div>
                <span className="font-bold text-slate-500 block mb-1">State After Action:</span>
                <pre className="p-3 bg-slate-900 text-teal-300 rounded-xl overflow-x-auto text-[11px] leading-relaxed">
                  {JSON.stringify(JSON.parse(selectedLog.after_json), null, 2)}
                </pre>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setSelectedLog(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Lock, CheckCircle2, Download, Eye } from 'lucide-react';
import { payrollApi } from '../../api/payroll.api';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { downloadBlob } from '../../utils/downloadFile';

export default function PayrollFinalize() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState(null);
  const [payslips, setPayslips] = useState([]);
  const [loadingPayslips, setLoadingPayslips] = useState(false);
  const [finalizingId, setFinalizingId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadRuns();
  }, []);

  async function loadRuns() {
    try {
      setLoading(true);
      const res = await payrollApi.listRuns();
      setRuns(res.data.runs || []);
    } catch (err) {
      setError('Failed to fetch payroll runs.');
    } finally {
      setLoading(false);
    }
  }

  async function handleFinalize(runId) {
    if (!window.confirm('Lock and finalize this payroll run? Once finalized, salaries and deductions cannot be edited.')) return;
    try {
      setFinalizingId(runId);
      await payrollApi.finalizeRun(runId);
      loadRuns();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to finalize payroll run.');
    } finally {
      setFinalizingId(null);
    }
  }

  async function handleViewPayslips(run) {
    setSelectedRun(run);
    try {
      setLoadingPayslips(true);
      const res = await payrollApi.getRunPayslips(run.id);
      setPayslips(res.data.payslips || []);
    } catch (err) {
      alert('Failed to load payslips.');
    } finally {
      setLoadingPayslips(false);
    }
  }

  async function handleDownloadPdf(payslipId, empCode, period) {
    try {
      const res = await payrollApi.downloadPayslipPdf(payslipId);
      downloadBlob(res.data, `Payslip_${empCode}_${period}.pdf`);
    } catch (err) {
      alert('Failed to download PDF.');
    }
  }

  const columns = [
    {
      header: 'Payroll Cycle',
      key: 'year_month',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-slate-900 block">{row.year_month}</span>
            <span className="text-xs text-slate-400">{row.working_days} working days</span>
          </div>
        </div>
      )
    },
    {
      header: 'Total Gross',
      key: 'total_gross',
      render: (row) => formatCurrency(row.total_gross)
    },
    {
      header: 'Total Deductions',
      key: 'total_deductions',
      render: (row) => (
        <span className="text-rose-600 font-semibold">{formatCurrency(row.total_deductions)}</span>
      )
    },
    {
      header: 'Income Tax',
      key: 'total_tax',
      render: (row) => formatCurrency(row.total_tax)
    },
    {
      header: 'Total Net Outlay',
      key: 'total_net',
      render: (row) => (
        <span className="font-extrabold text-slate-900">{formatCurrency(row.total_net)}</span>
      )
    },
    {
      header: 'Status',
      key: 'status',
      render: (row) => (
        <Badge variant={row.status === 'finalized' ? 'success' : 'warning'}>
          {row.status === 'finalized' ? 'FINALIZED & LOCKED' : 'DRAFT (PENDING REVIEW)'}
        </Badge>
      )
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={Eye}
            onClick={() => handleViewPayslips(row)}
          >
            Review Payslips
          </Button>

          {row.status === 'draft' && (
            <Button
              variant="primary"
              size="sm"
              icon={Lock}
              loading={finalizingId === row.id}
              onClick={() => handleFinalize(row.id)}
            >
              Lock & Finalize
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Payroll Finalization & Governance</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Only Super Administrators can finalize, seal, and broadcast monthly compensation disbursement records
        </p>
      </div>

      <Table
        columns={columns}
        data={runs}
        isLoading={loading}
        emptyMessage="No payroll runs initiated by HR yet."
      />

      {/* Review Payslips Modal */}
      {selectedRun && (
        <Modal
          isOpen={!!selectedRun}
          onClose={() => setSelectedRun(null)}
          title={`Payslips Breakdown: ${selectedRun.year_month} (${selectedRun.status.toUpperCase()})`}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs text-slate-500 pb-2 border-b">
              <span>Cycle Working Days: <strong>{selectedRun.working_days}</strong></span>
              <span>Total Net Disbursed: <strong className="text-teal-700">{formatCurrency(selectedRun.total_net)}</strong></span>
            </div>

            <Table
              columns={[
                {
                  header: 'Employee',
                  key: 'name',
                  render: (p) => (
                    <div>
                      <span className="font-bold text-slate-800 block">{p.first_name} {p.last_name}</span>
                      <span className="text-[11px] text-slate-400 font-mono">{p.employee_code}</span>
                    </div>
                  )
                },
                {
                  header: 'Attendance',
                  key: 'att',
                  render: (p) => (
                    <span className="text-xs text-slate-600">
                      {p.days_present}P &bull; {p.days_absent}A &bull; {p.late_count}L
                    </span>
                  )
                },
                {
                  header: 'Gross (PKR)',
                  key: 'gross_salary',
                  render: (p) => formatCurrency(p.gross_salary)
                },
                {
                  header: 'Deductions',
                  key: 'deductions',
                  render: (p) => <span className="text-rose-600 font-semibold">{formatCurrency(p.deductions)}</span>
                },
                {
                  header: 'Tax',
                  key: 'income_tax',
                  render: (p) => formatCurrency(p.income_tax)
                },
                {
                  header: 'Net Pay (PKR)',
                  key: 'net_salary',
                  render: (p) => <span className="font-bold text-emerald-700">{formatCurrency(p.net_salary)}</span>
                },
                {
                  header: 'PDF',
                  key: 'pdf',
                  render: (p) => (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Download}
                      onClick={() => handleDownloadPdf(p.id, p.employee_code, selectedRun.year_month)}
                      title="Download PDF Payslip"
                    >
                      PDF
                    </Button>
                  )
                }
              ]}
              data={payslips}
              isLoading={loadingPayslips}
              emptyMessage="No payslips generated for this run."
            />

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setSelectedRun(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

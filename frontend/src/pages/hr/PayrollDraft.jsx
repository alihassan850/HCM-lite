import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Play, CheckCircle2, AlertCircle, Eye, Download } from 'lucide-react';
import { payrollApi } from '../../api/payroll.api';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { formatCurrency } from '../../utils/formatCurrency';
import { downloadBlob } from '../../utils/downloadFile';

export default function PayrollDraft() {
  const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
  const [yearMonth, setYearMonth] = useState(currentMonth);
  const [runs, setRuns] = useState([]);
  const [activeRun, setActiveRun] = useState(null);
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadPayrollHistory();
  }, []);

  async function loadPayrollHistory() {
    try {
      setLoading(true);
      const res = await payrollApi.listRuns();
      setRuns(res.data.runs || []);
      if (res.data.runs && res.data.runs.length > 0) {
        loadRunDetails(res.data.runs[0]);
      }
    } catch (err) {
      setError('Failed to fetch payroll history.');
    } finally {
      setLoading(false);
    }
  }

  async function loadRunDetails(run) {
    setActiveRun(run);
    try {
      const res = await payrollApi.getRunPayslips(run.id);
      setPayslips(res.data.payslips || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleGenerateDraft(e) {
    e.preventDefault();
    try {
      setGenerating(true);
      setError(null);
      setSuccess(null);
      const res = await payrollApi.createDraft(yearMonth);
      setSuccess(res.data.message);
      loadPayrollHistory();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate payroll draft.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownloadPdf(payslipId, empCode) {
    try {
      const res = await payrollApi.downloadPayslipPdf(payslipId);
      downloadBlob(res.data, `Draft_Payslip_${empCode}_${activeRun?.year_month}.pdf`);
    } catch (err) {
      alert('Failed to download PDF.');
    }
  }

  const columns = [
    {
      header: 'Employee Details',
      key: 'name',
      render: (p) => (
        <div>
          <span className="font-bold text-slate-800 block">{p.first_name} {p.last_name}</span>
          <span className="text-xs text-slate-400 font-mono">{p.employee_code} &bull; {p.department_name || 'N/A'}</span>
        </div>
      )
    },
    {
      header: 'Attendance Stats',
      key: 'att',
      render: (p) => (
        <span className="text-xs text-slate-700">
          <strong>{p.days_present}</strong> Pres &bull; <strong>{p.days_absent}</strong> Abs &bull; <strong>{p.late_count}</strong> Late
          {p.late_penalty_days > 0 && <span className="text-rose-600 block text-[11px] font-semibold">Late Penalty: {p.late_penalty_days}d</span>}
        </span>
      )
    },
    {
      header: 'Gross Salary',
      key: 'gross_salary',
      render: (p) => formatCurrency(p.gross_salary)
    },
    {
      header: 'Deductions',
      key: 'deductions',
      render: (p) => <span className="text-rose-600 font-semibold">{formatCurrency(p.deductions)}</span>
    },
    {
      header: 'Tax (Slabs)',
      key: 'income_tax',
      render: (p) => formatCurrency(p.income_tax)
    },
    {
      header: 'Net Pay',
      key: 'net_salary',
      render: (p) => <span className="font-extrabold text-emerald-700">{formatCurrency(p.net_salary)}</span>
    },
    {
      header: 'Actions',
      key: 'pdf',
      render: (p) => (
        <Button
          variant="ghost"
          size="sm"
          icon={Download}
          onClick={() => handleDownloadPdf(p.id, p.employee_code)}
        >
          PDF
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Monthly Payroll Draft Engine</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Compile compensation drafts, deduct absent & late penalties, compute tax slabs, and submit for Admin lock
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium rounded-xl">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {success}
        </div>
      )}

      {/* Generator Form */}
      <Card title="Compile or Recalculate Payroll Draft" subtitle="Specify billing month in 'YYYY-MM' format">
        <form onSubmit={handleGenerateDraft} className="flex flex-col sm:flex-row items-end gap-3 max-w-lg">
          <Input
            label="Payroll Month (YYYY-MM)"
            type="month"
            value={yearMonth}
            onChange={(e) => setYearMonth(e.target.value)}
            required
          />
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={generating}
            icon={Play}
            className="w-full sm:w-auto flex-shrink-0"
          >
            Compute Draft Payroll
          </Button>
        </form>
      </Card>

      {/* Active Run Overview */}
      {activeRun && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900">Payroll Cycle: {activeRun.year_month}</h3>
                <Badge variant={activeRun.status === 'finalized' ? 'success' : 'warning'}>
                  {activeRun.status === 'finalized' ? 'LOCKED & FINALIZED' : 'DRAFT MODE (EDITABLE)'}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Total Month Working Days: <strong>{activeRun.working_days}</strong> &bull; Total Net Pay: <strong className="text-teal-700">{formatCurrency(activeRun.total_net)}</strong>
              </p>
            </div>

            {activeRun.status === 'draft' && (
              <div className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-xl border border-amber-200">
                Notice: HR compiles and reviews this draft. Final authorization and lock is executed by Admin.
              </div>
            )}
          </div>

          <Table
            columns={columns}
            data={payslips}
            isLoading={loading}
            emptyMessage="No payslips compiled for this draft."
          />
        </div>
      )}
    </div>
  );
}

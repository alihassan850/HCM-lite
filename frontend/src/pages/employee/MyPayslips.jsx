import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Download, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { payrollApi } from '../../api/payroll.api';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { formatCurrency } from '../../utils/formatCurrency';
import { downloadBlob } from '../../utils/downloadFile';

export default function MyPayslips() {
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    loadPayslips();
  }, []);

  async function loadPayslips() {
    try {
      setLoading(true);
      const res = await payrollApi.getMyPayslips();
      setPayslips(res.data.payslips || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadPdf(payslipId, period) {
    try {
      setDownloadingId(payslipId);
      const res = await payrollApi.downloadPayslipPdf(payslipId);
      downloadBlob(res.data, `My_Payslip_${period}.pdf`);
    } catch (err) {
      alert('Failed to download PDF payslip.');
    } finally {
      setDownloadingId(null);
    }
  }

  const columns = [
    {
      header: 'Disbursement Period',
      key: 'year_month',
      render: (p) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-slate-900 block">{p.year_month}</span>
            <span className="text-xs text-slate-400">{p.working_days} working days</span>
          </div>
        </div>
      )
    },
    {
      header: 'Attendance Summary',
      key: 'att',
      render: (p) => (
        <span className="text-xs text-slate-600">
          {p.days_present} Present &bull; {p.days_absent} Absent &bull; {p.late_count} Lates
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
      header: 'Income Tax',
      key: 'income_tax',
      render: (p) => formatCurrency(p.income_tax)
    },
    {
      header: 'Net Take-Home',
      key: 'net_salary',
      render: (p) => <span className="font-extrabold text-emerald-700">{formatCurrency(p.net_salary)}</span>
    },
    {
      header: 'Official Slip',
      key: 'download',
      render: (p) => (
        <Button
          variant="secondary"
          size="sm"
          icon={Download}
          loading={downloadingId === p.id}
          onClick={() => handleDownloadPdf(p.id, p.year_month)}
        >
          Download PDF
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">My Official Payslips</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified monthly remuneration statements with complete earnings, tax, and deduction itemization
          </p>
        </div>
      </div>

      <Table
        columns={columns}
        data={payslips}
        isLoading={loading}
        emptyMessage="No finalized monthly payslips released yet. Once Admin locks a cycle, it will appear here."
      />
    </div>
  );
}

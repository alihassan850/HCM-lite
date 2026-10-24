import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, Mail, Phone, MapPin, Calendar, Briefcase, DollarSign, Clock, AlertTriangle, ShieldCheck, Download, ArrowLeft } from 'lucide-react';
import { employeesApi } from '../../api/employees.api';
import { payrollApi } from '../../api/payroll.api';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import ErrorState from '../../components/ui/ErrorState';
import { formatDate } from '../../utils/formatDate';
import { formatCurrency } from '../../utils/formatCurrency';
import { downloadBlob } from '../../utils/downloadFile';

export default function Employee360() {
  const { id } = useParams();
  const { user, isAdmin, isHr } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    load360();
  }, [id]);

  async function load360() {
    try {
      setLoading(true);
      setError(null);
      const res = await employeesApi.getEmployee360(id);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load Employee 360 view.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadPdf(payslipId, period) {
    try {
      const res = await payrollApi.downloadPayslipPdf(payslipId);
      downloadBlob(res.data, `Payslip_${emp?.employee_code}_${period}.pdf`);
    } catch (err) {
      alert('Failed to download PDF.');
    }
  }

  if (loading) return <Spinner size="lg" label="Loading Employee 360 Dossier..." />;
  if (error) return <ErrorState message={error} onRetry={load360} />;

  const emp = data?.employee;
  const leaveBalances = data?.leave_balances || [];
  const recentAttendance = data?.recent_attendance || [];
  const payslips = data?.payslips || [];
  const bonus = data?.bonus_metrics || {};

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link to="/shared/employees" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800">
          <ArrowLeft className="w-4 h-4" /> Back to Employee Directory
        </Link>
      </div>

      {/* Header Profile Badge */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-teal-600 to-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-lg">
            {emp?.first_name?.charAt(0)}{emp?.last_name?.charAt(0)}
          </div>
          <div className="text-center sm:text-left space-y-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">{emp?.first_name} {emp?.last_name}</h2>
              <Badge variant="teal">{emp?.employee_code}</Badge>
              <Badge variant={emp?.employment_status === 'active' ? 'success' : 'warning'}>
                {emp?.employment_status?.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              {emp?.designation_title || 'Designation Pending'} &bull; {emp?.department_name || 'Department Pending'}
            </p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-1 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" /> {emp?.email}
              </span>
              {emp?.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" /> {emp?.phone}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Joined {formatDate(emp?.joining_date)}
              </span>
            </div>
          </div>
        </div>

        {/* Bonus: Attrition Risk Score Pill */}
        {(isAdmin || isHr) && bonus.attrition_risk_score !== undefined && (
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-center min-w-[140px]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Attrition Risk</span>
            <div className="flex items-baseline justify-center gap-1 mt-1">
              <span className="text-2xl font-extrabold text-slate-900">{bonus.attrition_risk_score}</span>
              <span className="text-xs text-slate-400">/ 100</span>
            </div>
            <Badge
              variant={bonus.attrition_risk_level === 'High' ? 'danger' : bonus.attrition_risk_level === 'Moderate' ? 'warning' : 'success'}
              size="sm"
              className="mt-1"
            >
              {bonus.attrition_risk_level} Risk
            </Badge>
          </div>
        )}
      </div>

      {/* Bonus: Absence Anomaly Flags */}
      {bonus.absence_anomalies && bonus.absence_anomalies.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Absence & Punctuality Anomaly Detected</h4>
            <div className="mt-1 space-y-1">
              {bonus.absence_anomalies.map((a, idx) => (
                <p key={idx} className="text-xs text-amber-800">
                  &bull; <strong>{a.type}:</strong> {a.description}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Compensation Structure (Visible to HR/Admin or Employee own self) */}
      {(isAdmin || isHr || Number(user?.employee_id) === Number(emp?.id)) && (
        <Card title="Remuneration & Allowances" subtitle="Monthly salary breakdown">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block">Basic Salary:</span>
              <span className="font-bold text-slate-800 text-sm mt-0.5 block">{formatCurrency(emp?.basic_salary)}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block">HRA (40%):</span>
              <span className="font-bold text-slate-800 text-sm mt-0.5 block">{formatCurrency(emp?.hra)}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 block">Medical (10%):</span>
              <span className="font-bold text-slate-800 text-sm mt-0.5 block">{formatCurrency(emp?.medical_allowance)}</span>
            </div>
            <div className="p-3 bg-teal-50 rounded-xl border border-teal-100">
              <span className="text-teal-700 font-semibold block">Total Gross:</span>
              <span className="font-extrabold text-teal-900 text-sm mt-0.5 block">{formatCurrency(emp?.gross_salary)}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Leave Balances */}
      <Card title="Leave Quota Balances" subtitle="Current fiscal year entitlements">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {leaveBalances.map((b) => (
            <div key={b.code} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">{b.name}</span>
              <span className="text-xl font-extrabold text-slate-900 block mt-1">
                {b.code === 'unpaid' ? '∞' : b.remaining}
              </span>
              <span className="text-[10px] text-slate-400">
                {b.code === 'unpaid' ? 'Unlimited' : `${b.used} used / ${b.yearly_quota} quota`}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent Attendance (Last 30 Days) */}
      <Card title="Attendance Record (Last 30 Days)" subtitle="Recent check-in and check-out stamps">
        <Table
          columns={[
            {
              header: 'Date',
              key: 'attendance_date',
              render: (r) => formatDate(r.attendance_date)
            },
            {
              header: 'Check In',
              key: 'check_in',
              render: (r) => r.check_in || '—'
            },
            {
              header: 'Check Out',
              key: 'check_out',
              render: (r) => r.check_out || '—'
            },
            {
              header: 'Hours',
              key: 'total_hours',
              render: (r) => (r.total_hours > 0 ? `${r.total_hours}h` : '—')
            },
            {
              header: 'Channel',
              key: 'source',
              render: (r) => (r.source ? r.source.toUpperCase() : 'WEB')
            },
            {
              header: 'Status',
              key: 'status',
              render: (r) => (
                <Badge variant={r.status === 'present' ? 'success' : r.status === 'late' ? 'warning' : 'danger'}>
                  {r.status?.toUpperCase()}
                </Badge>
              )
            }
          ]}
          data={recentAttendance}
          emptyMessage="No attendance logs recorded in the past 30 days."
        />
      </Card>

      {/* Disbursed Payslips */}
      {(isAdmin || isHr || Number(user?.employee_id) === Number(emp?.id)) && (
        <Card title="Disbursed Payslips History" subtitle="Finalized payroll releases">
          <Table
            columns={[
              {
                header: 'Payroll Cycle',
                key: 'year_month',
                render: (p) => p.year_month
              },
              {
                header: 'Gross Salary',
                key: 'gross_salary',
                render: (p) => formatCurrency(p.gross_salary)
              },
              {
                header: 'Deductions',
                key: 'deductions',
                render: (p) => formatCurrency(p.deductions)
              },
              {
                header: 'Income Tax',
                key: 'income_tax',
                render: (p) => formatCurrency(p.income_tax)
              },
              {
                header: 'Net Take-Home',
                key: 'net_salary',
                render: (p) => <span className="font-bold text-emerald-700">{formatCurrency(p.net_salary)}</span>
              },
              {
                header: 'PDF Slip',
                key: 'actions',
                render: (p) => (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Download}
                    onClick={() => handleDownloadPdf(p.id, p.year_month)}
                  >
                    Download
                  </Button>
                )
              }
            ]}
            data={payslips}
            emptyMessage="No payslips disbursed yet."
          />
        </Card>
      )}
    </div>
  );
}

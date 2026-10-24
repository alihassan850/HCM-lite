import React, { useState, useEffect } from 'react';
import { Clock, CalendarDays, FileSpreadsheet, Sparkles, AlertTriangle, ArrowRight } from 'lucide-react';
import { analyticsApi } from '../../api/analytics.api';
import { useAuth } from '../../hooks/useAuth';
import CheckInWidget from '../../components/CheckInWidget';
import KpiCard from '../../components/KpiCard';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import AnnouncementList from '../../components/AnnouncementList';
import Spinner from '../../components/ui/Spinner';
import { formatCurrency } from '../../utils/formatCurrency';
import { Link } from 'react-router-dom';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      const res = await analyticsApi.getEmployeeData();
      setData(res.data);
    } catch (err) {
      console.error('Failed to load employee dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading && !data) return <Spinner size="lg" label="Loading Self-Service Workspace..." />;

  const hoursLogged = data?.hours_this_week || 0;
  const hoursTarget = data?.hours_target || 40;
  const hoursPercent = Math.min(100, Math.round((hoursLogged / hoursTarget) * 100));

  return (
    <div className="space-y-6">
      {/* Top Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Welcome back, {user?.employee?.first_name || user?.email?.split('@')[0]}!
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {user?.employee?.designation_title || 'Employee'} &bull; {user?.employee?.department_name || 'Organization Staff'}
          </p>
        </div>

        <Link
          to="/shared/ai-assistant"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200/80 hover:bg-teal-100/60 transition-colors w-fit"
        >
          <Sparkles className="w-4 h-4 text-teal-600" />
          <span>Ask My AI Assistant</span>
        </Link>
      </div>

      {/* Grid: Check-In Widget & Weekly Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <CheckInWidget
            todayAttendance={data?.today_attendance}
            onRefresh={loadDashboard}
          />
        </div>

        <div className="lg:col-span-2 space-y-4">
          {/* Weekly Work Hours Progress */}
          <Card title="Hours Logged This Week" subtitle={`Standard work commitment: ${hoursTarget} Hours`}>
            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {hoursLogged} <span className="text-sm font-normal text-slate-400">/ {hoursTarget} hrs</span>
                </span>
                <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200/60">
                  {hoursPercent}% Completed
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-teal-600 transition-all duration-500 ease-out"
                  style={{ width: `${hoursPercent}%` }}
                />
              </div>
              <p className="text-xs text-slate-400">
                Punctuality records: <strong>{data?.late_count_month || 0} late check-in(s)</strong> logged this month.
              </p>
            </div>
          </Card>

          {/* Leave Balances Strip */}
          <Card
            title="My Leave Balances"
            subtitle="Annual quotas remaining"
            action={
              <Link to="/employee/apply-leave" className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1">
                Apply Leave <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(data?.leave_balances || []).map((lb) => (
                <div key={lb.code} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">{lb.name}</span>
                  <span className="text-xl font-extrabold text-slate-900 block mt-1">
                    {lb.code === 'unpaid' ? '∞' : lb.remaining}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {lb.code === 'unpaid' ? 'Unlimited' : `${lb.used} of ${lb.yearly_quota} used`}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Grid: Last Payslip & Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest Payslip Quick Card */}
        <Card
          title="Most Recent Payslip"
          subtitle={data?.last_payslip ? `Cycle: ${data.last_payslip.year_month}` : 'No finalized payslips available yet'}
          action={
            data?.last_payslip && (
              <Link to="/employee/payslips" className="text-xs font-semibold text-teal-600 hover:text-teal-700">
                All Payslips &rarr;
              </Link>
            )
          }
        >
          {data?.last_payslip ? (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block">Gross Salary:</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(data.last_payslip.gross_salary)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Deductions:</span>
                  <span className="font-semibold text-rose-600">{formatCurrency(data.last_payslip.deductions)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Net Take-Home:</span>
                  <span className="font-bold text-emerald-700">{formatCurrency(data.last_payslip.net_salary)}</span>
                </div>
              </div>
              <div className="flex justify-end">
                <Link to="/employee/payslips">
                  <Button variant="secondary" size="sm" icon={FileSpreadsheet}>
                    View & Download PDF
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-4 text-center">
              Your first monthly payroll cycle has not been finalized yet.
            </p>
          )}
        </Card>

        {/* Company Announcements */}
        <Card title="Company Broadcasts" subtitle="Announcements and official communications">
          <AnnouncementList
            announcements={data?.announcements || []}
            emptyMessage="No organizational announcements posted."
          />
        </Card>
      </div>
    </div>
  );
}

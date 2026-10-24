import React, { useState, useEffect } from 'react';
import { Users, UserCheck, UserX, Clock, AlertCircle, FileCheck2, Sparkles } from 'lucide-react';
import { analyticsApi } from '../../api/analytics.api';
import { setupApi } from '../../api/setup.api';
import KpiCard from '../../components/KpiCard';
import Card from '../../components/ui/Card';
import TrendChart from '../../components/charts/TrendChart';
import DeptBarChart from '../../components/charts/DeptBarChart';
import PieChart from '../../components/charts/PieChart';
import AiSummaryCard from '../../components/ai/AiSummaryCard';
import Spinner from '../../components/ui/Spinner';
import ErrorState from '../../components/ui/ErrorState';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import { Link } from 'react-router-dom';

export default function HrDashboard() {
  const [data, setData] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDepts();
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [selectedDept]);

  async function fetchDepts() {
    try {
      const res = await setupApi.getDepartments();
      setDepartments(res.data.departments || []);
    } catch (e) {}
  }

  async function loadDashboard() {
    try {
      setLoading(true);
      setError(null);
      const res = await analyticsApi.getHrData({ department_id: selectedDept || undefined });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load HR operations metrics.');
    } finally {
      setLoading(false);
    }
  }

  if (loading && !data) return <Spinner size="lg" label="Loading HR Operations Dashboard..." />;
  if (error && !data) return <ErrorState message={error} onRetry={loadDashboard} />;

  const kpis = data?.kpis || {};

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">People Operations Dashboard</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Daily attendance board, workforce presence, leave utilization, and operational queues
          </p>
        </div>

        <div className="w-full sm:w-60">
          <Select
            placeholder="All Departments"
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            options={departments.map(d => ({ value: d.id, label: d.name }))}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          title="Total Workforce"
          value={kpis.headcount || 0}
          subtitle="Registered employees"
          icon={Users}
          color="teal"
        />
        <KpiCard
          title="Present Today"
          value={kpis.present_today || 0}
          subtitle="On site / Checked in"
          icon={UserCheck}
          color="emerald"
        />
        <KpiCard
          title="On Leave Today"
          value={kpis.on_leave_today || 0}
          subtitle="Approved leave"
          icon={UserX}
          color="blue"
        />
        <KpiCard
          title="Late Arrivals"
          value={kpis.late_today || 0}
          subtitle="Arrived after 09:15"
          icon={Clock}
          color="amber"
        />
        <KpiCard
          title="Pending Approvals"
          value={kpis.pending_approvals || 0}
          subtitle="Leaves & corrections"
          icon={AlertCircle}
          color={kpis.pending_approvals > 0 ? 'rose' : 'teal'}
        />
      </div>

      {/* AI Summary Card */}
      <AiSummaryCard kpis={kpis} />

      {/* Attendance Velocity Trend */}
      <Card
        title="Attendance Velocity (Past 14 Days)"
        subtitle="Daily present vs late attendance volume"
      >
        <TrendChart data={data?.attendance_trend || []} height={200} />
      </Card>

      {/* Grid: Late Comers & Leave Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Late Comers this month */}
        <Card
          title="Top Late Arrivals This Month"
          subtitle="Frequent late check-ins subject to 3-lates penalty"
          action={
            <Link to="/hr/attendance-board" className="text-xs font-semibold text-teal-600 hover:text-teal-700">
              Attendance Board &rarr;
            </Link>
          }
        >
          {(!data?.top_late_comers || data.top_late_comers.length === 0) ? (
            <p className="text-center py-8 text-xs text-slate-400">No late arrival anomalies this month.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.top_late_comers.map((lc, idx) => (
                <div key={lc.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px]">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="font-bold text-slate-800">{lc.first_name} {lc.last_name}</span>
                      <span className="text-[11px] text-slate-400 block font-mono">{lc.employee_code} &bull; {lc.department_name || 'N/A'}</span>
                    </div>
                  </div>
                  <Badge variant="warning">
                    {lc.late_count} Late{lc.late_count > 1 ? 's' : ''}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Leave Utilization by Type */}
        <Card
          title="Annual Leave Distribution by Type"
          subtitle="Aggregated consumed quota across categories"
          action={
            <Link to="/hr/leave-approvals" className="text-xs font-semibold text-teal-600 hover:text-teal-700">
              Leave Inbox &rarr;
            </Link>
          }
        >
          <PieChart
            data={data?.leave_by_type || []}
            labelKey="name"
            valueKey="days_used"
          />
        </Card>
      </div>
    </div>
  );
}

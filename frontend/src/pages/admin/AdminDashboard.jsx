import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, DollarSign, Wallet, ShieldAlert, Sparkles, Building2 } from 'lucide-react';
import { analyticsApi } from '../../api/analytics.api';
import { setupApi } from '../../api/setup.api';
import KpiCard from '../../components/KpiCard';
import Card from '../../components/ui/Card';
import DeptBarChart from '../../components/charts/DeptBarChart';
import PieChart from '../../components/charts/PieChart';
import AiSummaryCard from '../../components/ai/AiSummaryCard';
import Spinner from '../../components/ui/Spinner';
import ErrorState from '../../components/ui/ErrorState';
import Select from '../../components/ui/Select';
import { formatCurrency, formatCompactCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

export default function AdminDashboard() {
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
      const res = await analyticsApi.getAdminData({ department_id: selectedDept || undefined });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load executive dashboard data.');
    } finally {
      setLoading(false);
    }
  }

  if (loading && !data) return <Spinner size="lg" label="Loading Executive Analytics..." />;
  if (error && !data) return <ErrorState message={error} onRetry={loadDashboard} />;

  const kpis = data?.kpis || {};

  return (
    <div className="space-y-6">
      {/* Top Header & Department Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Executive Dashboard</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Organization-wide workforce health, payroll allocations, and operational metrics
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

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Active Headcount"
          value={kpis.headcount || 0}
          subtitle="Full-time & Probation"
          icon={Users}
          color="teal"
        />
        <KpiCard
          title="Attrition Rate YTD"
          value={`${kpis.attrition_ytd || 0}%`}
          subtitle={`${kpis.exits_ytd || 0} exit(s) this year`}
          icon={TrendingUp}
          color="amber"
        />
        <KpiCard
          title="Monthly Payroll Cost"
          value={formatCompactCurrency(kpis.payroll_cost || 0)}
          subtitle={`Net: ${formatCompactCurrency(kpis.net_payroll_cost || 0)}`}
          icon={DollarSign}
          color="blue"
        />
        <KpiCard
          title="Average Salary"
          value={formatCompactCurrency(kpis.average_salary || 0)}
          subtitle="Mean gross per employee"
          icon={Wallet}
          color="purple"
        />
      </div>

      {/* AI Summary Card */}
      <AiSummaryCard kpis={kpis} />

      {/* Two Column Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Headcount by Department */}
        <Card title="Headcount by Department" subtitle="Active staff distribution across units">
          <DeptBarChart
            data={data?.headcount_by_department || []}
            labelKey="name"
            valueKey="headcount"
            color="#0d9488"
          />
        </Card>

        {/* Payroll Allocation by Department */}
        <Card title="Payroll Expenditure by Department" subtitle="Monthly gross remuneration per unit">
          <DeptBarChart
            data={data?.payroll_by_department || []}
            labelKey="name"
            valueKey="total_gross"
            color="#3b82f6"
          />
        </Card>
      </div>

      {/* Demographic & Tenure Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Workforce Gender Distribution" subtitle="Organizational diversity metric">
          <PieChart
            data={data?.gender_breakdown || []}
            labelKey="gender"
            valueKey="count"
          />
        </Card>

        <Card title="Tenure Profile" subtitle="Employee retention & experience bands">
          <PieChart
            data={data?.tenure_breakdown || []}
            labelKey="band"
            valueKey="count"
          />
        </Card>

        {/* Live Audit Log Feed */}
        <Card
          title="Live Audit Activity"
          subtitle="Recent critical system events"
          className="lg:col-span-1"
        >
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {(!data?.recent_audits || data.recent_audits.length === 0) ? (
              <p className="text-center py-6 text-xs text-slate-400">No audit events recorded yet.</p>
            ) : (
              data.recent_audits.map((a) => (
                <div key={a.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div className="flex items-center justify-between font-semibold text-slate-800">
                    <span className="text-teal-700">{a.action}</span>
                    <span className="text-[10px] text-slate-400 font-normal">{formatDate(a.created_at)}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
                    <span>Target: <strong>{a.entity} #{a.entity_id || ''}</strong></span>
                    <span className="text-slate-400">By: {a.actor_name?.split('@')[0]}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

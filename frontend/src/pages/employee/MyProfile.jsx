import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Building, Briefcase, Calendar, Save, CheckCircle2, DollarSign } from 'lucide-react';
import { authApi } from '../../api/auth.api';
import { employeesApi } from '../../api/employees.api';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import { formatDate } from '../../utils/formatDate';
import { formatCurrency } from '../../utils/formatCurrency';

export default function MyProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const [editForm, setEditForm] = useState({ phone: '', address: '' });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      const res = await authApi.getMe();
      const emp = res.data.user?.employee;
      setProfile(emp);
      if (emp) {
        setEditForm({
          phone: emp.phone || '',
          address: emp.address || ''
        });
      }
    } catch (err) {
      setError('Failed to fetch profile details.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!profile) return;
    try {
      setSaving(true);
      setError(null);
      setMessage(null);
      const res = await employeesApi.updateEmployee(profile.id, {
        phone: editForm.phone,
        address: editForm.address
      });
      setProfile(res.data.employee);
      setMessage('Profile contact information updated successfully.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner size="lg" label="Loading Employee Profile..." />;

  if (!profile) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        No employee profile is currently mapped to this login account.
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">My Personnel Profile</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Self-service personal record details and contact info updates
        </p>
      </div>

      {message && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium rounded-xl">
          {error}
        </div>
      )}

      {/* Profile Overview Header Card */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-5">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-teal-600 to-sky-600 text-white flex items-center justify-center font-black text-2xl shadow-md flex-shrink-0">
          {profile.first_name.charAt(0)}{profile.last_name.charAt(0)}
        </div>
        <div className="flex-1 text-center sm:text-left space-y-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h3 className="text-xl font-black text-slate-900">{profile.first_name} {profile.last_name}</h3>
            <Badge variant="teal">{profile.employee_code}</Badge>
            <Badge variant="success">{profile.employment_status.toUpperCase()}</Badge>
          </div>
          <p className="text-xs text-slate-500">
            {profile.designation_title || 'Employee'} &bull; {profile.department_name || 'General Department'}
          </p>
          <p className="text-xs text-slate-400">
            Joined on {formatDate(profile.joining_date)}
          </p>
        </div>
      </div>

      {/* Editable Contact Info Form */}
      <Card title="Contact Information" subtitle="You may update your official contact phone and address">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Corporate Email (Read Only)"
              value={profile.email}
              disabled
              icon={Mail}
              helperText="Assigned by IT administrator"
            />
            <Input
              label="Mobile / Contact Phone"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              placeholder="+92 300 1234567"
              icon={Phone}
              required
            />
          </div>

          <Input
            label="Residential Address"
            value={editForm.address}
            onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
            placeholder="Street address, City, Country"
            icon={MapPin}
            required
          />

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={saving}
              icon={Save}
            >
              Save Contact Updates
            </Button>
          </div>
        </form>
      </Card>

      {/* Read-Only Compensation Structure */}
      <Card title="Remuneration & Allowances" subtitle="Corporate salary parameters configured by HR">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block">Basic Salary:</span>
            <span className="font-bold text-slate-800 text-sm mt-0.5 block">{formatCurrency(profile.basic_salary)}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block">House Rent (HRA 40%):</span>
            <span className="font-bold text-slate-800 text-sm mt-0.5 block">{formatCurrency(profile.hra)}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-400 block">Medical (10%):</span>
            <span className="font-bold text-slate-800 text-sm mt-0.5 block">{formatCurrency(profile.medical_allowance)}</span>
          </div>
          <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-100">
            <span className="text-teal-700 font-semibold block">Total Gross:</span>
            <span className="font-extrabold text-teal-900 text-sm mt-0.5 block">{formatCurrency(profile.gross_salary)}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Shield, Lock, Mail, MapPin, Clock } from 'lucide-react';
import { authApi } from '../../api/auth.api';
import { useAuth } from '../../hooks/useAuth';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

export default function FirstRunSetup() {
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    company_name: 'Saylani IT Park',
    admin_email: 'admin@saylani.org',
    admin_password: '',
    confirm_password: '',
    office_start: '09:00',
    grace_minutes: 15,
    office_lat: 24.8607,
    office_lng: 67.0011,
    office_radius_meters: 150
  });

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.admin_password !== form.confirm_password) {
      setError('Passwords do not match.');
      return;
    }
    if (form.admin_password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await authApi.firstRunSetup(form);
      setAuth(res.data.user, res.data.token);
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Setup failed. Please check inputs.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl border border-slate-200/80 p-8 sm:p-10">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-tr from-teal-600 to-sky-600 text-white rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-teal-500/20 mb-4">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">HCM Lite — First-Run Setup</h1>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Configure your enterprise workspace rules and create the primary Super Administrator account.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section: Organization Profile */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-teal-600" /> Organization Profile
            </h3>
            <Input
              label="Company Name"
              name="company_name"
              value={form.company_name}
              onChange={handleChange}
              placeholder="e.g. Saylani Tech Enterprise"
              required
            />
          </div>

          {/* Section: Super Administrator */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-teal-600" /> Super Admin Credentials
            </h3>
            <Input
              label="Admin Email"
              type="email"
              name="admin_email"
              value={form.admin_email}
              onChange={handleChange}
              icon={Mail}
              placeholder="admin@company.com"
              required
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Admin Password"
                type="password"
                name="admin_password"
                value={form.admin_password}
                onChange={handleChange}
                icon={Lock}
                placeholder="••••••••"
                required
              />
              <Input
                label="Confirm Password"
                type="password"
                name="confirm_password"
                value={form.confirm_password}
                onChange={handleChange}
                icon={Lock}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {/* Section: Office Shift & Geofence Rules */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-teal-600" /> Attendance Rules & Location
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Office Start (HH:MM)"
                name="office_start"
                value={form.office_start}
                onChange={handleChange}
                placeholder="09:00"
                required
              />
              <Input
                label="Grace Minutes"
                type="number"
                name="grace_minutes"
                value={form.grace_minutes}
                onChange={handleChange}
                placeholder="15"
                required
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Office Lat"
                type="number"
                step="any"
                name="office_lat"
                value={form.office_lat}
                onChange={handleChange}
              />
              <Input
                label="Office Lng"
                type="number"
                step="any"
                name="office_lng"
                value={form.office_lng}
                onChange={handleChange}
              />
              <Input
                label="Radius (Meters)"
                type="number"
                name="office_radius_meters"
                value={form.office_radius_meters}
                onChange={handleChange}
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            className="w-full shadow-lg shadow-teal-600/20"
          >
            Initialize HCM Lite System
          </Button>
        </form>
      </div>
    </div>
  );
}

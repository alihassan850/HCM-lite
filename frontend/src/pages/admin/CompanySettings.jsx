import React, { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle2, MapPin, Clock, Building } from 'lucide-react';
import { setupApi } from '../../api/setup.api';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';

export default function CompanySettings() {
  const [form, setForm] = useState({
    company_name: '',
    office_start: '09:00',
    grace_minutes: 15,
    half_day_hours: 5.0,
    work_days: 'Mon,Tue,Wed,Thu,Fri',
    office_lat: 24.8607,
    office_lng: 67.0011,
    office_radius_meters: 150
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      const res = await setupApi.getSettings();
      if (res.data.settings) {
        setForm(res.data.settings);
      }
    } catch (err) {
      setError('Failed to fetch company settings.');
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSave(e) {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setMessage(null);
      await setupApi.updateSettings(form);
      setMessage('Company operational settings updated successfully.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner size="lg" label="Loading Company Configuration..." />;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Company & Attendance Settings</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Define shift schedules, grace thresholds, working calendars, and mobile attendance geofences
        </p>
      </div>

      {message && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {message}
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Organization Info */}
        <Card title="Organization Identity" subtitle="Company name rendered on official payslips and reports">
          <div className="max-w-md">
            <Input
              label="Company Legal Name"
              name="company_name"
              value={form.company_name}
              onChange={handleChange}
              icon={Building}
              required
            />
          </div>
        </Card>

        {/* Office Hours & Status Rules */}
        <Card title="Shift & Attendance Parameters" subtitle="Office start rules applied to daily attendance processing">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Office Start (24h format)"
              name="office_start"
              value={form.office_start}
              onChange={handleChange}
              icon={Clock}
              placeholder="09:00"
              helperText="Arrivals after grace are marked 'Late'"
              required
            />
            <Input
              label="Grace Minutes"
              type="number"
              name="grace_minutes"
              value={form.grace_minutes}
              onChange={handleChange}
              placeholder="15"
              helperText="Threshold e.g. 15 min (09:15)"
              required
            />
            <Input
              label="Half-Day Duration (Hours)"
              type="number"
              step="0.5"
              name="half_day_hours"
              value={form.half_day_hours}
              onChange={handleChange}
              placeholder="5.0"
              helperText="Work under this duration = Half Day"
              required
            />
          </div>

          <div className="mt-4 max-w-md">
            <Input
              label="Working Days of Week"
              name="work_days"
              value={form.work_days}
              onChange={handleChange}
              placeholder="Mon,Tue,Wed,Thu,Fri"
              helperText="Comma separated. Days omitted are treated as weekends."
              required
            />
          </div>
        </Card>

        {/* Office Geofence & Camera Radius */}
        <Card title="Office Location Geofence" subtitle="GPS coordinates and radius verified for camera attendance">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Office Latitude"
              type="number"
              step="any"
              name="office_lat"
              value={form.office_lat}
              onChange={handleChange}
              icon={MapPin}
              placeholder="24.8607"
              required
            />
            <Input
              label="Office Longitude"
              type="number"
              step="any"
              name="office_lng"
              value={form.office_lng}
              onChange={handleChange}
              icon={MapPin}
              placeholder="67.0011"
              required
            />
            <Input
              label="Allowed Radius (Meters)"
              type="number"
              name="office_radius_meters"
              value={form.office_radius_meters}
              onChange={handleChange}
              placeholder="150"
              helperText="Maximum allowed Haversine distance"
              required
            />
          </div>
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={saving}
            icon={Save}
          >
            Save Configuration Changes
          </Button>
        </div>
      </form>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Megaphone, Plus, Calendar } from 'lucide-react';
import { commsApi } from '../../api/comms.api';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import AnnouncementList from '../../components/AnnouncementList';
import Spinner from '../../components/ui/Spinner';

export default function Announcements() {
  const { isAdmin, isHr } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    title: '',
    content: '',
    priority: 'normal',
    target_role: 'all'
  });

  useEffect(() => {
    loadAnnouncements();
  }, []);

  async function loadAnnouncements() {
    try {
      setLoading(true);
      const res = await commsApi.getAnnouncements();
      setAnnouncements(res.data.announcements || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      await commsApi.createAnnouncement(form);
      setModalOpen(false);
      setForm({ title: '', content: '', priority: 'normal', target_role: 'all' });
      loadAnnouncements();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to post announcement.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Company Announcements</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Official executive bulletins, policy notifications, and event broadcasts
          </p>
        </div>

        {(isAdmin || isHr) && (
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => {
              setError(null);
              setModalOpen(true);
            }}
          >
            Post Announcement
          </Button>
        )}
      </div>

      {loading ? (
        <Spinner size="lg" label="Loading Announcements..." />
      ) : (
        <AnnouncementList announcements={announcements} />
      )}

      {/* Post Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Broadcast New Announcement">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium rounded-xl">
              {error}
            </div>
          )}

          <Input
            label="Announcement Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Annual Company Townhall 2026"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Priority Level"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'normal', label: 'Normal' },
                { value: 'high', label: 'High' },
                { value: 'urgent', label: 'Urgent' }
              ]}
            />
            <Select
              label="Target Audience"
              value={form.target_role}
              onChange={(e) => setForm({ ...form, target_role: e.target.value })}
              options={[
                { value: 'all', label: 'All Roles (Company-wide)' },
                { value: 'admin', label: 'Administrators Only' },
                { value: 'hr', label: 'Human Resources Only' },
                { value: 'employee', label: 'Employees Only' }
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Message Content
            </label>
            <textarea
              rows={4}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Write the full announcement message here..."
              className="w-full rounded-lg border border-slate-300 p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Broadcast Now
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

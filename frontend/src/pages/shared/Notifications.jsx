import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, ExternalLink, Calendar, CheckCircle2 } from 'lucide-react';
import { commsApi } from '../../api/comms.api';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import { formatDateTime } from '../../utils/formatDate';
import { useNavigate } from 'react-router-dom';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    try {
      setLoading(true);
      const res = await commsApi.getNotifications();
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkRead(id, link) {
    try {
      await commsApi.markRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      if (link) navigate(link);
    } catch (err) {}
  }

  async function handleMarkAllRead() {
    try {
      await commsApi.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (err) {}
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Notifications Center</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            System alerts, leave application updates, and payroll release announcements
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="secondary"
            size="sm"
            icon={CheckCheck}
            onClick={handleMarkAllRead}
          >
            Mark All as Read ({unreadCount})
          </Button>
        )}
      </div>

      {loading ? (
        <Spinner size="lg" label="Loading notifications..." />
      ) : notifications.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 text-xs text-slate-400">
          <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          You have no notifications yet.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm divide-y divide-slate-100 overflow-hidden">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleMarkRead(n.id, n.link)}
              className={`p-4 transition-colors cursor-pointer flex items-start gap-4 ${
                n.is_read ? 'hover:bg-slate-50/80' : 'bg-teal-50/30 hover:bg-teal-50/60'
              }`}
            >
              <div className={`w-2.5 h-2.5 rounded-full mt-2 flex-shrink-0 ${n.is_read ? 'bg-slate-200' : 'bg-teal-600'}`} />

              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-slate-800">{n.title}</h4>
                  <span className="text-[11px] text-slate-400">{formatDateTime(n.created_at)}</span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                {n.link && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-600 mt-2">
                    View Associated Record &rarr;
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import api from './axios';

export const commsApi = {
  // Announcements
  getAnnouncements: () => api.get('/comms/announcements'),
  createAnnouncement: (data) => api.post('/comms/announcements', data),

  // Notifications
  getNotifications: () => api.get('/comms/notifications'),
  markRead: (id) => api.patch(`/comms/notifications/${id}/read`),
  markAllRead: () => api.post('/comms/notifications/mark-all-read'),

  // Audit Logs
  getAuditLogs: (params) => api.get('/comms/audit-logs', { params })
};

import api from './axios';

export const attendanceApi = {
  checkIn: (data) => api.post('/attendance/check-in', data),
  checkOut: (data) => api.post('/attendance/check-out', data),
  getDailyBoard: (date) => api.get('/attendance/daily-board', { params: { date } }),
  getMyCalendar: (params) => api.get('/attendance/my-calendar', { params }),
  requestCorrection: (data) => api.post('/attendance/corrections', data),
  listCorrections: (params) => api.get('/attendance/corrections', { params }),
  reviewCorrection: (id, data) => api.patch(`/attendance/corrections/${id}`, data)
};

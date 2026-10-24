import api from './axios';

export const analyticsApi = {
  getAdminData: (params) => api.get('/analytics/admin', { params }),
  getHrData: (params) => api.get('/analytics/hr', { params }),
  getEmployeeData: (params) => api.get('/analytics/employee', { params })
};

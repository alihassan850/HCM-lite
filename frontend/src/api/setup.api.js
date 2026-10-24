import api from './axios';

export const setupApi = {
  // Settings
  getSettings: () => api.get('/setup/settings'),
  updateSettings: (data) => api.put('/setup/settings', data),

  // Departments
  getDepartments: () => api.get('/setup/departments'),
  createDepartment: (data) => api.post('/setup/departments', data),
  deleteDepartment: (id) => api.delete(`/setup/departments/${id}`),

  // Designations
  getDesignations: () => api.get('/setup/designations'),
  createDesignation: (data) => api.post('/setup/designations', data),
  deleteDesignation: (id) => api.delete(`/setup/designations/${id}`),

  // Leave Types
  getLeaveTypes: () => api.get('/setup/leave-types'),
  updateLeaveType: (id, data) => api.put(`/setup/leave-types/${id}`, data),

  // Holidays
  getHolidays: () => api.get('/setup/holidays'),
  createHoliday: (data) => api.post('/setup/holidays', data),
  deleteHoliday: (id) => api.delete(`/setup/holidays/${id}`)
};

import api from './axios';

export const usersApi = {
  listUsers: () => api.get('/users'),
  createHrUser: (data) => api.post('/users/hr', data),
  toggleStatus: (id, status) => api.patch(`/users/${id}/status`, { status }),
  resetPassword: (id, temporary_password) => api.post(`/users/${id}/reset-password`, { temporary_password })
};

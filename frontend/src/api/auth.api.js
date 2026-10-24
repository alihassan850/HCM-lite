import api from './axios';

export const authApi = {
  checkSetup: () => api.get('/auth/check-setup'),
  firstRunSetup: (data) => api.post('/auth/first-run', data),
  login: (credentials) => api.post('/auth/login', credentials),
  changePassword: (data) => api.post('/auth/change-password', data),
  getMe: () => api.get('/auth/me')
};

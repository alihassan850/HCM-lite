import api from './axios';

export const leaveApi = {
  getBalances: (params) => api.get('/leave/balances', { params }),
  applyLeave: (data) => api.post('/leave/apply', data),
  listRequests: (params) => api.get('/leave/requests', { params }),
  reviewRequest: (id, data) => api.patch(`/leave/requests/${id}/review`, data),
  cancelRequest: (id) => api.post(`/leave/requests/${id}/cancel`)
};

import api from './axios';

export const aiApi = {
  chat: (prompt) => api.post('/ai/chat', { prompt }),
  summary: (kpis) => api.post('/ai/summary', { kpis }),
  smartLeave: (text) => api.post('/ai/smart-leave', { text })
};

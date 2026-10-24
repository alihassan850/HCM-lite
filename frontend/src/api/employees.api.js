import api from './axios';

export const employeesApi = {
  listEmployees: (params) => api.get('/employees', { params }),
  getEmployee360: (id) => api.get(`/employees/${id}/360`),
  registerEmployee: (data) => api.post('/employees', data),
  updateEmployee: (id, data) => api.put(`/employees/${id}`, data),
  dryRunCsv: (rows) => api.post('/employees/dry-run-csv', { rows }),
  commitCsv: (rows) => api.post('/employees/commit-csv', { rows }),
  exportCsv: () => api.get('/employees/export-csv', { responseType: 'blob' })
};

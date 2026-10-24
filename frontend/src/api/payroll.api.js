import api from './axios';

export const payrollApi = {
  listRuns: () => api.get('/payroll/runs'),
  createDraft: (year_month) => api.post('/payroll/draft', { year_month }),
  finalizeRun: (id) => api.post(`/payroll/runs/${id}/finalize`),
  getRunPayslips: (id) => api.get(`/payroll/runs/${id}/payslips`),
  getMyPayslips: () => api.get('/payroll/my-payslips'),
  downloadPayslipPdf: (id) => api.get(`/payroll/payslips/${id}/pdf`, { responseType: 'blob' })
};

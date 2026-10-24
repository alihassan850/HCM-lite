const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payroll.controller');
const { verifyToken, requireRoles } = require('../middleware/auth');

router.get('/runs', verifyToken, requireRoles('admin', 'hr'), payrollController.listPayrollRuns);
router.post('/draft', verifyToken, requireRoles('admin', 'hr'), payrollController.createPayrollDraft);
router.post('/runs/:id/finalize', verifyToken, requireRoles('admin'), payrollController.finalizePayroll);
router.get('/runs/:id/payslips', verifyToken, requireRoles('admin', 'hr'), payrollController.getRunPayslips);
router.get('/my-payslips', verifyToken, payrollController.getMyPayslips);
router.get('/payslips/:id/pdf', verifyToken, payrollController.downloadPayslipPdf);

module.exports = router;

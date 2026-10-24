const express = require('express');
const router = express.Router();
const employeesController = require('../controllers/employees.controller');
const { verifyToken, requireRoles } = require('../middleware/auth');

router.get('/', verifyToken, employeesController.listEmployees);
router.get('/export-csv', verifyToken, requireRoles('admin', 'hr'), employeesController.exportEmployeesCsv);
router.post('/dry-run-csv', verifyToken, requireRoles('admin', 'hr'), employeesController.dryRunCsvImport);
router.post('/commit-csv', verifyToken, requireRoles('admin', 'hr'), employeesController.commitCsvImport);
router.get('/:id/360', verifyToken, employeesController.getEmployee360);
router.post('/', verifyToken, requireRoles('admin', 'hr'), employeesController.registerEmployee);
router.put('/:id', verifyToken, employeesController.updateEmployee);

module.exports = router;

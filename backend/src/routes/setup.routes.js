const express = require('express');
const router = express.Router();
const setupController = require('../controllers/setup.controller');
const { verifyToken, requireRoles } = require('../middleware/auth');

// Company Settings (Admin can edit, HR can view)
router.get('/settings', verifyToken, requireRoles('admin', 'hr'), setupController.getSettings);
router.put('/settings', verifyToken, requireRoles('admin'), setupController.updateSettings);

// Departments
router.get('/departments', verifyToken, requireRoles('admin', 'hr'), setupController.getDepartments);
router.post('/departments', verifyToken, requireRoles('admin'), setupController.createDepartment);
router.delete('/departments/:id', verifyToken, requireRoles('admin'), setupController.deleteDepartment);

// Designations
router.get('/designations', verifyToken, requireRoles('admin', 'hr'), setupController.getDesignations);
router.post('/designations', verifyToken, requireRoles('admin'), setupController.createDesignation);
router.delete('/designations/:id', verifyToken, requireRoles('admin'), setupController.deleteDesignation);

// Leave Types
router.get('/leave-types', verifyToken, requireRoles('admin', 'hr', 'employee'), setupController.getLeaveTypes);
router.put('/leave-types/:id', verifyToken, requireRoles('admin'), setupController.updateLeaveType);

// Public Holidays
router.get('/holidays', verifyToken, requireRoles('admin', 'hr', 'employee'), setupController.getHolidays);
router.post('/holidays', verifyToken, requireRoles('admin'), setupController.createHoliday);
router.delete('/holidays/:id', verifyToken, requireRoles('admin'), setupController.deleteHoliday);

module.exports = router;

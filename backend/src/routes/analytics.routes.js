const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const { verifyToken, requireRoles } = require('../middleware/auth');

router.get('/admin', verifyToken, requireRoles('admin'), analyticsController.getAdminData);
router.get('/hr', verifyToken, requireRoles('admin', 'hr'), analyticsController.getHrData);
router.get('/employee', verifyToken, analyticsController.getEmployeeData);

module.exports = router;

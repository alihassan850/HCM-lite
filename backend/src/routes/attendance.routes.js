const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendance.controller');
const { verifyToken, requireRoles } = require('../middleware/auth');

router.post('/check-in', verifyToken, attendanceController.checkIn);
router.post('/check-out', verifyToken, attendanceController.checkOut);
router.get('/daily-board', verifyToken, requireRoles('admin', 'hr'), attendanceController.getDailyBoard);
router.get('/my-calendar', verifyToken, attendanceController.getMyAttendance);

// Corrections
router.post('/corrections', verifyToken, attendanceController.requestCorrection);
router.get('/corrections', verifyToken, attendanceController.listCorrections);
router.patch('/corrections/:id', verifyToken, requireRoles('admin', 'hr'), attendanceController.reviewCorrection);

module.exports = router;

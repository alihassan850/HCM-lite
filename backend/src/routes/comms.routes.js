const express = require('express');
const router = express.Router();
const commsController = require('../controllers/comms.controller');
const { verifyToken, requireRoles } = require('../middleware/auth');

// Announcements
router.get('/announcements', verifyToken, commsController.listAnnouncements);
router.post('/announcements', verifyToken, requireRoles('admin', 'hr'), commsController.createAnnouncement);

// Notifications
router.get('/notifications', verifyToken, commsController.listNotifications);
router.patch('/notifications/:id/read', verifyToken, commsController.markNotificationAsRead);
router.post('/notifications/mark-all-read', verifyToken, commsController.markAllNotificationsRead);

// Audit Logs (Admin only)
router.get('/audit-logs', verifyToken, requireRoles('admin'), commsController.listAuditLogs);

module.exports = router;

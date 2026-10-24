const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leave.controller');
const { verifyToken, requireRoles } = require('../middleware/auth');

router.get('/balances', verifyToken, leaveController.getBalances);
router.post('/apply', verifyToken, leaveController.applyLeave);
router.get('/requests', verifyToken, leaveController.listRequests);
router.patch('/requests/:id/review', verifyToken, requireRoles('admin', 'hr'), leaveController.reviewRequest);
router.post('/requests/:id/cancel', verifyToken, leaveController.cancelRequest);

module.exports = router;

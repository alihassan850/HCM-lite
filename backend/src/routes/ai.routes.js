const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const { verifyToken } = require('../middleware/auth');

router.post('/chat', verifyToken, aiController.handleChat);
router.post('/summary', verifyToken, aiController.handleDashboardSummary);
router.post('/smart-leave', verifyToken, aiController.handleSmartLeave);

module.exports = router;

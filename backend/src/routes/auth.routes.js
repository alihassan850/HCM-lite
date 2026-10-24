const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth');

router.get('/check-setup', authController.checkFirstRun);
router.post('/first-run', authController.firstRunSetup);
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/change-password', verifyToken, authController.changePassword);
router.get('/me', verifyToken, authController.getCurrentUser);

module.exports = router;

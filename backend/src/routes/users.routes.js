const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users.controller');
const { verifyToken, requireRoles } = require('../middleware/auth');

router.get('/', verifyToken, requireRoles('admin'), usersController.listUsers);
router.post('/hr', verifyToken, requireRoles('admin'), usersController.createHrUser);
router.patch('/:id/status', verifyToken, requireRoles('admin'), usersController.toggleUserStatus);
router.post('/:id/reset-password', verifyToken, requireRoles('admin'), usersController.resetUserPassword);

module.exports = router;

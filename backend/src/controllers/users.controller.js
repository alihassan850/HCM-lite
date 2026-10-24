const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { logAudit } = require('../services/audit.service');

async function listUsers(req, res, next) {
  try {
    const users = query.all(`
      SELECT u.id, u.email, u.role, u.status, u.must_change_password, u.created_at,
             e.id as employee_id, e.employee_code, e.first_name, e.last_name
      FROM users u
      LEFT JOIN employees e ON u.employee_id = e.id
      ORDER BY u.id DESC
    `);
    res.json({ users });
  } catch (err) {
    next(err);
  }
}

async function createHrUser(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and initial password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = query.get('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const result = query.run(`
      INSERT INTO users (email, password_hash, role, status, must_change_password, created_at, updated_at)
      VALUES (?, ?, 'hr', 'active', 1, datetime('now'), datetime('now'))
    `, [cleanEmail, hash]);

    const created = query.get('SELECT id, email, role, status, must_change_password FROM users WHERE id = ?', [result.lastInsertRowid]);

    logAudit({
      actor_id: req.user.id,
      actor_name: req.user.email,
      actor_role: req.user.role,
      action: 'CREATE_HR_USER',
      entity: 'User',
      entity_id: created.id,
      after_json: created
    });

    res.status(201).json({ user: created, message: 'HR login account created successfully.' });
  } catch (err) {
    next(err);
  }
}

async function toggleUserStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ error: "Status must be 'active' or 'inactive'." });
    }

    const target = query.get('SELECT * FROM users WHERE id = ?', [id]);
    if (!target) return res.status(404).json({ error: 'User not found.' });

    // Prevent deactivating own account
    if (Number(id) === Number(req.user.id)) {
      return res.status(400).json({ error: 'You cannot deactivate your own administrative account.' });
    }

    query.run('UPDATE users SET status = ?, updated_at = datetime(\'now\') WHERE id = ?', [status, id]);
    const updated = query.get('SELECT id, email, role, status FROM users WHERE id = ?', [id]);

    logAudit({
      actor_id: req.user.id,
      actor_name: req.user.email,
      actor_role: req.user.role,
      action: 'TOGGLE_USER_STATUS',
      entity: 'User',
      entity_id: id,
      before_json: target,
      after_json: updated
    });

    res.json({ user: updated, message: `User status changed to ${status}.` });
  } catch (err) {
    next(err);
  }
}

async function resetUserPassword(req, res, next) {
  try {
    const { id } = req.params;
    const { temporary_password } = req.body;

    if (!temporary_password || temporary_password.length < 6) {
      return res.status(400).json({ error: 'Temporary password must be at least 6 characters.' });
    }

    const target = query.get('SELECT * FROM users WHERE id = ?', [id]);
    if (!target) return res.status(404).json({ error: 'User not found.' });

    const hash = bcrypt.hashSync(temporary_password, 10);
    query.run(`
      UPDATE users
      SET password_hash = ?, must_change_password = 1, updated_at = datetime('now')
      WHERE id = ?
    `, [hash, id]);

    logAudit({
      actor_id: req.user.id,
      actor_name: req.user.email,
      actor_role: req.user.role,
      action: 'RESET_USER_PASSWORD',
      entity: 'User',
      entity_id: id
    });

    res.json({ message: 'User password reset. The user must change their password on next sign-in.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listUsers,
  createHrUser,
  toggleUserStatus,
  resetUserPassword
};

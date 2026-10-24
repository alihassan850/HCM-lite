const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');
const { logAudit } = require('../services/audit.service');

async function checkFirstRun(req, res, next) {
  try {
    const adminCount = query.get("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").count;
    const settings = query.get('SELECT * FROM settings WHERE id = 1');
    const isSetupCompleted = adminCount > 0 && settings && settings.is_setup_completed === 1;

    res.json({
      setup_required: !isSetupCompleted,
      company_name: settings?.company_name || 'HCM Lite'
    });
  } catch (err) {
    next(err);
  }
}

async function firstRunSetup(req, res, next) {
  try {
    const { company_name, admin_email, admin_password, office_start, grace_minutes, office_lat, office_lng, office_radius_meters } = req.body;

    if (!admin_email || !admin_password) {
      return res.status(400).json({ error: 'Admin email and password are required.' });
    }

    const adminExists = query.get("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").count;
    if (adminExists > 0) {
      return res.status(400).json({ error: 'First-run setup has already been completed.' });
    }

    // Update settings
    query.run(`
      UPDATE settings
      SET company_name = ?,
          office_start = COALESCE(?, office_start),
          grace_minutes = COALESCE(?, grace_minutes),
          office_lat = COALESCE(?, office_lat),
          office_lng = COALESCE(?, office_lng),
          office_radius_meters = COALESCE(?, office_radius_meters),
          is_setup_completed = 1,
          updated_at = datetime('now')
      WHERE id = 1
    `, [
      company_name || 'HCM Lite Enterprise',
      office_start || '09:00',
      grace_minutes || 15,
      office_lat || 24.8607,
      office_lng || 67.0011,
      office_radius_meters || 150
    ]);

    // Create Admin user
    const hash = bcrypt.hashSync(admin_password, 10);
    const userResult = query.run(`
      INSERT INTO users (email, password_hash, role, status, must_change_password, created_at, updated_at)
      VALUES (?, ?, 'admin', 'active', 0, datetime('now'), datetime('now'))
    `, [admin_email.trim().toLowerCase(), hash]);

    const adminUser = query.get('SELECT id, email, role, status, must_change_password FROM users WHERE id = ?', [userResult.lastInsertRowid]);

    logAudit({
      actor_id: adminUser.id,
      actor_name: adminUser.email,
      actor_role: 'admin',
      action: 'FIRST_RUN_SETUP',
      entity: 'Settings',
      entity_id: 1,
      after_json: { company_name, admin_email }
    });

    const token = jwt.sign({
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
      employee_id: null,
      must_change_password: 0
    }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Initial setup completed successfully.',
      token,
      user: adminUser
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = query.get('SELECT * FROM users WHERE email = ?', [cleanEmail]);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password credentials.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact HR or Admin.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password credentials.' });
    }

    // Fetch employee details if linked
    let employee = null;
    if (user.employee_id) {
      employee = query.get('SELECT * FROM employees WHERE id = ?', [user.employee_id]);
    }

    const token = jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role,
      employee_id: user.employee_id,
      must_change_password: user.must_change_password
    }, JWT_SECRET, { expiresIn: '7d' });

    logAudit({
      actor_id: user.id,
      actor_name: user.email,
      actor_role: user.role,
      action: 'LOGIN',
      entity: 'User',
      entity_id: user.id,
      ip_address: req.ip
    });

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        employee_id: user.employee_id,
        must_change_password: Boolean(user.must_change_password),
        employee
      }
    });
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { old_password, new_password } = req.body;
    const userId = req.user.id;

    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const user = query.get('SELECT * FROM users WHERE id = ?', [userId]);

    // If user has must_change_password === 1, old password check is optional or verified
    if (old_password) {
      const match = bcrypt.compareSync(old_password, user.password_hash);
      if (!match) {
        return res.status(400).json({ error: 'Current password provided is incorrect.' });
      }
    }

    const hash = bcrypt.hashSync(new_password, 10);
    query.run(`
      UPDATE users
      SET password_hash = ?, must_change_password = 0, updated_at = datetime('now')
      WHERE id = ?
    `, [hash, userId]);

    logAudit({
      actor_id: user.id,
      actor_name: user.email,
      actor_role: user.role,
      action: 'CHANGE_PASSWORD',
      entity: 'User',
      entity_id: userId
    });

    res.json({ message: 'Password updated successfully. You may continue into the system.' });
  } catch (err) {
    next(err);
  }
}

async function getCurrentUser(req, res, next) {
  try {
    const user = query.get('SELECT id, email, role, employee_id, status, must_change_password FROM users WHERE id = ?', [req.user.id]);
    let employee = null;
    if (user.employee_id) {
      employee = query.get(`
        SELECT e.*, d.name as department_name, des.title as designation_title
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN designations des ON e.designation_id = des.id
        WHERE e.id = ?
      `, [user.employee_id]);
    }

    res.json({
      user: {
        ...user,
        must_change_password: Boolean(user.must_change_password),
        employee
      }
    });
  } catch (err) {
    next(err);
  }
}

async function register(req, res, next) {
  try {
    const { first_name, last_name, email, password, role = 'employee' } = req.body;

    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ error: 'First name, last name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user or employee already exists
    const userExists = query.get('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (userExists) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    // Role safety check: allow 'employee' or 'hr' through self-registration
    const assignedRole = role === 'hr' ? 'hr' : 'employee';

    // Auto-generate employee code
    const empCount = query.get('SELECT COUNT(*) as count FROM employees').count;
    const employeeCode = `EMP-${String(empCount + 1).padStart(3, '0')}`;
    const today = new Date().toISOString().split('T')[0];

    // Standard baseline salary structure: 60,000 basic, 24,000 HRA (40%), 6,000 medical (10%), 90,000 Gross
    const basicSalary = 60000;
    const hra = Math.round(basicSalary * 0.40);
    const medical = Math.round(basicSalary * 0.10);
    const grossSalary = basicSalary + hra + medical;

    // Get default department if any
    const defaultDept = query.get('SELECT id FROM departments ORDER BY id ASC LIMIT 1');

    // Create employee record
    const empResult = query.run(`
      INSERT INTO employees (
        employee_code, first_name, last_name, email, department_id,
        joining_date, employment_status, basic_salary, hra, medical_allowance, gross_salary,
        created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [
      employeeCode,
      first_name.trim(),
      last_name.trim(),
      cleanEmail,
      defaultDept ? defaultDept.id : null,
      today,
      basicSalary,
      hra,
      medical,
      grossSalary
    ]);

    const employeeId = empResult.lastInsertRowid;

    // Create user login record
    const hash = bcrypt.hashSync(password, 10);
    const userResult = query.run(`
      INSERT INTO users (email, password_hash, role, employee_id, status, must_change_password, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'active', 0, datetime('now'), datetime('now'))
    `, [cleanEmail, hash, assignedRole, employeeId]);

    const newUser = query.get('SELECT id, email, role, status FROM users WHERE id = ?', [userResult.lastInsertRowid]);

    logAudit({
      actor_id: newUser.id,
      actor_name: `${first_name} ${last_name}`,
      actor_role: assignedRole,
      action: 'SELF_REGISTER',
      entity: 'User',
      entity_id: newUser.id,
      ip_address: req.ip
    });

    res.status(201).json({
      message: 'Account registered successfully! Please sign in with your credentials.',
      user: newUser
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  checkFirstRun,
  firstRunSetup,
  register,
  login,
  changePassword,
  getCurrentUser
};

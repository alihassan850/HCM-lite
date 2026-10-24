const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = process.env.DATABASE_FILE 
  ? path.resolve(__dirname, '../../', process.env.DATABASE_FILE)
  : path.join(dbDir, 'hcm_lite.db');

const db = new DatabaseSync(dbPath);

// Enable WAL and foreign keys
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

function initDatabase() {
  db.exec(`
    -- Company and System Settings
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      company_name TEXT NOT NULL DEFAULT 'HCM Lite Enterprise',
      office_start TEXT NOT NULL DEFAULT '09:00',
      grace_minutes INTEGER NOT NULL DEFAULT 15,
      half_day_hours REAL NOT NULL DEFAULT 5.0,
      work_days TEXT NOT NULL DEFAULT 'Mon,Tue,Wed,Thu,Fri',
      office_lat REAL DEFAULT 24.8607,
      office_lng REAL DEFAULT 67.0011,
      office_radius_meters INTEGER DEFAULT 150,
      is_setup_completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Users (Admin, HR, Employee)
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'hr', 'employee')),
      employee_id INTEGER,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
      must_change_password INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL
    );

    -- Departments
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Designations
    CREATE TABLE IF NOT EXISTS designations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      department_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
    );

    -- Leave Types & Default Quotas
    CREATE TABLE IF NOT EXISTS leave_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      code TEXT UNIQUE NOT NULL,
      yearly_quota INTEGER NOT NULL,
      is_paid INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Public Holidays
    CREATE TABLE IF NOT EXISTS public_holidays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      holiday_date TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Employees
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_code TEXT UNIQUE NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      address TEXT,
      gender TEXT DEFAULT 'other',
      department_id INTEGER,
      designation_id INTEGER,
      joining_date TEXT NOT NULL,
      exit_date TEXT,
      employment_status TEXT NOT NULL DEFAULT 'active' CHECK (employment_status IN ('active', 'probation', 'resigned', 'terminated')),
      basic_salary REAL NOT NULL DEFAULT 0,
      hra REAL NOT NULL DEFAULT 0,
      medical_allowance REAL NOT NULL DEFAULT 0,
      gross_salary REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
      FOREIGN KEY (designation_id) REFERENCES designations(id) ON DELETE SET NULL
    );

    -- Attendance
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      attendance_date TEXT NOT NULL,
      check_in TEXT,
      check_out TEXT,
      total_hours REAL DEFAULT 0,
      status TEXT NOT NULL CHECK (status IN ('present', 'late', 'half_day', 'absent', 'on_leave', 'missing_checkout')),
      source TEXT DEFAULT 'web' CHECK (source IN ('web', 'camera', 'correction')),
      location_lat REAL,
      location_lng REAL,
      accuracy REAL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      UNIQUE (employee_id, attendance_date)
    );

    -- Attendance Corrections
    CREATE TABLE IF NOT EXISTS attendance_corrections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attendance_id INTEGER,
      employee_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      proposed_check_in TEXT NOT NULL,
      proposed_check_out TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      reviewed_by INTEGER,
      review_comment TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (attendance_id) REFERENCES attendance(id) ON DELETE CASCADE,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Leave Requests
    CREATE TABLE IF NOT EXISTS leave_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      leave_type_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      days_count REAL NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
      reviewed_by INTEGER,
      review_comment TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE RESTRICT,
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Payroll Runs (Monthly)
    CREATE TABLE IF NOT EXISTS payroll_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year_month TEXT NOT NULL UNIQUE,
      working_days INTEGER NOT NULL,
      total_gross REAL DEFAULT 0,
      total_deductions REAL DEFAULT 0,
      total_tax REAL DEFAULT 0,
      total_net REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized')),
      created_by INTEGER,
      finalized_by INTEGER,
      finalized_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (finalized_by) REFERENCES users(id) ON DELETE SET NULL
    );

    -- Payslips
    CREATE TABLE IF NOT EXISTS payslips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payroll_run_id INTEGER NOT NULL,
      employee_id INTEGER NOT NULL,
      working_days INTEGER NOT NULL,
      days_present REAL DEFAULT 0,
      days_absent REAL DEFAULT 0,
      days_half REAL DEFAULT 0,
      days_unpaid_leave REAL DEFAULT 0,
      late_count INTEGER DEFAULT 0,
      late_penalty_days REAL DEFAULT 0,
      basic_salary REAL NOT NULL,
      hra REAL NOT NULL,
      medical_allowance REAL NOT NULL,
      gross_salary REAL NOT NULL,
      deductions REAL DEFAULT 0,
      taxable_income REAL DEFAULT 0,
      income_tax REAL DEFAULT 0,
      net_salary REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (payroll_run_id) REFERENCES payroll_runs(id) ON DELETE CASCADE,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
      UNIQUE (payroll_run_id, employee_id)
    );

    -- Announcements
    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
      target_role TEXT NOT NULL DEFAULT 'all' CHECK (target_role IN ('all', 'admin', 'hr', 'employee')),
      author_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- In-app Notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'leave', 'attendance', 'payroll', 'announcement', 'system')),
      is_read INTEGER NOT NULL DEFAULT 0,
      link TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Audit Logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_id INTEGER,
      actor_name TEXT,
      actor_role TEXT,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT,
      before_json TEXT,
      after_json TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- AI Conversation & Tool Execution Logs
    CREATE TABLE IF NOT EXISTS ai_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      user_role TEXT,
      prompt TEXT NOT NULL,
      response TEXT NOT NULL,
      tool_calls TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Ensure default Leave Types exist
  const existingLeaveTypes = db.prepare('SELECT COUNT(*) as count FROM leave_types').get();
  if (existingLeaveTypes.count === 0) {
    const insertLeave = db.prepare(`
      INSERT INTO leave_types (name, code, yearly_quota, is_paid)
      VALUES (?, ?, ?, ?)
    `);
    insertLeave.run('Annual Leave', 'annual', 14, 1);
    insertLeave.run('Sick Leave', 'sick', 8, 1);
    insertLeave.run('Casual Leave', 'casual', 10, 1);
    insertLeave.run('Unpaid Leave', 'unpaid', 9999, 0);
  }

  // Ensure settings record exists
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings WHERE id = 1').get();
  if (settingsCount.count === 0) {
    db.prepare(`
      INSERT INTO settings (id, company_name, office_start, grace_minutes, half_day_hours, work_days, office_lat, office_lng, office_radius_meters, is_setup_completed)
      VALUES (1, 'HCM Lite', '09:00', 15, 5.0, 'Mon,Tue,Wed,Thu,Fri', 24.8607, 67.0011, 150, 0)
    `).run();
  }

  // Check if ADMIN_EMAIL and ADMIN_PASSWORD are in env and admin user doesn't exist
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const adminExists = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('admin');
    if (adminExists.count === 0) {
      const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10);
      db.prepare(`
        INSERT INTO users (email, password_hash, role, status, must_change_password)
        VALUES (?, ?, 'admin', 'active', 0)
      `).run(process.env.ADMIN_EMAIL.trim().toLowerCase(), hash);
      db.prepare('UPDATE settings SET is_setup_completed = 1 WHERE id = 1').run();
    }
  }
}

initDatabase();

// Clean query helpers wrapping DatabaseSync
const query = {
  all(sql, params = []) {
    return db.prepare(sql).all(...params);
  },
  get(sql, params = []) {
    return db.prepare(sql).get(...params);
  },
  run(sql, params = []) {
    return db.prepare(sql).run(...params);
  },
  exec(sql) {
    return db.exec(sql);
  },
  raw: db
};

module.exports = {
  db,
  query
};

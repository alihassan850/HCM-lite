const { query } = require('../config/db');
const { logAudit } = require('../services/audit.service');

// Settings
async function getSettings(req, res, next) {
  try {
    const settings = query.get('SELECT * FROM settings WHERE id = 1');
    res.json({ settings });
  } catch (err) {
    next(err);
  }
}

async function updateSettings(req, res, next) {
  try {
    const { company_name, office_start, grace_minutes, half_day_hours, work_days, office_lat, office_lng, office_radius_meters } = req.body;
    const oldSettings = query.get('SELECT * FROM settings WHERE id = 1');

    query.run(`
      UPDATE settings
      SET company_name = COALESCE(?, company_name),
          office_start = COALESCE(?, office_start),
          grace_minutes = COALESCE(?, grace_minutes),
          half_day_hours = COALESCE(?, half_day_hours),
          work_days = COALESCE(?, work_days),
          office_lat = COALESCE(?, office_lat),
          office_lng = COALESCE(?, office_lng),
          office_radius_meters = COALESCE(?, office_radius_meters),
          updated_at = datetime('now')
      WHERE id = 1
    `, [
      company_name,
      office_start,
      grace_minutes,
      half_day_hours,
      work_days,
      office_lat,
      office_lng,
      office_radius_meters
    ]);

    const updated = query.get('SELECT * FROM settings WHERE id = 1');

    logAudit({
      actor_id: req.user.id,
      actor_name: req.user.email,
      actor_role: req.user.role,
      action: 'UPDATE_SETTINGS',
      entity: 'Settings',
      entity_id: 1,
      before_json: oldSettings,
      after_json: updated
    });

    res.json({ settings: updated, message: 'Settings saved successfully.' });
  } catch (err) {
    next(err);
  }
}

// Departments
async function getDepartments(req, res, next) {
  try {
    const departments = query.all(`
      SELECT d.*, COUNT(e.id) as employee_count
      FROM departments d
      LEFT JOIN employees e ON e.department_id = d.id AND e.employment_status IN ('active', 'probation')
      GROUP BY d.id
      ORDER BY d.name ASC
    `);
    res.json({ departments });
  } catch (err) {
    next(err);
  }
}

async function createDepartment(req, res, next) {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Department name is required.' });

    const existing = query.get('SELECT id FROM departments WHERE name = ?', [name.trim()]);
    if (existing) return res.status(400).json({ error: 'Department with this name already exists.' });

    const result = query.run('INSERT INTO departments (name, description) VALUES (?, ?)', [name.trim(), description || null]);
    const dept = query.get('SELECT * FROM departments WHERE id = ?', [result.lastInsertRowid]);

    logAudit({
      actor_id: req.user.id,
      actor_name: req.user.email,
      actor_role: req.user.role,
      action: 'CREATE_DEPARTMENT',
      entity: 'Department',
      entity_id: dept.id,
      after_json: dept
    });

    res.status(201).json({ department: dept });
  } catch (err) {
    next(err);
  }
}

async function deleteDepartment(req, res, next) {
  try {
    const { id } = req.params;
    const old = query.get('SELECT * FROM departments WHERE id = ?', [id]);
    if (!old) return res.status(404).json({ error: 'Department not found.' });

    query.run('DELETE FROM departments WHERE id = ?', [id]);

    logAudit({
      actor_id: req.user.id,
      actor_name: req.user.email,
      actor_role: req.user.role,
      action: 'DELETE_DEPARTMENT',
      entity: 'Department',
      entity_id: id,
      before_json: old
    });

    res.json({ message: 'Department removed successfully.' });
  } catch (err) {
    next(err);
  }
}

// Designations
async function getDesignations(req, res, next) {
  try {
    const designations = query.all(`
      SELECT des.*, d.name as department_name, COUNT(e.id) as employee_count
      FROM designations des
      LEFT JOIN departments d ON des.department_id = d.id
      LEFT JOIN employees e ON e.designation_id = des.id AND e.employment_status IN ('active', 'probation')
      GROUP BY des.id
      ORDER BY des.title ASC
    `);
    res.json({ designations });
  } catch (err) {
    next(err);
  }
}

async function createDesignation(req, res, next) {
  try {
    const { title, department_id } = req.body;
    if (!title) return res.status(400).json({ error: 'Designation title is required.' });

    const result = query.run('INSERT INTO designations (title, department_id) VALUES (?, ?)', [title.trim(), department_id || null]);
    const designation = query.get('SELECT * FROM designations WHERE id = ?', [result.lastInsertRowid]);

    logAudit({
      actor_id: req.user.id,
      actor_name: req.user.email,
      actor_role: req.user.role,
      action: 'CREATE_DESIGNATION',
      entity: 'Designation',
      entity_id: designation.id,
      after_json: designation
    });

    res.status(201).json({ designation });
  } catch (err) {
    next(err);
  }
}

async function deleteDesignation(req, res, next) {
  try {
    const { id } = req.params;
    const old = query.get('SELECT * FROM designations WHERE id = ?', [id]);
    if (!old) return res.status(404).json({ error: 'Designation not found.' });

    query.run('DELETE FROM designations WHERE id = ?', [id]);
    res.json({ message: 'Designation removed successfully.' });
  } catch (err) {
    next(err);
  }
}

// Leave Types
async function getLeaveTypes(req, res, next) {
  try {
    const leaveTypes = query.all('SELECT * FROM leave_types ORDER BY id ASC');
    res.json({ leave_types: leaveTypes });
  } catch (err) {
    next(err);
  }
}

async function updateLeaveType(req, res, next) {
  try {
    const { id } = req.params;
    const { yearly_quota, is_paid } = req.body;

    const old = query.get('SELECT * FROM leave_types WHERE id = ?', [id]);
    if (!old) return res.status(404).json({ error: 'Leave type not found.' });

    query.run(`
      UPDATE leave_types
      SET yearly_quota = COALESCE(?, yearly_quota),
          is_paid = COALESCE(?, is_paid)
      WHERE id = ?
    `, [yearly_quota, is_paid, id]);

    const updated = query.get('SELECT * FROM leave_types WHERE id = ?', [id]);

    logAudit({
      actor_id: req.user.id,
      actor_name: req.user.email,
      actor_role: req.user.role,
      action: 'UPDATE_LEAVE_TYPE',
      entity: 'LeaveType',
      entity_id: id,
      before_json: old,
      after_json: updated
    });

    res.json({ leave_type: updated, message: 'Leave type updated successfully.' });
  } catch (err) {
    next(err);
  }
}

// Holidays
async function getHolidays(req, res, next) {
  try {
    const holidays = query.all('SELECT * FROM public_holidays ORDER BY holiday_date ASC');
    res.json({ holidays });
  } catch (err) {
    next(err);
  }
}

async function createHoliday(req, res, next) {
  try {
    const { name, holiday_date } = req.body;
    if (!name || !holiday_date) return res.status(400).json({ error: 'Name and date are required.' });

    const existing = query.get('SELECT id FROM public_holidays WHERE holiday_date = ?', [holiday_date]);
    if (existing) return res.status(400).json({ error: 'A holiday is already scheduled on this date.' });

    const result = query.run('INSERT INTO public_holidays (name, holiday_date) VALUES (?, ?)', [name.trim(), holiday_date]);
    const holiday = query.get('SELECT * FROM public_holidays WHERE id = ?', [result.lastInsertRowid]);

    logAudit({
      actor_id: req.user.id,
      actor_name: req.user.email,
      actor_role: req.user.role,
      action: 'CREATE_HOLIDAY',
      entity: 'PublicHoliday',
      entity_id: holiday.id,
      after_json: holiday
    });

    res.status(201).json({ holiday });
  } catch (err) {
    next(err);
  }
}

async function deleteHoliday(req, res, next) {
  try {
    const { id } = req.params;
    query.run('DELETE FROM public_holidays WHERE id = ?', [id]);
    res.json({ message: 'Holiday deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSettings,
  updateSettings,
  getDepartments,
  createDepartment,
  deleteDepartment,
  getDesignations,
  createDesignation,
  deleteDesignation,
  getLeaveTypes,
  updateLeaveType,
  getHolidays,
  createHoliday,
  deleteHoliday
};

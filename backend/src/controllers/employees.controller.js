const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { logAudit } = require('../services/audit.service');
const { getEmployeeLeaveBalances } = require('../services/leave.service');

async function listEmployees(req, res, next) {
  try {
    const { search, department_id, designation_id, status, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = "WHERE 1=1";
    const params = [];

    // If role is employee, they only see themselves
    if (req.user.role === 'employee') {
      whereClause += " AND e.id = ?";
      params.push(req.user.employee_id);
    } else {
      if (search) {
        whereClause += " AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.email LIKE ? OR e.employee_code LIKE ?)";
        const term = `%${search}%`;
        params.push(term, term, term, term);
      }
      if (department_id) {
        whereClause += " AND e.department_id = ?";
        params.push(department_id);
      }
      if (designation_id) {
        whereClause += " AND e.designation_id = ?";
        params.push(designation_id);
      }
      if (status) {
        whereClause += " AND e.employment_status = ?";
        params.push(status);
      }
    }

    const totalCount = query.get(`SELECT COUNT(*) as count FROM employees e ${whereClause}`, params).count;

    const employees = query.all(`
      SELECT e.*, d.name as department_name, des.title as designation_title, u.status as user_status
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN designations des ON e.designation_id = des.id
      LEFT JOIN users u ON u.employee_id = e.id
      ${whereClause}
      ORDER BY e.id DESC
      LIMIT ? OFFSET ?
    `, [...params, Number(limit), offset]);

    res.json({
      employees,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / Number(limit))
      }
    });
  } catch (err) {
    next(err);
  }
}

async function getEmployee360(req, res, next) {
  try {
    const { id } = req.params;

    // RBAC scope check
    if (req.user.role === 'employee' && Number(req.user.employee_id) !== Number(id)) {
      return res.status(403).json({ error: 'Access denied: You can only view your own employee 360 profile.' });
    }

    const employee = query.get(`
      SELECT e.*, d.name as department_name, des.title as designation_title,
             u.id as user_id, u.status as account_status, u.must_change_password
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN designations des ON e.designation_id = des.id
      LEFT JOIN users u ON u.employee_id = e.id
      WHERE e.id = ?
    `, [id]);

    if (!employee) return res.status(404).json({ error: 'Employee not found.' });

    // Leave Balances
    const leaveBalances = getEmployeeLeaveBalances(id);

    // Recent Attendance (last 30 days)
    const recentAttendance = query.all(`
      SELECT * FROM attendance
      WHERE employee_id = ?
      ORDER BY attendance_date DESC
      LIMIT 30
    `, [id]);

    // Attendance stats
    const totalDays = recentAttendance.length;
    const lates = recentAttendance.filter(a => a.status === 'late').length;
    const halfDays = recentAttendance.filter(a => a.status === 'half_day').length;

    // Recent Payslips
    const payslips = query.all(`
      SELECT p.*, pr.year_month, pr.status as run_status
      FROM payslips p
      JOIN payroll_runs pr ON p.payroll_run_id = pr.id
      WHERE p.employee_id = ?
      ORDER BY pr.year_month DESC
      LIMIT 12
    `, [id]);

    // Bonus Features: Attrition Risk Score & Absence Anomaly Flags
    // Formula: Tenure in months, late frequency, total days
    const joinDate = new Date(employee.joining_date);
    const tenureMonths = Math.max(1, Math.round((new Date() - joinDate) / (1000 * 60 * 60 * 24 * 30.4)));
    let riskScore = 15; // baseline low
    if (tenureMonths < 6) riskScore += 25; // early probation risk
    if (lates > 3) riskScore += 30; // attendance strain
    if (employee.employment_status === 'probation') riskScore += 15;
    riskScore = Math.min(95, riskScore);

    const anomalies = [];
    if (lates >= 3) {
      anomalies.push({ type: 'High Late Frequency', description: `Accumulated ${lates} late arrivals in the past 30 days.` });
    }
    if (halfDays >= 2) {
      anomalies.push({ type: 'Multiple Half Days', description: `Logged ${halfDays} partial working days recently.` });
    }

    res.json({
      employee,
      leave_balances: leaveBalances,
      recent_attendance: recentAttendance,
      payslips,
      bonus_metrics: {
        attrition_risk_score: riskScore,
        attrition_risk_level: riskScore > 60 ? 'High' : (riskScore > 35 ? 'Moderate' : 'Low'),
        absence_anomalies: anomalies
      }
    });
  } catch (err) {
    next(err);
  }
}

async function registerEmployee(req, res, next) {
  try {
    const {
      employee_code, first_name, last_name, email, phone, address,
      gender, department_id, designation_id, joining_date, basic_salary,
      temporary_password
    } = req.body;

    if (!first_name || !last_name || !email || !joining_date || basic_salary === undefined) {
      return res.status(400).json({ error: 'First name, last name, email, joining date, and basic salary are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existingEmp = query.get('SELECT id FROM employees WHERE email = ?', [cleanEmail]);
    if (existingEmp) return res.status(400).json({ error: 'An employee with this email already exists.' });

    const existingUser = query.get('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existingUser) return res.status(400).json({ error: 'A user login with this email already exists.' });

    // Generate code if missing
    let code = employee_code;
    if (!code) {
      const count = query.get('SELECT COUNT(*) as cnt FROM employees').cnt;
      code = `EMP-${String(count + 1).padStart(3, '0')}`;
    }

    // Salary Structure: Gross = 1.5 * Basic (HRA 40%, Medical 10%)
    const basic = Number(basic_salary) || 0;
    const hra = Math.round(basic * 0.40 * 100) / 100;
    const medical = Math.round(basic * 0.10 * 100) / 100;
    const gross = Math.round((basic + hra + medical) * 100) / 100;

    const empResult = query.run(`
      INSERT INTO employees (
        employee_code, first_name, last_name, email, phone, address, gender,
        department_id, designation_id, joining_date, employment_status,
        basic_salary, hra, medical_allowance, gross_salary, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [
      code.trim(), first_name.trim(), last_name.trim(), cleanEmail, phone || null, address || null,
      gender || 'other', department_id || null, designation_id || null, joining_date,
      basic, hra, medical, gross
    ]);

    const employeeId = empResult.lastInsertRowid;

    // Create user login with temporary password (must_change_password = 1)
    const tempPass = temporary_password || 'Saylani@123';
    const hash = bcrypt.hashSync(tempPass, 10);
    query.run(`
      INSERT INTO users (email, password_hash, role, employee_id, status, must_change_password, created_at, updated_at)
      VALUES (?, ?, 'employee', ?, 'active', 1, datetime('now'), datetime('now'))
    `, [cleanEmail, hash, employeeId]);

    const created = query.get('SELECT * FROM employees WHERE id = ?', [employeeId]);

    logAudit({
      actor_id: req.user.id,
      actor_name: req.user.email,
      actor_role: req.user.role,
      action: 'REGISTER_EMPLOYEE',
      entity: 'Employee',
      entity_id: employeeId,
      after_json: { employee: created, temp_password: tempPass }
    });

    res.status(201).json({
      employee: created,
      temp_password: tempPass,
      message: 'Employee registered successfully and login account provisioned.'
    });
  } catch (err) {
    next(err);
  }
}

async function updateEmployee(req, res, next) {
  try {
    const { id } = req.params;
    const old = query.get('SELECT * FROM employees WHERE id = ?', [id]);
    if (!old) return res.status(404).json({ error: 'Employee not found.' });

    // If Employee role: can only edit phone and address
    if (req.user.role === 'employee') {
      if (Number(req.user.employee_id) !== Number(id)) {
        return res.status(403).json({ error: 'You are only authorized to edit your own profile.' });
      }

      const { phone, address } = req.body;
      query.run(`
        UPDATE employees
        SET phone = ?, address = ?, updated_at = datetime('now')
        WHERE id = ?
      `, [phone, address, id]);

      const updated = query.get('SELECT * FROM employees WHERE id = ?', [id]);
      return res.json({ employee: updated, message: 'Profile updated successfully.' });
    }

    // HR and Admin can update all fields
    const {
      first_name, last_name, phone, address, gender, department_id,
      designation_id, joining_date, exit_date, employment_status, basic_salary
    } = req.body;

    let basic = old.basic_salary;
    let hra = old.hra;
    let medical = old.medical_allowance;
    let gross = old.gross_salary;

    if (basic_salary !== undefined) {
      basic = Number(basic_salary) || 0;
      hra = Math.round(basic * 0.40 * 100) / 100;
      medical = Math.round(basic * 0.10 * 100) / 100;
      gross = Math.round((basic + hra + medical) * 100) / 100;
    }

    query.run(`
      UPDATE employees
      SET first_name = COALESCE(?, first_name),
          last_name = COALESCE(?, last_name),
          phone = COALESCE(?, phone),
          address = COALESCE(?, address),
          gender = COALESCE(?, gender),
          department_id = COALESCE(?, department_id),
          designation_id = COALESCE(?, designation_id),
          joining_date = COALESCE(?, joining_date),
          exit_date = COALESCE(?, exit_date),
          employment_status = COALESCE(?, employment_status),
          basic_salary = ?,
          hra = ?,
          medical_allowance = ?,
          gross_salary = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `, [
      first_name, last_name, phone, address, gender, department_id, designation_id,
      joining_date, exit_date, employment_status, basic, hra, medical, gross, id
    ]);

    const updated = query.get('SELECT * FROM employees WHERE id = ?', [id]);

    logAudit({
      actor_id: req.user.id,
      actor_name: req.user.email,
      actor_role: req.user.role,
      action: 'UPDATE_EMPLOYEE',
      entity: 'Employee',
      entity_id: id,
      before_json: old,
      after_json: updated
    });

    res.json({ employee: updated, message: 'Employee records updated successfully.' });
  } catch (err) {
    next(err);
  }
}

// CSV Dry Run & Import
async function dryRunCsvImport(req, res, next) {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'Valid array of CSV row records is required.' });
    }

    const errors = [];
    const validRows = [];
    const existingEmails = new Set(query.all('SELECT email FROM employees').map(e => e.email.toLowerCase()));
    const existingCodes = new Set(query.all('SELECT employee_code FROM employees').map(e => e.employee_code.toLowerCase()));
    const depts = query.all('SELECT id, name FROM departments');
    const deptMap = new Map(depts.map(d => [d.name.toLowerCase(), d.id]));

    rows.forEach((row, index) => {
      const rowNum = index + 1;
      const { employee_code, first_name, last_name, email, department, joining_date, basic_salary } = row;

      // Required fields check
      if (!first_name) errors.push({ row: rowNum, field: 'first_name', reason: 'First name is required' });
      if (!last_name) errors.push({ row: rowNum, field: 'last_name', reason: 'Last name is required' });
      if (!email) errors.push({ row: rowNum, field: 'email', reason: 'Email is required' });
      if (!joining_date) errors.push({ row: rowNum, field: 'joining_date', reason: 'Joining date is required' });
      if (!basic_salary) errors.push({ row: rowNum, field: 'basic_salary', reason: 'Basic salary is required' });

      // Valid email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (email && !emailRegex.test(email)) {
        errors.push({ row: rowNum, field: 'email', reason: 'Invalid email address format' });
      }

      // Unique email check
      if (email && existingEmails.has(email.toLowerCase())) {
        errors.push({ row: rowNum, field: 'email', reason: 'Email address already exists in system' });
      }

      // Unique code check
      if (employee_code && existingCodes.has(employee_code.toLowerCase())) {
        errors.push({ row: rowNum, field: 'employee_code', reason: 'Employee code already exists' });
      }

      // Known department check
      let deptId = null;
      if (department) {
        deptId = deptMap.get(department.trim().toLowerCase());
        if (!deptId) {
          errors.push({ row: rowNum, field: 'department', reason: `Department '${department}' is unknown. Create it first.` });
        }
      }

      // ISO date check (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (joining_date && !dateRegex.test(joining_date)) {
        errors.push({ row: rowNum, field: 'joining_date', reason: 'Date must follow ISO format (YYYY-MM-DD)' });
      }

      // Salary > 0 check
      const sal = Number(basic_salary);
      if (basic_salary !== undefined && (isNaN(sal) || sal <= 0)) {
        errors.push({ row: rowNum, field: 'basic_salary', reason: 'Basic salary must be greater than 0' });
      }

      // Track duplicate within current CSV batch
      if (email) existingEmails.add(email.toLowerCase());
      if (employee_code) existingCodes.add(employee_code.toLowerCase());

      if (errors.filter(e => e.row === rowNum).length === 0) {
        validRows.push({ ...row, department_id: deptId });
      }
    });

    res.json({
      total_rows: rows.length,
      valid_count: validRows.length,
      error_count: errors.length,
      errors,
      can_import: errors.length === 0
    });
  } catch (err) {
    next(err);
  }
}

async function commitCsvImport(req, res, next) {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'No employee rows provided to commit.' });
    }

    const defaultTempPass = 'Saylani@123';
    const defaultHash = bcrypt.hashSync(defaultTempPass, 10);
    const importedIds = [];

    rows.forEach(r => {
      const basic = Number(r.basic_salary) || 0;
      const hra = Math.round(basic * 0.40 * 100) / 100;
      const medical = Math.round(basic * 0.10 * 100) / 100;
      const gross = Math.round((basic + hra + medical) * 100) / 100;
      const cleanEmail = r.email.trim().toLowerCase();

      let code = r.employee_code;
      if (!code) {
        const count = query.get('SELECT COUNT(*) as cnt FROM employees').cnt;
        code = `EMP-${String(count + 1).padStart(3, '0')}`;
      }

      const resEmp = query.run(`
        INSERT INTO employees (
          employee_code, first_name, last_name, email, phone, address, gender,
          department_id, designation_id, joining_date, employment_status,
          basic_salary, hra, medical_allowance, gross_salary, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, datetime('now'), datetime('now'))
      `, [
        code, r.first_name, r.last_name, cleanEmail, r.phone || null, r.address || null,
        r.gender || 'other', r.department_id || null, r.designation_id || null, r.joining_date,
        basic, hra, medical, gross
      ]);

      const empId = resEmp.lastInsertRowid;
      importedIds.push(empId);

      // Create login
      query.run(`
        INSERT INTO users (email, password_hash, role, employee_id, status, must_change_password, created_at, updated_at)
        VALUES (?, ?, 'employee', ?, 'active', 1, datetime('now'), datetime('now'))
      `, [cleanEmail, defaultHash, empId]);
    });

    logAudit({
      actor_id: req.user.id,
      actor_name: req.user.email,
      actor_role: req.user.role,
      action: 'CSV_IMPORT_EMPLOYEES',
      entity: 'Employee',
      after_json: { imported_count: importedIds.length }
    });

    res.json({
      message: `Successfully imported ${importedIds.length} employee records and provisioned logins.`,
      imported_count: importedIds.length
    });
  } catch (err) {
    next(err);
  }
}

async function exportEmployeesCsv(req, res, next) {
  try {
    const employees = query.all(`
      SELECT e.employee_code, e.first_name, e.last_name, e.email, e.phone, e.gender,
             d.name as department, des.title as designation, e.joining_date, e.employment_status,
             e.basic_salary, e.hra, e.medical_allowance, e.gross_salary
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN designations des ON e.designation_id = des.id
      ORDER BY e.id ASC
    `);

    const headers = [
      'employee_code', 'first_name', 'last_name', 'email', 'phone', 'gender',
      'department', 'designation', 'joining_date', 'employment_status',
      'basic_salary', 'hra', 'medical_allowance', 'gross_salary'
    ];

    let csvContent = headers.join(',') + '\n';
    employees.forEach(emp => {
      const row = headers.map(h => {
        const val = emp[h] ?? '';
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="hcm_employees_export.csv"');
    res.send(csvContent);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listEmployees,
  getEmployee360,
  registerEmployee,
  updateEmployee,
  dryRunCsvImport,
  commitCsvImport,
  exportEmployeesCsv
};

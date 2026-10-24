const { query } = require('../config/db');
const attendanceService = require('../services/attendance.service');
const { logAudit } = require('../services/audit.service');

async function checkIn(req, res, next) {
  try {
    let employeeId = req.user.employee_id;
    if (['admin', 'hr'].includes(req.user.role) && req.body.employee_id) {
      employeeId = req.body.employee_id;
    }

    if (!employeeId) {
      return res.status(400).json({ error: 'No employee account linked to this user.' });
    }

    const { source, lat, lng, accuracy } = req.body;
    const record = attendanceService.checkIn(employeeId, { source, lat, lng, accuracy }, req.user);

    res.status(201).json({
      message: `Checked in successfully as ${record.status}.`,
      attendance: record
    });
  } catch (err) {
    next(err);
  }
}

async function checkOut(req, res, next) {
  try {
    let employeeId = req.user.employee_id;
    if (['admin', 'hr'].includes(req.user.role) && req.body.employee_id) {
      employeeId = req.body.employee_id;
    }

    if (!employeeId) {
      return res.status(400).json({ error: 'No employee account linked to this user.' });
    }

    const record = attendanceService.checkOut(employeeId, req.user);

    res.json({
      message: `Checked out successfully. Status: ${record.status}, Total hours: ${record.total_hours}h.`,
      attendance: record
    });
  } catch (err) {
    next(err);
  }
}

async function getDailyBoard(req, res, next) {
  try {
    const { date } = req.query;
    const board = attendanceService.getDailyAttendanceBoard(date);
    res.json({ board, date: date || attendanceService.getTodayDateString() });
  } catch (err) {
    next(err);
  }
}

async function getMyAttendance(req, res, next) {
  try {
    let targetEmpId = req.user.employee_id;
    if (['admin', 'hr'].includes(req.user.role) && req.query.employee_id) {
      targetEmpId = req.query.employee_id;
    }

    if (!targetEmpId) {
      return res.status(400).json({ error: 'No employee account specified.' });
    }

    const { month } = req.query;
    let sql = 'SELECT * FROM attendance WHERE employee_id = ?';
    const params = [targetEmpId];

    if (month) {
      sql += ' AND attendance_date LIKE ?';
      params.push(`${month}%`);
    }
    sql += ' ORDER BY attendance_date DESC';

    const records = query.all(sql, params);
    res.json({ records });
  } catch (err) {
    next(err);
  }
}

// Attendance Corrections
async function requestCorrection(req, res, next) {
  try {
    let employeeId = req.user.employee_id;
    if (['admin', 'hr'].includes(req.user.role) && req.body.employee_id) {
      employeeId = req.body.employee_id;
    }

    if (!employeeId) {
      return res.status(400).json({ error: 'No employee profile linked to user.' });
    }

    const { date, proposed_check_in, proposed_check_out, reason } = req.body;
    if (!date || !proposed_check_in || !proposed_check_out || !reason) {
      return res.status(400).json({ error: 'Date, proposed check-in, check-out, and reason are required.' });
    }

    // Look for existing attendance record if any
    const existingAtt = query.get('SELECT id FROM attendance WHERE employee_id = ? AND attendance_date = ?', [employeeId, date]);

    const result = query.run(`
      INSERT INTO attendance_corrections (
        attendance_id, employee_id, date, proposed_check_in, proposed_check_out, reason, status, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'), datetime('now'))
    `, [existingAtt ? existingAtt.id : null, employeeId, date, proposed_check_in, proposed_check_out, reason]);

    const created = query.get('SELECT * FROM attendance_corrections WHERE id = ?', [result.lastInsertRowid]);

    logAudit({
      actor_id: req.user.id,
      actor_name: req.user.email,
      actor_role: req.user.role,
      action: 'REQUEST_ATTENDANCE_CORRECTION',
      entity: 'AttendanceCorrection',
      entity_id: created.id,
      after_json: created
    });

    res.status(201).json({ correction: created, message: 'Attendance correction request submitted to HR.' });
  } catch (err) {
    next(err);
  }
}

async function listCorrections(req, res, next) {
  try {
    let where = 'WHERE 1=1';
    const params = [];

    if (req.user.role === 'employee') {
      where += ' AND ac.employee_id = ?';
      params.push(req.user.employee_id);
    } else if (req.query.status) {
      where += ' AND ac.status = ?';
      params.push(req.query.status);
    }

    const corrections = query.all(`
      SELECT ac.*, e.employee_code, e.first_name, e.last_name, d.name as department_name,
             u.email as reviewer_email
      FROM attendance_corrections ac
      JOIN employees e ON ac.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN users u ON ac.reviewed_by = u.id
      ${where}
      ORDER BY ac.id DESC
    `, params);

    res.json({ corrections });
  } catch (err) {
    next(err);
  }
}

async function reviewCorrection(req, res, next) {
  try {
    const { id } = req.params;
    const { status, review_comment } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: "Status must be 'approved' or 'rejected'." });
    }

    const correction = query.get('SELECT * FROM attendance_corrections WHERE id = ?', [id]);
    if (!correction) return res.status(404).json({ error: 'Correction request not found.' });
    if (correction.status !== 'pending') return res.status(400).json({ error: 'Request is already reviewed.' });

    if (status === 'approved') {
      // Calculate hours
      const [inH, inM] = correction.proposed_check_in.split(':').map(Number);
      const [outH, outM] = correction.proposed_check_out.split(':').map(Number);
      const durationHours = Math.max(0, Math.round((((outH * 60 + outM) - (inH * 60 + inM)) / 60) * 100) / 100);

      const settings = query.get('SELECT * FROM settings WHERE id = 1');
      const halfDayHours = settings ? settings.half_day_hours : 5.0;
      let finalStatus = durationHours < halfDayHours ? 'half_day' : 'present';

      // Insert or update attendance record
      if (correction.attendance_id) {
        query.run(`
          UPDATE attendance
          SET check_in = ?, check_out = ?, total_hours = ?, status = ?, source = 'correction', updated_at = datetime('now')
          WHERE id = ?
        `, [correction.proposed_check_in, correction.proposed_check_out, durationHours, finalStatus, correction.attendance_id]);
      } else {
        query.run(`
          INSERT INTO attendance (employee_id, attendance_date, check_in, check_out, total_hours, status, source, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, 'correction', datetime('now'), datetime('now'))
        `, [correction.employee_id, correction.date, correction.proposed_check_in, correction.proposed_check_out, durationHours, finalStatus]);
      }
    }

    query.run(`
      UPDATE attendance_corrections
      SET status = ?, reviewed_by = ?, review_comment = ?, updated_at = datetime('now')
      WHERE id = ?
    `, [status, req.user.id, review_comment || null, id]);

    const updated = query.get('SELECT * FROM attendance_corrections WHERE id = ?', [id]);

    // Send notification to employee
    const empUser = query.get('SELECT id FROM users WHERE employee_id = ?', [correction.employee_id]);
    if (empUser) {
      query.run(`
        INSERT INTO notifications (user_id, title, message, type, is_read, link, created_at)
        VALUES (?, ?, ?, 'attendance', 0, '/employee/attendance', datetime('now'))
      `, [
        empUser.id,
        `Attendance Correction ${status.toUpperCase()}`,
        `Your correction request for ${correction.date} has been ${status}.`
      ]);
    }

    logAudit({
      actor_id: req.user.id,
      actor_name: req.user.email,
      actor_role: req.user.role,
      action: status === 'approved' ? 'APPROVE_CORRECTION' : 'REJECT_CORRECTION',
      entity: 'AttendanceCorrection',
      entity_id: id,
      after_json: updated
    });

    res.json({ correction: updated, message: `Correction request ${status}.` });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  checkIn,
  checkOut,
  getDailyBoard,
  getMyAttendance,
  requestCorrection,
  listCorrections,
  reviewCorrection
};

const { query } = require('../config/db');
const { getDistanceInMeters } = require('../utils/haversine');
const { logAudit } = require('./audit.service');

function getTodayDateString() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

function getCurrentTimeString() {
  const now = new Date();
  return now.toTimeString().split(' ')[0]; // HH:MM:SS
}

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
}

function checkIn(employeeId, { source = 'web', lat, lng, accuracy } = {}, actor) {
  const today = getTodayDateString();
  const currentTime = getCurrentTimeString();

  // Check if already checked in today
  const existing = query.get('SELECT * FROM attendance WHERE employee_id = ? AND attendance_date = ?', [employeeId, today]);
  if (existing) {
    const error = new Error('You have already checked in for today.');
    error.status = 409;
    throw error;
  }

  // Get company settings for start time and grace
  const settings = query.get('SELECT * FROM settings WHERE id = 1');
  const officeStartMinutes = parseTimeToMinutes(settings ? settings.office_start : '09:00');
  const graceMinutes = settings ? settings.grace_minutes : 15;
  const thresholdMinutes = officeStartMinutes + graceMinutes; // e.g. 9*60 + 15 = 555 min (09:15)

  const currentMinutes = parseTimeToMinutes(currentTime);
  const status = currentMinutes > thresholdMinutes ? 'late' : 'present';

  // If source is camera, check location geofence and accuracy
  if (source === 'camera') {
    if (lat === undefined || lng === undefined) {
      const err = new Error('Location coordinates required for camera check-in.');
      err.status = 400;
      throw err;
    }
    if (accuracy && accuracy > 100) {
      const err = new Error(`GPS accuracy too low (${Math.round(accuracy)}m). Must be within 100m.`);
      err.status = 400;
      throw err;
    }
    const officeLat = settings.office_lat || 24.8607;
    const officeLng = settings.office_lng || 67.0011;
    const maxRadius = settings.office_radius_meters || 150;
    const distance = getDistanceInMeters(lat, lng, officeLat, officeLng);

    if (distance > maxRadius) {
      const err = new Error(`Outside designated office geofence. Distance: ${distance}m (Maximum allowed: ${maxRadius}m).`);
      err.status = 403;
      throw err;
    }
  }

  const result = query.run(`
    INSERT INTO attendance (employee_id, attendance_date, check_in, status, source, location_lat, location_lng, accuracy, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `, [
    employeeId,
    today,
    currentTime,
    status,
    source,
    lat || null,
    lng || null,
    accuracy || null
  ]);

  const inserted = query.get('SELECT * FROM attendance WHERE id = ?', [result.lastInsertRowid]);

  logAudit({
    actor_id: actor?.id,
    actor_name: actor?.email,
    actor_role: actor?.role,
    action: 'CHECK_IN',
    entity: 'Attendance',
    entity_id: inserted.id,
    after_json: inserted
  });

  return inserted;
}

function checkOut(employeeId, actor) {
  const today = getTodayDateString();
  const currentTime = getCurrentTimeString();

  const record = query.get('SELECT * FROM attendance WHERE employee_id = ? AND attendance_date = ?', [employeeId, today]);
  if (!record) {
    const error = new Error('No check-in record found for today. Please check in first.');
    error.status = 404;
    throw error;
  }

  if (record.check_out) {
    const error = new Error('You have already checked out for today.');
    error.status = 409;
    throw error;
  }

  // Calculate total hours
  const checkInMin = parseTimeToMinutes(record.check_in);
  const checkOutMin = parseTimeToMinutes(currentTime);
  const durationHours = Math.max(0, Math.round(((checkOutMin - checkInMin) / 60) * 100) / 100);

  const settings = query.get('SELECT * FROM settings WHERE id = 1');
  const halfDayHours = settings ? settings.half_day_hours : 5.0;

  let newStatus = record.status;
  if (durationHours < halfDayHours) {
    newStatus = 'half_day';
  }

  query.run(`
    UPDATE attendance
    SET check_out = ?, total_hours = ?, status = ?, updated_at = datetime('now')
    WHERE id = ?
  `, [currentTime, durationHours, newStatus, record.id]);

  const updated = query.get('SELECT * FROM attendance WHERE id = ?', [record.id]);

  logAudit({
    actor_id: actor?.id,
    actor_name: actor?.email,
    actor_role: actor?.role,
    action: 'CHECK_OUT',
    entity: 'Attendance',
    entity_id: updated.id,
    before_json: record,
    after_json: updated
  });

  return updated;
}

function getDailyAttendanceBoard(dateStr) {
  const date = dateStr || getTodayDateString();
  const settings = query.get('SELECT * FROM settings WHERE id = 1');
  const now = new Date();
  const isPast = date < getTodayDateString();

  // Get all active/probation employees
  const employees = query.all(`
    SELECT e.id, e.employee_code, e.first_name, e.last_name, e.email, e.gender,
           d.name as department_name, des.title as designation_title,
           a.id as attendance_id, a.check_in, a.check_out, a.total_hours, a.status, a.source,
           lr.id as leave_request_id, lt.name as leave_type_name
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN designations des ON e.designation_id = des.id
    LEFT JOIN attendance a ON a.employee_id = e.id AND a.attendance_date = ?
    LEFT JOIN leave_requests lr ON lr.employee_id = e.id AND lr.status = 'approved' AND ? BETWEEN lr.start_date AND lr.end_date
    LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
    WHERE e.employment_status IN ('active', 'probation')
    ORDER BY d.name ASC, e.first_name ASC
  `, [date, date]);

  return employees.map(emp => {
    let computedStatus = emp.status;
    if (emp.leave_request_id) {
      computedStatus = 'on_leave';
    } else if (!emp.check_in) {
      // If no check-in
      computedStatus = 'absent';
    } else if (emp.check_in && !emp.check_out && isPast) {
      computedStatus = 'missing_checkout';
    }
    return {
      ...emp,
      status: computedStatus || 'absent'
    };
  });
}

module.exports = {
  checkIn,
  checkOut,
  getDailyAttendanceBoard,
  getTodayDateString,
  getCurrentTimeString
};

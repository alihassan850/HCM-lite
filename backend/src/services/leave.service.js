const { query } = require('../config/db');
const { logAudit } = require('./audit.service');

/**
 * Check if a date string is a weekend or public holiday
 */
function isNonWorkingDay(dateObj, holidaysSet, workDaysSet) {
  // Day of week: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const dayIndex = dateObj.getDay();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayName = dayNames[dayIndex];

  if (!workDaysSet.has(dayName)) {
    return true; // Weekend / non-work day
  }

  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;

  if (holidaysSet.has(dateStr)) {
    return true; // Holiday
  }

  return false;
}

/**
 * Calculate count of working days between start_date and end_date
 */
function calculateWorkingDays(startDateStr, endDateStr) {
  const settings = query.get('SELECT * FROM settings WHERE id = 1');
  const workDays = (settings?.work_days || 'Mon,Tue,Wed,Thu,Fri').split(',').map(s => s.trim());
  const workDaysSet = new Set(workDays);

  const holidays = query.all('SELECT holiday_date FROM public_holidays');
  const holidaysSet = new Set(holidays.map(h => h.holiday_date));

  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  if (start > end) {
    throw new Error('Start date cannot be after end date.');
  }

  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    if (!isNonWorkingDay(current, holidaysSet, workDaysSet)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Get leave balance for an employee for the current year
 */
function getEmployeeLeaveBalances(employeeId) {
  const currentYear = new Date().getFullYear();
  const yearStart = `${currentYear}-01-01`;
  const yearEnd = `${currentYear}-12-31`;

  const leaveTypes = query.all('SELECT * FROM leave_types ORDER BY id ASC');

  return leaveTypes.map(lt => {
    // Sum approved leaves this year
    const approvedUsage = query.get(`
      SELECT COALESCE(SUM(days_count), 0) as used
      FROM leave_requests
      WHERE employee_id = ?
        AND leave_type_id = ?
        AND status = 'approved'
        AND start_date >= ?
        AND end_date <= ?
    `, [employeeId, lt.id, yearStart, yearEnd]);

    const pendingUsage = query.get(`
      SELECT COALESCE(SUM(days_count), 0) as pending
      FROM leave_requests
      WHERE employee_id = ?
        AND leave_type_id = ?
        AND status = 'pending'
        AND start_date >= ?
        AND end_date <= ?
    `, [employeeId, lt.id, yearStart, yearEnd]);

    const used = approvedUsage.used || 0;
    const pending = pendingUsage.pending || 0;
    const quota = lt.yearly_quota;
    const remaining = lt.code === 'unpaid' ? 9999 : Math.max(0, quota - used);

    return {
      leave_type_id: lt.id,
      name: lt.name,
      code: lt.code,
      yearly_quota: quota,
      used,
      pending,
      remaining,
      is_paid: lt.is_paid === 1
    };
  });
}

/**
 * Apply for leave with overlap and quota checks (returns 422 on conflict)
 */
function applyLeave({ employeeId, leaveTypeId, startDate, endDate, reason }, actor) {
  if (!startDate || !endDate || !leaveTypeId || !reason) {
    const err = new Error('All fields (leaveTypeId, startDate, endDate, reason) are required.');
    err.status = 400;
    throw err;
  }

  if (startDate > endDate) {
    const err = new Error('Start date cannot be after end date.');
    err.status = 422;
    throw err;
  }

  // Check overlap with pending or approved leaves
  const overlap = query.get(`
    SELECT * FROM leave_requests
    WHERE employee_id = ?
      AND status IN ('pending', 'approved')
      AND (
        (start_date <= ? AND end_date >= ?) OR
        (start_date <= ? AND end_date >= ?) OR
        (start_date >= ? AND end_date <= ?)
      )
  `, [employeeId, startDate, startDate, endDate, endDate, startDate, endDate]);

  if (overlap) {
    const err = new Error('Leave dates overlap with an existing pending or approved leave request.');
    err.status = 422;
    throw err;
  }

  // Calculate working days
  const workingDays = calculateWorkingDays(startDate, endDate);
  if (workingDays === 0) {
    const err = new Error('The selected range contains only weekends or public holidays (0 working days).');
    err.status = 422;
    throw err;
  }

  // Check quota
  const leaveType = query.get('SELECT * FROM leave_types WHERE id = ?', [leaveTypeId]);
  if (!leaveType) {
    const err = new Error('Invalid leave type specified.');
    err.status = 404;
    throw err;
  }

  if (leaveType.code !== 'unpaid') {
    const balances = getEmployeeLeaveBalances(employeeId);
    const targetBalance = balances.find(b => b.leave_type_id === Number(leaveTypeId));
    if (targetBalance && (targetBalance.remaining < workingDays)) {
      const err = new Error(`Insufficient leave balance. Requested: ${workingDays} day(s), Available: ${targetBalance.remaining} day(s).`);
      err.status = 422;
      throw err;
    }
  }

  const result = query.run(`
    INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, days_count, reason, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'), datetime('now'))
  `, [employeeId, leaveTypeId, startDate, endDate, workingDays, reason]);

  const inserted = query.get('SELECT * FROM leave_requests WHERE id = ?', [result.lastInsertRowid]);

  logAudit({
    actor_id: actor?.id,
    actor_name: actor?.email,
    actor_role: actor?.role,
    action: 'APPLY_LEAVE',
    entity: 'LeaveRequest',
    entity_id: inserted.id,
    after_json: inserted
  });

  return inserted;
}

/**
 * Approve or reject leave
 */
function reviewLeave(leaveId, { status, review_comment }, actor) {
  if (!['approved', 'rejected'].includes(status)) {
    const err = new Error("Status must be 'approved' or 'rejected'.");
    err.status = 400;
    throw err;
  }

  const existing = query.get('SELECT * FROM leave_requests WHERE id = ?', [leaveId]);
  if (!existing) {
    const err = new Error('Leave request not found.');
    err.status = 404;
    throw err;
  }

  if (existing.status !== 'pending') {
    const err = new Error(`Cannot review leave request that is already ${existing.status}.`);
    err.status = 400;
    throw err;
  }

  query.run(`
    UPDATE leave_requests
    SET status = ?, reviewed_by = ?, review_comment = ?, updated_at = datetime('now')
    WHERE id = ?
  `, [status, actor?.id || null, review_comment || null, leaveId]);

  const updated = query.get('SELECT * FROM leave_requests WHERE id = ?', [leaveId]);

  // Notify the employee's user account
  const empUser = query.get('SELECT id FROM users WHERE employee_id = ?', [existing.employee_id]);
  if (empUser) {
    query.run(`
      INSERT INTO notifications (user_id, title, message, type, is_read, link, created_at)
      VALUES (?, ?, ?, 'leave', 0, '/employee/leave', datetime('now'))
    `, [
      empUser.id,
      `Leave Request ${status.toUpperCase()}`,
      `Your leave request from ${existing.start_date} to ${existing.end_date} has been ${status}.${review_comment ? ' Comment: ' + review_comment : ''}`
    ]);
  }

  logAudit({
    actor_id: actor?.id,
    actor_name: actor?.email,
    actor_role: actor?.role,
    action: status === 'approved' ? 'APPROVE_LEAVE' : 'REJECT_LEAVE',
    entity: 'LeaveRequest',
    entity_id: leaveId,
    before_json: existing,
    after_json: updated
  });

  return updated;
}

module.exports = {
  calculateWorkingDays,
  getEmployeeLeaveBalances,
  applyLeave,
  reviewLeave
};

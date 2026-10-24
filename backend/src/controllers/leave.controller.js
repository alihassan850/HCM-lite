const { query } = require('../config/db');
const leaveService = require('../services/leave.service');
const { logAudit } = require('../services/audit.service');

async function getBalances(req, res, next) {
  try {
    let employeeId = req.user.employee_id;
    if (['admin', 'hr'].includes(req.user.role) && req.query.employee_id) {
      employeeId = req.query.employee_id;
    }

    if (!employeeId) {
      return res.status(400).json({ error: 'No employee specified or linked to this account.' });
    }

    const balances = leaveService.getEmployeeLeaveBalances(employeeId);
    res.json({ balances });
  } catch (err) {
    next(err);
  }
}

async function applyLeave(req, res, next) {
  try {
    let employeeId = req.user.employee_id;
    if (['admin', 'hr'].includes(req.user.role) && req.body.employee_id) {
      employeeId = req.body.employee_id;
    }

    if (!employeeId) {
      return res.status(400).json({ error: 'No employee account linked.' });
    }

    const { leave_type_id, start_date, end_date, reason } = req.body;
    const leave = leaveService.applyLeave({
      employeeId,
      leaveTypeId: leave_type_id,
      startDate: start_date,
      endDate: end_date,
      reason
    }, req.user);

    res.status(201).json({
      leave,
      message: `Leave application for ${leave.days_count} working day(s) submitted successfully.`
    });
  } catch (err) {
    next(err);
  }
}

async function listRequests(req, res, next) {
  try {
    let where = 'WHERE 1=1';
    const params = [];

    if (req.user.role === 'employee') {
      where += ' AND lr.employee_id = ?';
      params.push(req.user.employee_id);
    } else {
      if (req.query.status) {
        where += ' AND lr.status = ?';
        params.push(req.query.status);
      }
      if (req.query.department_id) {
        where += ' AND e.department_id = ?';
        params.push(req.query.department_id);
      }
    }

    const requests = query.all(`
      SELECT lr.*, lt.name as leave_type_name, lt.code as leave_type_code,
             e.employee_code, e.first_name, e.last_name, d.name as department_name,
             u.email as reviewer_email
      FROM leave_requests lr
      JOIN leave_types lt ON lr.leave_type_id = lt.id
      JOIN employees e ON lr.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN users u ON lr.reviewed_by = u.id
      ${where}
      ORDER BY lr.id DESC
    `, params);

    res.json({ requests });
  } catch (err) {
    next(err);
  }
}

async function reviewRequest(req, res, next) {
  try {
    const { id } = req.params;
    const { status, review_comment } = req.body;

    const reviewed = leaveService.reviewLeave(id, { status, review_comment }, req.user);
    res.json({ leave: reviewed, message: `Leave request has been ${status}.` });
  } catch (err) {
    next(err);
  }
}

async function cancelRequest(req, res, next) {
  try {
    const { id } = req.params;
    const existing = query.get('SELECT * FROM leave_requests WHERE id = ?', [id]);

    if (!existing) return res.status(404).json({ error: 'Leave request not found.' });

    if (req.user.role === 'employee' && Number(existing.employee_id) !== Number(req.user.employee_id)) {
      return res.status(403).json({ error: 'You can only cancel your own leave requests.' });
    }

    if (existing.status !== 'pending') {
      return res.status(400).json({ error: `Cannot cancel a leave request that is already ${existing.status}.` });
    }

    query.run("UPDATE leave_requests SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?", [id]);
    const updated = query.get('SELECT * FROM leave_requests WHERE id = ?', [id]);

    logAudit({
      actor_id: req.user.id,
      actor_name: req.user.email,
      actor_role: req.user.role,
      action: 'CANCEL_LEAVE',
      entity: 'LeaveRequest',
      entity_id: id,
      before_json: existing,
      after_json: updated
    });

    res.json({ leave: updated, message: 'Leave request cancelled successfully.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getBalances,
  applyLeave,
  listRequests,
  reviewRequest,
  cancelRequest
};

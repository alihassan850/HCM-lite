const analyticsService = require('../services/analytics.service');

async function getAdminData(req, res, next) {
  try {
    const { department_id, start_date, end_date } = req.query;
    const data = analyticsService.getAdminAnalytics({ department_id, start_date, end_date });
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function getHrData(req, res, next) {
  try {
    const { department_id, start_date, end_date } = req.query;
    const data = analyticsService.getHrAnalytics({ department_id, start_date, end_date });
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function getEmployeeData(req, res, next) {
  try {
    let employeeId = req.user.employee_id;
    if (['admin', 'hr'].includes(req.user.role) && req.query.employee_id) {
      employeeId = req.query.employee_id;
    }

    if (!employeeId) {
      return res.status(400).json({ error: 'No employee account linked.' });
    }

    const data = analyticsService.getEmployeeDashboardData(employeeId);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAdminData,
  getHrData,
  getEmployeeData
};

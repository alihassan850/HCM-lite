const { query } = require('../config/db');
const payrollService = require('../services/payroll.service');
const { generatePayslipPDF } = require('../services/pdf.service');

async function listPayrollRuns(req, res, next) {
  try {
    const runs = query.all(`
      SELECT pr.*, u1.email as creator_email, u2.email as finalizer_email
      FROM payroll_runs pr
      LEFT JOIN users u1 ON pr.created_by = u1.id
      LEFT JOIN users u2 ON pr.finalized_by = u2.id
      ORDER BY pr.year_month DESC
    `);
    res.json({ runs });
  } catch (err) {
    next(err);
  }
}

async function createPayrollDraft(req, res, next) {
  try {
    const { year_month } = req.body;
    if (!year_month || !/^\d{4}-\d{2}$/.test(year_month)) {
      return res.status(400).json({ error: "A valid year_month parameter is required (format: 'YYYY-MM')." });
    }

    const run = payrollService.generateMonthlyPayrollDraft(year_month, req.user);
    res.status(201).json({
      run,
      message: `Draft payroll for ${year_month} compiled successfully.`
    });
  } catch (err) {
    next(err);
  }
}

async function finalizePayroll(req, res, next) {
  try {
    const { id } = req.params;
    const finalized = payrollService.finalizePayrollRun(id, req.user);
    res.json({
      run: finalized,
      message: `Payroll run for ${finalized.year_month} has been locked and finalized.`
    });
  } catch (err) {
    next(err);
  }
}

async function getRunPayslips(req, res, next) {
  try {
    const { id } = req.params;
    const payslips = query.all(`
      SELECT p.*, e.employee_code, e.first_name, e.last_name, e.email,
             d.name as department_name, des.title as designation_title
      FROM payslips p
      JOIN employees e ON p.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN designations des ON e.designation_id = des.id
      WHERE p.payroll_run_id = ?
      ORDER BY e.employee_code ASC
    `, [id]);

    res.json({ payslips });
  } catch (err) {
    next(err);
  }
}

async function getMyPayslips(req, res, next) {
  try {
    let employeeId = req.user.employee_id;
    if (['admin', 'hr'].includes(req.user.role) && req.query.employee_id) {
      employeeId = req.query.employee_id;
    }

    if (!employeeId) {
      return res.status(400).json({ error: 'No employee account associated with user.' });
    }

    const payslips = query.all(`
      SELECT p.*, pr.year_month, pr.status as run_status
      FROM payslips p
      JOIN payroll_runs pr ON p.payroll_run_id = pr.id
      WHERE p.employee_id = ? AND pr.status = 'finalized'
      ORDER BY pr.year_month DESC
    `, [employeeId]);

    res.json({ payslips });
  } catch (err) {
    next(err);
  }
}

async function downloadPayslipPdf(req, res, next) {
  try {
    const { id } = req.params;

    const payslip = query.get(`
      SELECT p.*, pr.year_month,
             e.employee_code, e.first_name, e.last_name, e.email, e.joining_date,
             d.name as department_name, des.title as designation_title
      FROM payslips p
      JOIN payroll_runs pr ON p.payroll_run_id = pr.id
      JOIN employees e ON p.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN designations des ON e.designation_id = des.id
      WHERE p.id = ?
    `, [id]);

    if (!payslip) {
      return res.status(404).json({ error: 'Payslip record not found.' });
    }

    // RBAC: Employee can only download their own payslip
    if (req.user.role === 'employee' && Number(req.user.employee_id) !== Number(payslip.employee_id)) {
      return res.status(403).json({ error: 'You are only authorized to download your own payslip.' });
    }

    const settings = query.get('SELECT * FROM settings WHERE id = 1');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Payslip_${payslip.employee_code}_${payslip.year_month}.pdf"`);

    generatePayslipPDF(payslip, settings, res);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listPayrollRuns,
  createPayrollDraft,
  finalizePayroll,
  getRunPayslips,
  getMyPayslips,
  downloadPayslipPdf
};

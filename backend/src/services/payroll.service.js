const { query } = require('../config/db');
const { calculateMonthlyTax } = require('../utils/taxCalculator');
const { calculateWorkingDays } = require('./leave.service');
const { logAudit } = require('./audit.service');

/**
 * Get start and end date for a month string 'YYYY-MM'
 */
function getMonthDateRange(yearMonth) {
  const [y, m] = yearMonth.split('-').map(Number);
  const startDate = `${yearMonth}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const endDate = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;
  return { startDate, endDate, lastDay };
}

/**
 * Generate or recalculate payroll draft for a month
 */
function generateMonthlyPayrollDraft(yearMonth, actor) {
  // Check if run already exists
  const existingRun = query.get('SELECT * FROM payroll_runs WHERE year_month = ?', [yearMonth]);
  if (existingRun && existingRun.status === 'finalized') {
    const err = new Error(`Payroll for ${yearMonth} is finalized and locked. It cannot be regenerated.`);
    err.status = 403;
    throw err;
  }

  const { startDate, endDate } = getMonthDateRange(yearMonth);
  const totalMonthWorkingDays = calculateWorkingDays(startDate, endDate);

  if (totalMonthWorkingDays === 0) {
    const err = new Error('No working days found in this month.');
    err.status = 400;
    throw err;
  }

  // Get all employees who were active at any point during this month
  const employees = query.all(`
    SELECT e.*, d.name as department_name, des.title as designation_title
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN designations des ON e.designation_id = des.id
    WHERE e.joining_date <= ?
      AND (e.exit_date IS NULL OR e.exit_date >= ?)
  `, [endDate, startDate]);

  let runId;
  if (existingRun) {
    runId = existingRun.id;
    // Clear previous draft payslips
    query.run('DELETE FROM payslips WHERE payroll_run_id = ?', [runId]);
  } else {
    const runResult = query.run(`
      INSERT INTO payroll_runs (year_month, working_days, status, created_by, created_at, updated_at)
      VALUES (?, ?, 'draft', ?, datetime('now'), datetime('now'))
    `, [yearMonth, totalMonthWorkingDays, actor?.id || null]);
    runId = runResult.lastInsertRowid;
  }

  let totalGross = 0;
  let totalDeductions = 0;
  let totalTax = 0;
  let totalNet = 0;

  for (const emp of employees) {
    // Basic, HRA (40%), Medical (10%), Gross = 1.5 * Basic
    const basic = Number(emp.basic_salary) || 0;
    const hra = Math.round(basic * 0.40 * 100) / 100;
    const medical = Math.round(basic * 0.10 * 100) / 100;
    let gross = Math.round((basic + hra + medical) * 100) / 100;

    // Proration for joiner / leaver
    let empExpectedWorkingDays = totalMonthWorkingDays;
    const empJoinDate = emp.joining_date > startDate ? emp.joining_date : startDate;
    const empExitDate = emp.exit_date && emp.exit_date < endDate ? emp.exit_date : endDate;

    if (empJoinDate > startDate || empExitDate < endDate) {
      empExpectedWorkingDays = calculateWorkingDays(empJoinDate, empExitDate);
      if (totalMonthWorkingDays > 0) {
        gross = Math.round((gross * (empExpectedWorkingDays / totalMonthWorkingDays)) * 100) / 100;
      }
    }

    const perDayRate = totalMonthWorkingDays > 0 ? (gross / totalMonthWorkingDays) : 0;

    // Aggregate attendance for this employee in this month
    const attendanceRecords = query.all(`
      SELECT status, total_hours
      FROM attendance
      WHERE employee_id = ?
        AND attendance_date >= ?
        AND attendance_date <= ?
    `, [emp.id, empJoinDate, empExitDate]);

    let daysPresent = 0;
    let lateCount = 0;
    let daysHalf = 0;

    attendanceRecords.forEach(att => {
      if (att.status === 'present') daysPresent++;
      else if (att.status === 'late') {
        daysPresent++;
        lateCount++;
      } else if (att.status === 'half_day') {
        daysHalf++;
      }
    });

    // Approved leaves in this month
    const approvedLeaves = query.all(`
      SELECT lr.start_date, lr.end_date, lt.code, lt.is_paid
      FROM leave_requests lr
      JOIN leave_types lt ON lr.leave_type_id = lt.id
      WHERE lr.employee_id = ?
        AND lr.status = 'approved'
        AND lr.start_date <= ?
        AND lr.end_date >= ?
    `, [emp.id, empExitDate, empJoinDate]);

    let approvedPaidDays = 0;
    let unpaidLeaveDays = 0;

    approvedLeaves.forEach(lv => {
      const effStart = lv.start_date < empJoinDate ? empJoinDate : lv.start_date;
      const effEnd = lv.end_date > empExitDate ? empExitDate : lv.end_date;
      const wDays = calculateWorkingDays(effStart, effEnd);
      if (lv.code === 'unpaid' || lv.is_paid === 0) {
        unpaidLeaveDays += wDays;
      } else {
        approvedPaidDays += wDays;
      }
    });

    // Absent days = Expected working days - (days present + half days + approved paid leaves + unpaid leaves)
    const accountedDays = daysPresent + (daysHalf * 0.5) + approvedPaidDays + unpaidLeaveDays;
    const daysAbsent = Math.max(0, empExpectedWorkingDays - (daysPresent + daysHalf + approvedPaidDays + unpaidLeaveDays));

    // Bonus late penalty rule: 3 lates = 0.5 day
    const latePenaltyDays = Math.floor(lateCount / 3) * 0.5;

    // Deductions calculation
    const deductionAmount = Math.round((
      (daysAbsent * perDayRate) +
      (unpaidLeaveDays * perDayRate) +
      (daysHalf * 0.5 * perDayRate) +
      (latePenaltyDays * perDayRate)
    ) * 100) / 100;

    const taxableIncome = Math.max(0, gross - deductionAmount);
    const incomeTax = calculateMonthlyTax(taxableIncome);
    const netSalary = Math.max(0, Math.round((gross - deductionAmount - incomeTax) * 100) / 100);

    query.run(`
      INSERT INTO payslips (
        payroll_run_id, employee_id, working_days, days_present, days_absent, days_half,
        days_unpaid_leave, late_count, late_penalty_days, basic_salary, hra, medical_allowance,
        gross_salary, deductions, taxable_income, income_tax, net_salary, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
      runId, emp.id, empExpectedWorkingDays, daysPresent, daysAbsent, daysHalf,
      unpaidLeaveDays, lateCount, latePenaltyDays, basic, hra, medical,
      gross, deductionAmount, taxableIncome, incomeTax, netSalary
    ]);

    totalGross += gross;
    totalDeductions += deductionAmount;
    totalTax += incomeTax;
    totalNet += netSalary;
  }

  query.run(`
    UPDATE payroll_runs
    SET total_gross = ?, total_deductions = ?, total_tax = ?, total_net = ?, updated_at = datetime('now')
    WHERE id = ?
  `, [
    Math.round(totalGross * 100) / 100,
    Math.round(totalDeductions * 100) / 100,
    Math.round(totalTax * 100) / 100,
    Math.round(totalNet * 100) / 100,
    runId
  ]);

  const updatedRun = query.get('SELECT * FROM payroll_runs WHERE id = ?', [runId]);

  logAudit({
    actor_id: actor?.id,
    actor_name: actor?.email,
    actor_role: actor?.role,
    action: 'DRAFT_PAYROLL',
    entity: 'PayrollRun',
    entity_id: runId,
    after_json: updatedRun
  });

  return updatedRun;
}

/**
 * Finalize payroll run (Admin only)
 */
function finalizePayrollRun(payrollRunId, actor) {
  const run = query.get('SELECT * FROM payroll_runs WHERE id = ?', [payrollRunId]);
  if (!run) {
    const err = new Error('Payroll run not found.');
    err.status = 404;
    throw err;
  }

  if (run.status === 'finalized') {
    const err = new Error('This payroll run is already finalized and locked.');
    err.status = 400;
    throw err;
  }

  query.run(`
    UPDATE payroll_runs
    SET status = 'finalized', finalized_by = ?, finalized_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `, [actor?.id || null, payrollRunId]);

  // Send notifications to all employees who have payslips in this run
  const payslips = query.all('SELECT employee_id FROM payslips WHERE payroll_run_id = ?', [payrollRunId]);
  for (const p of payslips) {
    const empUser = query.get('SELECT id FROM users WHERE employee_id = ?', [p.employee_id]);
    if (empUser) {
      query.run(`
        INSERT INTO notifications (user_id, title, message, type, is_read, link, created_at)
        VALUES (?, ?, ?, 'payroll', 0, '/employee/payslips', datetime('now'))
      `, [
        empUser.id,
        'Payslip Published',
        `Your payslip for ${run.year_month} is now finalized and ready for download.`
      ]);
    }
  }

  const finalized = query.get('SELECT * FROM payroll_runs WHERE id = ?', [payrollRunId]);

  logAudit({
    actor_id: actor?.id,
    actor_name: actor?.email,
    actor_role: actor?.role,
    action: 'FINALIZE_PAYROLL',
    entity: 'PayrollRun',
    entity_id: payrollRunId,
    before_json: run,
    after_json: finalized
  });

  return finalized;
}

module.exports = {
  generateMonthlyPayrollDraft,
  finalizePayrollRun,
  getMonthDateRange
};

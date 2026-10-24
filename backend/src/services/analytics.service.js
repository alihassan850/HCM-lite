const { query } = require('../config/db');
const { getTodayDateString } = require('./attendance.service');
const { calculateWorkingDays } = require('./leave.service');

function getAdminAnalytics({ department_id, start_date, end_date } = {}) {
  const today = getTodayDateString();
  const currentYear = today.substring(0, 4);
  const ytdStart = `${currentYear}-01-01`;

  // 1. Headcount (Active + Probation)
  let headcountSql = "SELECT COUNT(*) as count FROM employees WHERE employment_status IN ('active', 'probation')";
  const headcountParams = [];
  if (department_id) {
    headcountSql += " AND department_id = ?";
    headcountParams.push(department_id);
  }
  const headcount = query.get(headcountSql, headcountParams).count;

  // 2. Exits YTD & Attrition YTD
  let exitsSql = "SELECT COUNT(*) as count FROM employees WHERE employment_status IN ('resigned', 'terminated') AND exit_date >= ?";
  const exitsParams = [ytdStart];
  if (department_id) {
    exitsSql += " AND department_id = ?";
    exitsParams.push(department_id);
  }
  const exitsYtd = query.get(exitsSql, exitsParams).count;
  const avgHeadcount = headcount + (exitsYtd / 2) || 1;
  const attritionYtd = Math.round((exitsYtd / avgHeadcount) * 1000) / 10; // e.g. 5.2%

  // 3. Payroll Cost (latest finalized run or all runs)
  const latestRun = query.get("SELECT * FROM payroll_runs ORDER BY year_month DESC LIMIT 1");
  const payrollCost = latestRun ? latestRun.total_gross : 0;
  const netPayrollCost = latestRun ? latestRun.total_net : 0;

  // 4. Average Salary (mean gross of active employees)
  let avgSalarySql = "SELECT COALESCE(AVG(gross_salary), 0) as avg_sal FROM employees WHERE employment_status IN ('active', 'probation')";
  const avgSalaryParams = [];
  if (department_id) {
    avgSalarySql += " AND department_id = ?";
    avgSalaryParams.push(department_id);
  }
  const avgSalary = Math.round(query.get(avgSalarySql, avgSalaryParams).avg_sal);

  // 5. Headcount by Department
  const deptHeadcounts = query.all(`
    SELECT d.id, d.name, COUNT(e.id) as headcount
    FROM departments d
    LEFT JOIN employees e ON e.department_id = d.id AND e.employment_status IN ('active', 'probation')
    GROUP BY d.id, d.name
    ORDER BY headcount DESC
  `);

  // 6. Payroll Cost by Department
  const deptPayroll = query.all(`
    SELECT d.id, d.name, COALESCE(SUM(e.gross_salary), 0) as total_gross
    FROM departments d
    LEFT JOIN employees e ON e.department_id = d.id AND e.employment_status IN ('active', 'probation')
    GROUP BY d.id, d.name
    ORDER BY total_gross DESC
  `);

  // 7. Gender & Tenure Breakdown
  const genderBreakdown = query.all(`
    SELECT COALESCE(gender, 'Unspecified') as gender, COUNT(*) as count
    FROM employees
    WHERE employment_status IN ('active', 'probation')
    GROUP BY gender
  `);

  const employees = query.all("SELECT joining_date FROM employees WHERE employment_status IN ('active', 'probation')");
  const tenureBands = { '< 1 Year': 0, '1 - 3 Years': 0, '3 - 5 Years': 0, '5+ Years': 0 };
  const nowDate = new Date();

  employees.forEach(e => {
    if (e.joining_date) {
      const years = (nowDate - new Date(e.joining_date)) / (1000 * 60 * 60 * 24 * 365.25);
      if (years < 1) tenureBands['< 1 Year']++;
      else if (years < 3) tenureBands['1 - 3 Years']++;
      else if (years < 5) tenureBands['3 - 5 Years']++;
      else tenureBands['5+ Years']++;
    }
  });

  const tenureBreakdown = Object.entries(tenureBands).map(([band, count]) => ({ band, count }));

  // 8. Recent Audit Feed
  const recentAudits = query.all(`
    SELECT id, actor_name, actor_role, action, entity, entity_id, created_at
    FROM audit_logs
    ORDER BY id DESC
    LIMIT 10
  `);

  return {
    kpis: {
      headcount,
      attrition_ytd: attritionYtd,
      payroll_cost: payrollCost,
      net_payroll_cost: netPayrollCost,
      average_salary: avgSalary,
      exits_ytd: exitsYtd
    },
    headcount_by_department: deptHeadcounts,
    payroll_by_department: deptPayroll,
    gender_breakdown: genderBreakdown,
    tenure_breakdown: tenureBreakdown,
    recent_audits: recentAudits
  };
}

function getHrAnalytics({ department_id, start_date, end_date } = {}) {
  const today = getTodayDateString();

  // Headcount
  let empSql = "SELECT id, department_id FROM employees WHERE employment_status IN ('active', 'probation')";
  const empParams = [];
  if (department_id) {
    empSql += " AND department_id = ?";
    empParams.push(department_id);
  }
  const activeEmps = query.all(empSql, empParams);
  const headcount = activeEmps.length;
  const empIds = activeEmps.map(e => e.id);

  // Present, Late, Half-day today
  let presentToday = 0;
  let lateToday = 0;
  let halfDayToday = 0;

  if (empIds.length > 0) {
    const placeholders = empIds.map(() => '?').join(',');
    const attToday = query.all(`
      SELECT status, COUNT(*) as cnt
      FROM attendance
      WHERE attendance_date = ? AND employee_id IN (${placeholders})
      GROUP BY status
    `, [today, ...empIds]);

    attToday.forEach(row => {
      if (row.status === 'present') presentToday += row.cnt;
      if (row.status === 'late') {
        presentToday += row.cnt; // late also counts as present for day
        lateToday += row.cnt;
      }
      if (row.status === 'half_day') halfDayToday += row.cnt;
    });
  }

  // On leave today
  let onLeaveToday = 0;
  if (empIds.length > 0) {
    const placeholders = empIds.map(() => '?').join(',');
    const leavesToday = query.get(`
      SELECT COUNT(DISTINCT employee_id) as cnt
      FROM leave_requests
      WHERE status = 'approved'
        AND ? BETWEEN start_date AND end_date
        AND employee_id IN (${placeholders})
    `, [today, ...empIds]);
    onLeaveToday = leavesToday.cnt || 0;
  }

  // Pending Approvals
  const pendingLeaves = query.get("SELECT COUNT(*) as count FROM leave_requests WHERE status = 'pending'").count;
  const pendingCorrections = query.get("SELECT COUNT(*) as count FROM attendance_corrections WHERE status = 'pending'").count;
  const pendingApprovals = pendingLeaves + pendingCorrections;

  // Attendance Trend (Last 14 days)
  const trendDays = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    trendDays.push(d.toISOString().split('T')[0]);
  }

  const attendanceTrend = trendDays.map(dateStr => {
    let pres = 0;
    let late = 0;
    let absent = 0;

    if (empIds.length > 0) {
      const placeholders = empIds.map(() => '?').join(',');
      const records = query.all(`
        SELECT status, COUNT(*) as count
        FROM attendance
        WHERE attendance_date = ? AND employee_id IN (${placeholders})
        GROUP BY status
      `, [dateStr, ...empIds]);

      records.forEach(r => {
        if (r.status === 'present') pres += r.count;
        if (r.status === 'late') late += r.count;
      });

      // check how many employees were on leave on that date
      const leavesCount = query.get(`
        SELECT COUNT(DISTINCT employee_id) as count
        FROM leave_requests
        WHERE status = 'approved' AND ? BETWEEN start_date AND end_date AND employee_id IN (${placeholders})
      `, [dateStr, ...empIds]).count;

      const totalActive = empIds.length;
      absent = Math.max(0, totalActive - (pres + late + leavesCount));
    }

    return {
      date: dateStr.substring(5), // MM-DD
      full_date: dateStr,
      present: pres + late,
      late,
      absent
    };
  });

  // Top 5 Late-comers this month
  const currentMonth = today.substring(0, 7);
  const topLateComers = query.all(`
    SELECT e.id, e.employee_code, e.first_name, e.last_name, d.name as department_name, COUNT(a.id) as late_count
    FROM attendance a
    JOIN employees e ON a.employee_id = e.id
    LEFT JOIN departments d ON e.department_id = d.id
    WHERE a.status = 'late' AND a.attendance_date LIKE ?
    GROUP BY e.id, e.employee_code, e.first_name, e.last_name, d.name
    ORDER BY late_count DESC
    LIMIT 5
  `, [`${currentMonth}%`]);

  // Leave Usage by Type
  const currentYear = today.substring(0, 4);
  const leaveByType = query.all(`
    SELECT lt.name, COALESCE(SUM(lr.days_count), 0) as days_used
    FROM leave_types lt
    LEFT JOIN leave_requests lr ON lr.leave_type_id = lt.id AND lr.status = 'approved' AND lr.start_date LIKE ?
    GROUP BY lt.id, lt.name
  `, [`${currentYear}%`]);

  // Absenteeism by Department
  const deptAbsenteeism = query.all(`
    SELECT d.id, d.name,
           COUNT(DISTINCT e.id) as total_employees,
           COALESCE(SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END), 0) as total_lates
    FROM departments d
    LEFT JOIN employees e ON e.department_id = d.id AND e.employment_status IN ('active', 'probation')
    LEFT JOIN attendance a ON a.employee_id = e.id AND a.attendance_date LIKE ?
    GROUP BY d.id, d.name
  `, [`${currentMonth}%`]);

  return {
    kpis: {
      headcount,
      present_today: presentToday,
      on_leave_today: onLeaveToday,
      late_today: lateToday,
      pending_approvals: pendingApprovals
    },
    attendance_trend: attendanceTrend,
    top_late_comers: topLateComers,
    leave_by_type: leaveByType,
    dept_absenteeism: deptAbsenteeism
  };
}

function getEmployeeDashboardData(employeeId) {
  const today = getTodayDateString();

  // 1. Today's attendance
  const todayAtt = query.get('SELECT * FROM attendance WHERE employee_id = ? AND attendance_date = ?', [employeeId, today]);

  // 2. Hours this week vs 40h
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 is Sunday
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  const mondayStr = monday.toISOString().split('T')[0];

  const weekHoursRow = query.get(`
    SELECT COALESCE(SUM(total_hours), 0) as total_hours
    FROM attendance
    WHERE employee_id = ? AND attendance_date >= ? AND attendance_date <= ?
  `, [employeeId, mondayStr, today]);

  const hoursThisWeek = Math.round((weekHoursRow?.total_hours || 0) * 10) / 10;

  // 3. Late count this month
  const currentMonth = today.substring(0, 7);
  const lateCountRow = query.get(`
    SELECT COUNT(*) as late_count
    FROM attendance
    WHERE employee_id = ? AND status = 'late' AND attendance_date LIKE ?
  `, [employeeId, `${currentMonth}%`]);
  const lateCount = lateCountRow?.late_count || 0;

  // 4. Leave balances
  const { getEmployeeLeaveBalances } = require('./leave.service');
  const leaveBalances = getEmployeeLeaveBalances(employeeId);

  // 5. Last payslip
  const lastPayslip = query.get(`
    SELECT p.*, pr.year_month
    FROM payslips p
    JOIN payroll_runs pr ON p.payroll_run_id = pr.id
    WHERE p.employee_id = ? AND pr.status = 'finalized'
    ORDER BY pr.year_month DESC
    LIMIT 1
  `, [employeeId]);

  // 6. Recent announcements
  const announcements = query.all(`
    SELECT id, title, content, priority, created_at
    FROM announcements
    WHERE target_role IN ('all', 'employee')
    ORDER BY id DESC
    LIMIT 5
  `);

  return {
    today_attendance: todayAtt,
    hours_this_week: hoursThisWeek,
    hours_target: 40,
    late_count_month: lateCount,
    leave_balances: leaveBalances,
    last_payslip: lastPayslip,
    announcements
  };
}

module.exports = {
  getAdminAnalytics,
  getHrAnalytics,
  getEmployeeDashboardData
};

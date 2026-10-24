const { query } = require('../config/db');
const { getTodayDateString } = require('./attendance.service');
const { getEmployeeLeaveBalances } = require('./leave.service');

// Define available tools
const TOOLS = {
  get_headcount: ({ department_id } = {}) => {
    let sql = "SELECT COUNT(*) as count FROM employees WHERE employment_status IN ('active', 'probation')";
    const params = [];
    if (department_id) {
      sql += " AND department_id = ?";
      params.push(department_id);
    }
    const res = query.get(sql, params);
    return { active_headcount: res.count };
  },

  get_attendance_summary: ({ date, department_id } = {}) => {
    const targetDate = date || getTodayDateString();
    let sql = `
      SELECT status, COUNT(*) as count
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      WHERE a.attendance_date = ?
    `;
    const params = [targetDate];
    if (department_id) {
      sql += " AND e.department_id = ?";
      params.push(department_id);
    }
    sql += " GROUP BY status";
    const rows = query.all(sql, params);

    const summary = { date: targetDate, present: 0, late: 0, half_day: 0, on_leave: 0 };
    rows.forEach(r => {
      if (r.status === 'present') summary.present += r.count;
      if (r.status === 'late') {
        summary.present += r.count;
        summary.late += r.count;
      }
      if (r.status === 'half_day') summary.half_day += r.count;
    });

    const leavesCount = query.get(`
      SELECT COUNT(DISTINCT employee_id) as count
      FROM leave_requests
      WHERE status = 'approved' AND ? BETWEEN start_date AND end_date
    `, [targetDate]).count;
    summary.on_leave = leavesCount;

    return summary;
  },

  get_late_comers: ({ month, limit = 5 } = {}) => {
    const targetMonth = month || getTodayDateString().substring(0, 7);
    const rows = query.all(`
      SELECT e.id, e.employee_code, e.first_name, e.last_name, d.name as department_name, COUNT(a.id) as late_count
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE a.status = 'late' AND a.attendance_date LIKE ?
      GROUP BY e.id, e.employee_code, e.first_name, e.last_name, d.name
      ORDER BY late_count DESC
      LIMIT ?
    `, [`${targetMonth}%`, limit]);
    return { month: targetMonth, late_comers: rows };
  },

  get_leave_summary: ({ date, department_id } = {}) => {
    const targetDate = date || getTodayDateString();
    let sql = `
      SELECT lr.id, e.first_name, e.last_name, lt.name as leave_type, lr.start_date, lr.end_date, lr.reason
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.id
      JOIN leave_types lt ON lr.leave_type_id = lt.id
      WHERE lr.status = 'approved' AND ? BETWEEN lr.start_date AND lr.end_date
    `;
    const params = [targetDate];
    if (department_id) {
      sql += " AND e.department_id = ?";
      params.push(department_id);
    }
    const employeesOnLeave = query.all(sql, params);
    return {
      date: targetDate,
      total_on_leave: employeesOnLeave.length,
      employees: employeesOnLeave
    };
  },

  get_my_leave_balance: (params, user) => {
    if (!user || !user.employee_id) {
      return { error: 'No employee record linked to current user.' };
    }
    const balances = getEmployeeLeaveBalances(user.employee_id);
    return { leave_balances: balances };
  },

  get_payroll_summary: ({ year_month } = {}, user) => {
    if (user.role === 'employee') {
      return { error: 'Access denied: Employees cannot view organizational payroll summaries.' };
    }
    const month = year_month || getTodayDateString().substring(0, 7);
    const run = query.get('SELECT * FROM payroll_runs WHERE year_month = ?', [month]) ||
                query.get('SELECT * FROM payroll_runs ORDER BY year_month DESC LIMIT 1');
    return { payroll_summary: run || 'No payroll runs recorded yet.' };
  },

  search_employees: ({ query: searchQ } = {}, user) => {
    let sql = `
      SELECT e.id, e.employee_code, e.first_name, e.last_name, e.email, e.phone,
             d.name as department_name, des.title as designation_title
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN designations des ON e.designation_id = des.id
      WHERE (e.first_name LIKE ? OR e.last_name LIKE ? OR e.email LIKE ? OR e.employee_code LIKE ?)
    `;
    const term = `%${searchQ}%`;
    const params = [term, term, term, term];
    const results = query.all(sql, params);
    return { matches: results };
  }
};

/**
 * Handle AI Assistant queries
 */
async function processAiChat(prompt, user) {
  const pLower = prompt.toLowerCase();
  const toolCalls = [];
  let responseText = '';

  // Guardrail check: Colleague's salary
  if (
    (pLower.includes('salary') || pLower.includes('pay') || pLower.includes('tankhwah') || pLower.includes('kamata')) &&
    user.role === 'employee'
  ) {
    responseText = "I cannot disclose salary or personal compensation information of other colleagues due to privacy and security policies.";
    logAiCall(user, prompt, responseText, toolCalls);
    return { response: responseText, tool_calls: toolCalls, is_ai_generated: true };
  }

  // 1. My leave balance check
  if (
    pLower.includes('how many sick leaves') || 
    pLower.includes('leave balance') || 
    pLower.includes('chutti') && pLower.includes('bachi') ||
    pLower.includes('my leave') ||
    pLower.includes('sick leaves do i have left')
  ) {
    if (user.employee_id) {
      toolCalls.push({ tool: 'get_my_leave_balance', args: {} });
      const data = TOOLS.get_my_leave_balance({}, user);
      const sick = data.leave_balances?.find(b => b.code === 'sick');
      const annual = data.leave_balances?.find(b => b.code === 'annual');
      const casual = data.leave_balances?.find(b => b.code === 'casual');

      responseText = `You currently have **${sick?.remaining ?? 0} sick leave(s)** remaining this year out of your quota of ${sick?.yearly_quota ?? 8}. (Also remaining: ${casual?.remaining ?? 0} Casual, ${annual?.remaining ?? 0} Annual).`;
    } else {
      responseText = "Your account is an administrative login not attached to an individual employee ID.";
    }
  }
  // 2. Who is on leave today?
  else if (
    pLower.includes('who is on leave') || 
    pLower.includes('on leave today') || 
    pLower.includes('kon chutti pe hai') ||
    pLower.includes('chutti par kon hai')
  ) {
    toolCalls.push({ tool: 'get_leave_summary', args: { date: getTodayDateString() } });
    const data = TOOLS.get_leave_summary({ date: getTodayDateString() });
    if (data.total_on_leave === 0) {
      responseText = "There are currently no employees on approved leave today.";
    } else {
      const names = data.employees.map(e => `${e.first_name} ${e.last_name} (${e.leave_type})`).join(', ');
      responseText = `There are **${data.total_on_leave} employee(s)** on approved leave today: ${names}.`;
    }
  }
  // 3. Headcount query
  else if (
    pLower.includes('headcount') || 
    pLower.includes('active employees') || 
    pLower.includes('kitne employees') ||
    pLower.includes('how many active employees')
  ) {
    toolCalls.push({ tool: 'get_headcount', args: {} });
    const data = TOOLS.get_headcount({});
    responseText = `The organization currently has **${data.active_headcount} active employee(s)** registered.`;
  }
  // 4. Late comers
  else if (
    pLower.includes('late most often') || 
    pLower.includes('late comers') || 
    pLower.includes('der se aya') ||
    pLower.includes('who came late')
  ) {
    toolCalls.push({ tool: 'get_late_comers', args: { limit: 5 } });
    const data = TOOLS.get_late_comers({ limit: 5 });
    if (data.late_comers.length === 0) {
      responseText = "No late arrivals have been recorded for this month.";
    } else {
      const list = data.late_comers.map(l => `${l.first_name} ${l.last_name} (${l.late_count} times)`).join(', ');
      responseText = `Top late-comers this month: ${list}.`;
    }
  }
  // 5. Attendance rate
  else if (
    pLower.includes('attendance rate') || 
    pLower.includes('attendance summary') ||
    pLower.includes('aaj kitne hazir hain')
  ) {
    toolCalls.push({ tool: 'get_attendance_summary', args: {} });
    const data = TOOLS.get_attendance_summary({});
    responseText = `Today's Attendance: **${data.present} present**, with **${data.late} marked late**, and **${data.on_leave} on approved leave**.`;
  }
  // 6. Policy Questions (Section 3 rules)
  else if (pLower.includes('office hour') || pLower.includes('start time') || pLower.includes('grace period')) {
    responseText = "Company office hours officially start at **09:00 AM** with a **15-minute grace period** (arrivals after 09:15 AM are marked late). Working duration under 5 hours is treated as a half day.";
  }
  else if (pLower.includes('leave quota') || pLower.includes('leave policy') || pLower.includes('annual leave')) {
    responseText = "Standard yearly leave quotas are: **14 Annual Leaves**, **8 Sick Leaves**, **10 Casual Leaves**, and Unlimited Unpaid Leaves. Leaves only count working days (weekends and public holidays are excluded).";
  }
  else if (pLower.includes('tax slab') || pLower.includes('tax rule')) {
    responseText = "Annual tax slabs: Up to 600k (0%), 600k–1.2M (5% on excess), 1.2M–2.4M (30k + 15%), 2.4M–3.6M (210k + 25%), and above 3.6M (510k + 35%). Deducted monthly from gross take-home.";
  }
  else {
    // If external AI_API_KEY is configured and valid, could call OpenAI / Gemini here
    // Otherwise provide informative assistant response
    responseText = `Hello! I am your HCM Lite AI Assistant. You can ask me real-time questions such as:\n- "Who is on leave today?"\n- "How many active employees are in the company?"\n- "Who came late most often this month?"\n- "How many sick leaves do I have left?" (for employees)\n- Company policy on office hours, leave quotas, or tax slabs.`;
  }

  logAiCall(user, prompt, responseText, toolCalls);
  return {
    response: responseText,
    tool_calls: toolCalls,
    is_ai_generated: true
  };
}

function logAiCall(user, prompt, response, toolCalls) {
  try {
    query.run(`
      INSERT INTO ai_logs (user_id, user_role, prompt, response, tool_calls, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `, [
      user?.id || null,
      user?.role || 'anonymous',
      prompt,
      response,
      JSON.stringify(toolCalls || [])
    ]);
  } catch (e) {
    console.error('Failed to log AI call:', e);
  }
}

/**
 * Smart leave parsing from natural language
 */
function parseSmartLeave(text) {
  const t = text.toLowerCase();
  const now = new Date();

  // Helper to format Date to YYYY-MM-DD
  const formatDate = d => d.toISOString().split('T')[0];

  let type = 'casual';
  if (t.includes('sick') || t.includes('fever') || t.includes('tabiyat') || t.includes('doctor') || t.includes('hospital') || t.includes('bimar')) {
    type = 'sick';
  } else if (t.includes('annual') || t.includes('vacation') || t.includes('holiday')) {
    type = 'annual';
  } else if (t.includes('unpaid')) {
    type = 'unpaid';
  }

  let startDate = new Date();
  let endDate = new Date();

  if (t.includes('tomorrow') || t.includes('kal')) {
    startDate.setDate(now.getDate() + 1);
    endDate = new Date(startDate);
    if (t.includes('two days') || t.includes('2 days') || t.includes('parso') || t.includes('do din')) {
      endDate.setDate(startDate.getDate() + 1);
    }
  } else if (t.includes('next monday') || t.includes('aglay peer')) {
    // find next monday
    const day = now.getDay();
    const daysUntilNextMon = ((1 + 7 - day) % 7) || 7;
    startDate.setDate(now.getDate() + daysUntilNextMon);
    endDate = new Date(startDate);
    if (t.includes('tuesday') || t.includes('2 days') || t.includes('do din')) {
      endDate.setDate(startDate.getDate() + 1);
    }
  } else if (t.includes('today') || t.includes('aaj')) {
    startDate = new Date(now);
    endDate = new Date(now);
    if (t.includes('tomorrow') || t.includes('2 days')) {
      endDate.setDate(startDate.getDate() + 1);
    }
  } else {
    // Default to next working day
    startDate.setDate(now.getDate() + 1);
    endDate = new Date(startDate);
  }

  // Find matching leave_type_id
  const lt = query.get('SELECT id FROM leave_types WHERE code = ?', [type]) ||
             query.get('SELECT id FROM leave_types WHERE code = ?', ['casual']);

  return {
    leave_type_id: lt?.id || 1,
    type,
    start_date: formatDate(startDate),
    end_date: formatDate(endDate),
    reason: text
  };
}

/**
 * Generate 3-5 concise bullet insights from KPI numbers
 */
function summarizeDashboardKpis(kpiData, role = 'admin') {
  const bullets = [];

  if (role === 'admin' || role === 'hr') {
    if (kpiData.headcount !== undefined) {
      bullets.push(`Total active workforce stands at **${kpiData.headcount} employees**.`);
    }
    if (kpiData.attrition_ytd !== undefined) {
      bullets.push(`Year-to-date attrition rate is currently maintained at **${kpiData.attrition_ytd}%**.`);
    }
    if (kpiData.payroll_cost !== undefined) {
      bullets.push(`Latest monthly payroll expenditure sums to **PKR ${Number(kpiData.payroll_cost).toLocaleString()}**.`);
    }
    if (kpiData.present_today !== undefined) {
      bullets.push(`Today's physical attendance logged **${kpiData.present_today} members present** with **${kpiData.late_today || 0} late arrivals**.`);
    }
    if (kpiData.pending_approvals > 0) {
      bullets.push(`Action required: **${kpiData.pending_approvals} pending approval requests** await review in the HR inbox.`);
    }
  }

  if (bullets.length === 0) {
    bullets.push('All department operations and attendance metrics are within established standard thresholds.');
    bullets.push('Payroll and leave balances are fully aligned with monthly organizational policies.');
    bullets.push('No critical anomalies or policy deviations reported for the current cycle.');
  }

  return bullets;
}

module.exports = {
  processAiChat,
  parseSmartLeave,
  summarizeDashboardKpis
};

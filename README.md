# HCM Lite — AI-Assisted Human Capital Management System
**Saylani Hackathon 2026 Challenge Submission**  
Venue: Zaitoon Ashraf IT Park &bull; Date: 24 October 2026  

---

## 🌟 Overview & Architecture
HCM Lite is a high-performance Human Capital Management web platform engineered for enterprise workforce governance across three access tiers: **Admin**, **HR Operations**, and **Employee Self-Service**.

Backed by a deterministic SQLite database with foreign keys and WAL mode, HCM Lite connects conversational intelligence directly to the database through schema-scoped function tools.

```
hcm-lite/
├── backend/
│   ├── server.js                  # Express API server with CORS and error handling
│   ├── data/                      # Zero-configuration SQLite database (starts empty)
│   └── src/
│       ├── config/db.js           # DDL, relations, indexes, connection sync
│       ├── middleware/            # JWT authentication, role guards, data scope guards
│       ├── controllers/           # Auth, Setup, Users, Employees, Attendance, Leave, Payroll, AI, Comms
│       ├── routes/                # Modular REST API routes
│       ├── services/              # Business rules: tax slabs, prorations, geofencing, AI tools, PDF payslips
│       └── utils/                 # Haversine distance, progressive tax calculator
└── frontend/                      # React 18 + Vite + Tailwind CSS + Lucide Icons
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── api/                   # Axios API service clients
        ├── components/            # UI kit, charts, check-in widgets, AI chat & summary cards
        ├── layouts/               # Responsive sidebar, topbar, and app layout
        ├── pages/
        │   ├── auth/              # FirstRunSetup, Login, ChangePassword
        │   ├── admin/             # Dashboard, Settings, Depts, Roles, Quotas, Holidays, Logins, Payroll, Audit
        │   ├── hr/                # Dashboard, EmployeeForm, CSV Import, Salary, Attendance Board, Approvals, Payroll
        │   ├── employee/          # Dashboard, MyAttendance, ApplyLeave, Payslips, Profile
        │   └── shared/            # Directory, Employee 360, Announcements, Notifications, AI Console
        └── routes/                # Protected routes with scope & password change enforcement
```

---

## 🚀 How to Run in Under 10 Minutes

### Prerequisites
- **Node.js**: v18.0.0 or later (Tested on Node v24)
- **NPM**: v9.0.0 or later

### Step 1: Install Dependencies
Open a terminal in the root directory:
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 2: Configure Environment (Optional)
The system comes with pre-configured `.env` files with sensible defaults.
- Backend `.env`:
  ```env
  PORT=5000
  JWT_SECRET=hcm_lite_super_secret_jwt_key_2026_saylani
  DATABASE_FILE=./data/hcm_lite.db
  AI_API_KEY=
  ```
  *(Note: If `AI_API_KEY` is omitted, the built-in intelligent semantic engine executes all database tools, policy Q&A, smart leave extraction, and summaries automatically without requiring any paid API key!)*

- Frontend `.env`:
  ```env
  VITE_API_URL=/api
  ```

### Step 3: Start the Backend & Frontend Servers
In terminal 1 (Backend):
```bash
cd backend
npm start
# Backend running at http://localhost:5000
```

In terminal 2 (Frontend):
```bash
cd frontend
npm run dev
# Frontend running at http://localhost:3000
```

Open your browser to: **`http://localhost:3000`**

---

## 🎬 5-Minute Demo Script (Judges Flow)

The system **starts completely empty**. Follow this exact flow during evaluation:

### 1. Fresh Install & First-Run Setup
1. Navigate to `http://localhost:3000`. You are automatically redirected to `/first-run`.
2. Fill in the initial setup form:
   - **Company Name**: `Saylani Tech Enterprise`
   - **Admin Email**: `admin@saylani.org`
   - **Admin Password**: `Admin@123`
   - **Office Hours**: `09:00`, **Grace**: `15` min
   - **Office Lat/Lng**: `24.8607`, `67.0011`, **Radius**: `150` m
3. Click **Initialize HCM Lite System**. You are logged in directly as Super Administrator.

### 2. Configure Organization & Provision HR Login
1. Go to **Departments** (`/admin/departments`) &rarr; Click **Add Department** &rarr; Add `Engineering` and `Human Resources`.
2. Go to **User Logins** (`/admin/logins`) &rarr; Click **Create HR Login**:
   - Email: `hr@saylani.org`
   - Temporary Password: `Saylani@123`
3. Sign out of Admin.

### 3. HR First Login & Employee Registration
1. Sign in as `hr@saylani.org` with password `Saylani@123`.
2. You will be prompted to set your permanent password (`/change-password`). Set a new password and continue to the HR Dashboard.
3. Go to **Register Employee** (`/hr/employee-new`):
   - Name: `Ahmed Khan`
   - Email: `ahmed.khan@company.com`
   - Department: `Engineering`
   - Joining Date: Current date
   - Basic Salary: `60,000` (Notice live computation: HRA 40% = 24k, Medical 10% = 6k, Gross = 90k)
   - Temporary Password: `Employee@123`
4. Click **Complete Registration**. Sign out of HR.

### 4. Employee Login, Password Change & Attendance Punch
1. Sign in as `ahmed.khan@company.com` with `Employee@123`.
2. Forced password change opens. Update to your permanent password.
3. On the **Employee Dashboard** (`/employee/dashboard`):
   - Click **Web Check In** (or click **Camera Check In** for face & geofence punch).
   - Real-time attendance stamp registers as **Present** or **Late** (depending on whether local time is after 09:15).
   - Check out when completed to log hours.

### 5. Smart Leave Application in Plain Words
1. Go to **Apply for Leave** (`/employee/apply-leave`).
2. In the **Smart Leave Assistant** box, enter:
   > *"Need next Monday and Tuesday off for my sister wedding"*
   *(or try Roman Urdu: "kal meri tabiyat theek nahi thi chutti chahiye")*
3. Click **Smart Parse**.
4. The system automatically categorizes it as **Casual Leave** (or **Sick Leave**), extracts the date range, excludes weekends/holidays, and fills the form.
5. Click **Submit Leave Request**. Sign out.

### 6. HR Approval, AI Insights & Payroll Draft
1. Sign back in as `hr@saylani.org`.
2. Go to **Leave Approvals** (`/hr/leave-approvals`) &rarr; Click **Approve** on Ahmed Khan's request.
3. Open **HR Dashboard** (`/hr/dashboard`):
   - Click **Summarize KPIs** on the **Executive AI Summary Card** to see 3-5 bullet insights based strictly on current database numbers.
4. Go to **Monthly Payroll Draft** (`/hr/payroll-draft`):
   - Pick the current month (e.g. `2026-10`) &rarr; Click **Compute Draft Payroll**.
   - Review gross salary, per-day rate, unpaid/absent deductions, progressive tax slabs, and net pay.
5. Sign out of HR.

### 7. Admin Finalization & Audit Trail
1. Sign in as `admin@saylani.org`.
2. Go to **Payroll Finalize** (`/admin/payroll-finalize`):
   - Review draft figures &rarr; Click **Lock & Finalize**. The month is now sealed and immutable.
3. Go to **System Audit Trail** (`/admin/audit-log`):
   - View forensic logs with actor, IP, timestamp, action, and before/after JSON payloads.
4. Sign out.

### 8. Employee Payslip PDF & Role Guardrail Check
1. Sign in as `ahmed.khan@company.com`.
2. Go to **My Payslips** (`/employee/payslips`) &rarr; Click **Download PDF** to inspect the official, formatted PDF payslip.
3. Open **AI Assistant** (`/shared/ai-assistant`) and ask:
   > *"What is my colleague's salary?"*
   *(The AI Assistant politely refuses: "I cannot disclose salary or personal compensation information of other colleagues due to privacy and security policies.")*
4. Ask the AI:
   > *"Who is on leave today?"* or *"How many sick leaves do I have left?"*
   *(The AI executes server-side tools and returns real numbers matching your database!)*

---

## 🏆 Checklist of 25 Core Features + Bonuses

| # | Functionality | Status | Description |
|---|---|:---:|---|
| 01 | First-run setup | ✅ | Asks for company profile and Admin account on fresh install |
| 02 | Auth & RBAC | ✅ | JWT login, bcrypt, 3 distinct roles, role-based menus |
| 03 | Company settings | ✅ | Office hours, 15m grace, 5h half-day, weekend, location + radius |
| 04 | Org setup | ✅ | Departments, designations, leave quotas (14/8/10), public holidays |
| 05 | Admin user governance | ✅ | Create HR logins, deactivate/reactivate, reset passwords |
| 06 | Register employee | ✅ | Auto-creates login, temporary password, forced change on first sign-in |
| 07 | Employee directory & 360 | ✅ | Server-side search, paging, filters, full 360 employee profile dossier |
| 08 | CSV import & export | ✅ | Dry-run preflight validation report with error list; CSV export |
| 09 | Attendance punch | ✅ | Server-stamped time, 409 conflict on duplicate check-in, late > 09:15 |
| 10 | Attendance board & calendar | ✅ | Daily roster for HR/Admin, monthly personal calendar for employees |
| 11 | Attendance corrections | ✅ | Employee submits correction with times/reason; HR approves/rejects |
| 12 | Apply & cancel leave | ✅ | Working days only (skips weekends/holidays), overlap/quota checks (422) |
| 13 | Leave approvals inbox | ✅ | HR reviews pending requests with decision comments and notifications |
| 14 | Salary structure | ✅ | Gross = 1.5 × Basic (HRA 40%, Medical 10%) live calculated |
| 15 | Monthly payroll draft | ✅ | HR creates draft, per-day rate deductions, prorations, tax slabs |
| 16 | Finalize payroll | ✅ | Admin locks and finalizes payroll run (locked against mutations) |
| 17 | Payslips with PDF | ✅ | PDF payslip generation and download via pdfkit |
| 18 | Dashboards & KPIs | ✅ | Role-specific dashboards, trends, department charts, and filters |
| 19 | AI Assistant chat | ✅ | Real data tool-calling engine, scoped permissions |
| 20 | AI dashboard summary | ✅ | Summarizes KPI JSON into 3–5 concise insight bullets |
| 21 | Smart leave in plain words | ✅ | Parses plain English/Roman Urdu sentence to pre-filled leave form |
| 22 | Policy Q&A | ✅ | Answers office hours, leave quotas, and tax bracket rules |
| 23 | Announcements | ✅ | Admin/HR post bulletins; viewable on all dashboards |
| 24 | In-app notifications | ✅ | Triggered on leave decisions, corrections, and payslip releases |
| 25 | Audit trail | ✅ | Admin-only immutable log with before/after JSON diffs |
| **+** | **Camera Attendance Bonus** | ✅ | Face presence detection + Haversine GPS geofence check (<=150m) |
| **+** | **Attrition Risk Score** | ✅ | Calculated on tenure, attendance stability, and probation status |
| **+** | **Absence Anomaly Flags** | ✅ | Flags repeated late arrivals and half-day clusters |
| **+** | **Late Penalty Rule** | ✅ | 3 lates in a month = 0.5 day salary deduction |
| **+** | **Roman Urdu Support** | ✅ | AI Assistant understands natural Roman Urdu queries |
| **+** | **PWA Manifest & Favicon** | ✅ | Web app manifest and SVG branding icon included |

---

## 🔒 Security & Data Guardrails
- **Zero Client-Side LLM Calls**: Browser never communicates directly with LLMs; all queries route through `POST /api/ai/chat` with JWT verification.
- **No Direct Database Querying by AI**: LLM executes predefined parameterized tools (`get_headcount`, `get_leave_summary`, etc.) that enforce user permissions.
- **Immutable Audit Logging**: Actions (`CREATE`, `UPDATE`, `APPROVE`, `FINALIZE`) are logged with actor details, timestamps, and payload snapshots.
- **Server Timestamp Authority**: Attendance check-in and check-out times are stamped exclusively by the server clock to prevent client tampering.

import {
  LayoutDashboard,
  Building2,
  Users,
  CalendarCheck,
  CalendarDays,
  FileSpreadsheet,
  Megaphone,
  ShieldAlert,
  Settings,
  UserCircle,
  Briefcase,
  FileCheck2,
  HelpCircle,
  Clock,
  Sparkles
} from 'lucide-react';

export const MENUS = {
  admin: [
    { label: 'Admin Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Company Settings', path: '/admin/settings', icon: Settings },
    { label: 'Departments', path: '/admin/departments', icon: Building2 },
    { label: 'Designations', path: '/admin/designations', icon: Briefcase },
    { label: 'Leave Types', path: '/admin/leave-types', icon: CalendarDays },
    { label: 'Public Holidays', path: '/admin/holidays', icon: CalendarCheck },
    { label: 'User Logins', path: '/admin/logins', icon: Users },
    { label: 'Employee Directory', path: '/shared/employees', icon: Users },
    { label: 'Payroll Finalize', path: '/admin/payroll-finalize', icon: FileSpreadsheet },
    { label: 'Audit Trail', path: '/admin/audit-log', icon: ShieldAlert },
    { label: 'Announcements', path: '/shared/announcements', icon: Megaphone },
    { label: 'AI Assistant', path: '/shared/ai-assistant', icon: Sparkles }
  ],

  hr: [
    { label: 'HR Dashboard', path: '/hr/dashboard', icon: LayoutDashboard },
    { label: 'Employee Directory', path: '/shared/employees', icon: Users },
    { label: 'Register Employee', path: '/hr/employee-new', icon: Users },
    { label: 'Bulk CSV Import', path: '/hr/csv-import', icon: FileSpreadsheet },
    { label: 'Salary Structure', path: '/hr/salary-structure', icon: Briefcase },
    { label: 'Daily Attendance Board', path: '/hr/attendance-board', icon: CalendarCheck },
    { label: 'Attendance Corrections', path: '/hr/corrections', icon: Clock },
    { label: 'Leave Approvals', path: '/hr/leave-approvals', icon: FileCheck2 },
    { label: 'Monthly Payroll Draft', path: '/hr/payroll-draft', icon: FileSpreadsheet },
    { label: 'Announcements', path: '/shared/announcements', icon: Megaphone },
    { label: 'AI Assistant', path: '/shared/ai-assistant', icon: Sparkles }
  ],

  employee: [
    { label: 'My Dashboard', path: '/employee/dashboard', icon: LayoutDashboard },
    { label: 'My Attendance Calendar', path: '/employee/attendance', icon: CalendarCheck },
    { label: 'Apply for Leave', path: '/employee/apply-leave', icon: CalendarDays },
    { label: 'My Payslips', path: '/employee/payslips', icon: FileSpreadsheet },
    { label: 'My Profile', path: '/employee/profile', icon: UserCircle },
    { label: 'Company Directory', path: '/shared/employees', icon: Users },
    { label: 'Announcements', path: '/shared/announcements', icon: Megaphone },
    { label: 'AI Assistant', path: '/shared/ai-assistant', icon: Sparkles }
  ]
};

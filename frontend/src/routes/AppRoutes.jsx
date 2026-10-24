import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layout
import AppLayout from '../layouts/AppLayout';
import ProtectedRoute from './ProtectedRoute';

// Auth Pages
import FirstRunSetup from '../pages/auth/FirstRunSetup';
import Login from '../pages/auth/Login';
import ChangePassword from '../pages/auth/ChangePassword';

// Admin Pages
import AdminDashboard from '../pages/admin/AdminDashboard';
import CompanySettings from '../pages/admin/CompanySettings';
import Departments from '../pages/admin/Departments';
import Designations from '../pages/admin/Designations';
import LeaveTypes from '../pages/admin/LeaveTypes';
import Holidays from '../pages/admin/Holidays';
import Logins from '../pages/admin/Logins';
import PayrollFinalize from '../pages/admin/PayrollFinalize';
import AuditLog from '../pages/admin/AuditLog';

// HR Pages
import HrDashboard from '../pages/hr/HrDashboard';
import EmployeeForm from '../pages/hr/EmployeeForm';
import CsvImport from '../pages/hr/CsvImport';
import SalaryStructure from '../pages/hr/SalaryStructure';
import AttendanceBoard from '../pages/hr/AttendanceBoard';
import Corrections from '../pages/hr/Corrections';
import LeaveApprovals from '../pages/hr/LeaveApprovals';
import PayrollDraft from '../pages/hr/PayrollDraft';

// Employee Pages
import EmployeeDashboard from '../pages/employee/EmployeeDashboard';
import MyAttendance from '../pages/employee/MyAttendance';
import ApplyLeave from '../pages/employee/ApplyLeave';
import MyPayslips from '../pages/employee/MyPayslips';
import MyProfile from '../pages/employee/MyProfile';

// Shared Pages
import EmployeeDirectory from '../pages/shared/EmployeeDirectory';
import Employee360 from '../pages/shared/Employee360';
import Announcements from '../pages/shared/Announcements';
import Notifications from '../pages/shared/Notifications';
import AiAssistant from '../pages/shared/AiAssistant';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public / Auth routes */}
      <Route path="/first-run" element={<FirstRunSetup />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/change-password"
        element={
          <ProtectedRoute>
            <ChangePassword />
          </ProtectedRoute>
        }
      />

      {/* Main Authenticated Layout */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        {/* Admin Section */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <CompanySettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/departments"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Departments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/designations"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Designations />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/leave-types"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <LeaveTypes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/holidays"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Holidays />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/logins"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Logins />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/payroll-finalize"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <PayrollFinalize />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit-log"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AuditLog />
            </ProtectedRoute>
          }
        />

        {/* HR Section */}
        <Route
          path="/hr/dashboard"
          element={
            <ProtectedRoute allowedRoles={['admin', 'hr']}>
              <HrDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/employee-new"
          element={
            <ProtectedRoute allowedRoles={['admin', 'hr']}>
              <EmployeeForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/csv-import"
          element={
            <ProtectedRoute allowedRoles={['admin', 'hr']}>
              <CsvImport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/salary-structure"
          element={
            <ProtectedRoute allowedRoles={['admin', 'hr']}>
              <SalaryStructure />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/attendance-board"
          element={
            <ProtectedRoute allowedRoles={['admin', 'hr']}>
              <AttendanceBoard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/corrections"
          element={
            <ProtectedRoute allowedRoles={['admin', 'hr']}>
              <Corrections />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/leave-approvals"
          element={
            <ProtectedRoute allowedRoles={['admin', 'hr']}>
              <LeaveApprovals />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hr/payroll-draft"
          element={
            <ProtectedRoute allowedRoles={['admin', 'hr']}>
              <PayrollDraft />
            </ProtectedRoute>
          }
        />

        {/* Employee Section */}
        <Route
          path="/employee/dashboard"
          element={
            <ProtectedRoute allowedRoles={['employee']}>
              <EmployeeDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee/attendance"
          element={
            <ProtectedRoute allowedRoles={['employee']}>
              <MyAttendance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee/apply-leave"
          element={
            <ProtectedRoute allowedRoles={['employee']}>
              <ApplyLeave />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee/payslips"
          element={
            <ProtectedRoute allowedRoles={['employee']}>
              <MyPayslips />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee/profile"
          element={
            <ProtectedRoute allowedRoles={['employee']}>
              <MyProfile />
            </ProtectedRoute>
          }
        />

        {/* Shared Pages */}
        <Route path="/shared/employees" element={<EmployeeDirectory />} />
        <Route path="/shared/employees/:id" element={<Employee360 />} />
        <Route path="/shared/announcements" element={<Announcements />} />
        <Route path="/shared/notifications" element={<Notifications />} />
        <Route path="/shared/ai-assistant" element={<AiAssistant />} />
      </Route>

      {/* Default fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

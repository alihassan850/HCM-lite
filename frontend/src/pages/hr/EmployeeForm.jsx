import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Building, DollarSign, Lock, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { employeesApi } from '../../api/employees.api';
import { setupApi } from '../../api/setup.api';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import { formatCurrency } from '../../utils/formatCurrency';

export default function EmployeeForm() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successInfo, setSuccessInfo] = useState(null);

  const [form, setForm] = useState({
    employee_code: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    gender: 'male',
    department_id: '',
    designation_id: '',
    joining_date: new Date().toISOString().split('T')[0],
    basic_salary: 50000,
    temporary_password: 'Saylani@123'
  });

  useEffect(() => {
    Promise.all([setupApi.getDepartments(), setupApi.getDesignations()]).then(([depRes, desRes]) => {
      setDepartments(depRes.data.departments || []);
      setDesignations(desRes.data.designations || []);
    });
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  // Live Salary Calculations
  const basic = Number(form.basic_salary) || 0;
  const hra = Math.round(basic * 0.40);
  const medical = Math.round(basic * 0.10);
  const gross = Math.round(basic + hra + medical);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      const res = await employeesApi.registerEmployee(form);
      setSuccessInfo({
        employee: res.data.employee,
        temp_password: res.data.temp_password
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to register employee.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Register New Employee</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Provisions employee records, initial salary structure, and automated self-service login
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium rounded-xl">
          {error}
        </div>
      )}

      {successInfo ? (
        <Card className="border-emerald-200 bg-emerald-50/40 p-6 text-center">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl mx-auto flex items-center justify-center mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-emerald-900">Employee Successfully Registered!</h3>
          <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
            Account created for <strong>{successInfo.employee.first_name} {successInfo.employee.last_name}</strong> (Code: <code>{successInfo.employee.employee_code}</code>).
          </p>

          <div className="my-5 p-4 bg-white rounded-xl border border-emerald-200 max-w-sm mx-auto text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Login Email:</span>
              <span className="font-semibold text-slate-800">{successInfo.employee.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Temporary Password:</span>
              <span className="font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                {successInfo.temp_password}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 pt-1">
              * The employee will be forced to set their permanent password upon initial sign-in.
            </p>
          </div>

          <div className="flex justify-center gap-3">
            <Button variant="secondary" onClick={() => {
              setSuccessInfo(null);
              setForm({
                ...form,
                employee_code: '',
                first_name: '',
                last_name: '',
                email: '',
                phone: '',
                address: ''
              });
            }}>
              Register Another
            </Button>
            <Button variant="primary" onClick={() => navigate('/shared/employees')}>
              View Directory
            </Button>
          </div>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Identity & Contact Details */}
          <Card title="Personal Information" subtitle="Demographic and contact data">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Employee Code"
                name="employee_code"
                value={form.employee_code}
                onChange={handleChange}
                placeholder="Auto-generated if blank (e.g. EMP-001)"
              />
              <Input
                label="First Name"
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                placeholder="e.g. Ahmed"
                required
              />
              <Input
                label="Last Name"
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
                placeholder="e.g. Khan"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <Input
                label="Corporate Email"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="ahmed.khan@company.com"
                required
              />
              <Input
                label="Phone Number"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+92 300 1234567"
              />
              <Select
                label="Gender"
                name="gender"
                value={form.gender}
                onChange={handleChange}
                options={[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'other', label: 'Other' }
                ]}
              />
            </div>

            <div className="mt-4">
              <Input
                label="Residential Address"
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Street address, City, Postal Code"
              />
            </div>
          </Card>

          {/* Department & Role Placement */}
          <Card title="Organizational Placement" subtitle="Department and designation linkage">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                label="Department"
                name="department_id"
                value={form.department_id}
                onChange={handleChange}
                options={departments.map(d => ({ value: d.id, label: d.name }))}
                placeholder="Select Department"
              />
              <Select
                label="Job Designation"
                name="designation_id"
                value={form.designation_id}
                onChange={handleChange}
                options={designations.map(d => ({ value: d.id, label: d.title }))}
                placeholder="Select Designation"
              />
              <Input
                label="Joining Date (YYYY-MM-DD)"
                type="date"
                name="joining_date"
                value={form.joining_date}
                onChange={handleChange}
                required
              />
            </div>
          </Card>

          {/* Salary Structure (Gross = 1.5 * Basic) */}
          <Card
            title="Compensation Structure"
            subtitle="Verified HCM Lite rule: Gross = 1.5 × Basic (HRA 40%, Medical 10%)"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
              <div>
                <Input
                  label="Basic Salary (PKR / Month)"
                  type="number"
                  name="basic_salary"
                  value={form.basic_salary}
                  onChange={handleChange}
                  icon={DollarSign}
                  required
                />
                <p className="text-xs text-slate-400 mt-2">
                  Allowances and total gross are automatically calculated according to corporate compensation formulas.
                </p>
              </div>

              {/* Live Computed Breakdown */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Basic Salary:</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(basic)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>House Rent Allowance (HRA 40%):</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(hra)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Medical Allowance (10%):</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(medical)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-teal-800">
                  <span>Total Gross (1.5 × Basic):</span>
                  <span>{formatCurrency(gross)}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Provisioning Security Credentials */}
          <Card title="Self-Service Portal Login" subtitle="Automated login account created upon submission">
            <div className="max-w-md">
              <Input
                label="Temporary Sign-In Password"
                type="text"
                name="temporary_password"
                value={form.temporary_password}
                onChange={handleChange}
                icon={Lock}
                helperText="Employee will be required to change this upon first sign-in."
                required
              />
            </div>
          </Card>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => navigate('/shared/employees')}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={submitting}
              icon={UserPlus}
            >
              Complete Registration & Provision Login
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

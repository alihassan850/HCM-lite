import React, { useState, useEffect } from 'react';
import { DollarSign, Edit2, Search } from 'lucide-react';
import { employeesApi } from '../../api/employees.api';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { formatCurrency } from '../../utils/formatCurrency';

export default function SalaryStructure() {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [basicSalary, setBasicSalary] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadEmployees();
  }, [search]);

  async function loadEmployees() {
    try {
      setLoading(true);
      const res = await employeesApi.listEmployees({ search: search || undefined, limit: 50 });
      setEmployees(res.data.employees || []);
    } catch (err) {
      setError('Failed to fetch salary structures.');
    } finally {
      setLoading(false);
    }
  }

  function handleOpenEdit(emp) {
    setSelectedEmp(emp);
    setBasicSalary(String(emp.basic_salary || 0));
    setError(null);
  }

  const basic = Number(basicSalary) || 0;
  const hra = Math.round(basic * 0.40);
  const medical = Math.round(basic * 0.10);
  const gross = Math.round(basic + hra + medical);

  async function handleSave(e) {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      await employeesApi.updateEmployee(selectedEmp.id, {
        basic_salary: basic
      });
      setSelectedEmp(null);
      loadEmployees();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update salary.');
    } finally {
      setSubmitting(false);
    }
  }

  const columns = [
    {
      header: 'Employee',
      key: 'name',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 block">{row.first_name} {row.last_name}</span>
          <span className="text-xs text-slate-400 font-mono">{row.employee_code} &bull; {row.department_name || 'N/A'}</span>
        </div>
      )
    },
    {
      header: 'Basic Salary',
      key: 'basic_salary',
      render: (row) => formatCurrency(row.basic_salary)
    },
    {
      header: 'HRA (40%)',
      key: 'hra',
      render: (row) => formatCurrency(row.hra)
    },
    {
      header: 'Medical (10%)',
      key: 'medical_allowance',
      render: (row) => formatCurrency(row.medical_allowance)
    },
    {
      header: 'Gross Salary (1.5×)',
      key: 'gross_salary',
      render: (row) => (
        <span className="font-extrabold text-teal-800">{formatCurrency(row.gross_salary)}</span>
      )
    },
    {
      header: 'Action',
      key: 'action',
      render: (row) => (
        <Button
          variant="secondary"
          size="sm"
          icon={Edit2}
          onClick={() => handleOpenEdit(row)}
        >
          Modify Base
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Salary Structures & Allowances</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified HCM Lite remuneration rules: Gross = 1.5 × Basic (HRA 40%, Medical 10%)
          </p>
        </div>

        <div className="w-full sm:w-64">
          <Input
            placeholder="Search employee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={Search}
          />
        </div>
      </div>

      <Table
        columns={columns}
        data={employees}
        isLoading={loading}
        emptyMessage="No employees registered yet."
      />

      {/* Modify Base Salary Modal */}
      {selectedEmp && (
        <Modal
          isOpen={!!selectedEmp}
          onClose={() => setSelectedEmp(null)}
          title={`Adjust Salary: ${selectedEmp.first_name} ${selectedEmp.last_name}`}
        >
          <form onSubmit={handleSave} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium rounded-xl">
                {error}
              </div>
            )}

            <Input
              label="Basic Salary (PKR / Month)"
              type="number"
              value={basicSalary}
              onChange={(e) => setBasicSalary(e.target.value)}
              icon={DollarSign}
              required
            />

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
              <span className="font-bold text-slate-700 block mb-1">Computed Remuneration Breakdown:</span>
              <div className="flex justify-between text-slate-600">
                <span>Basic Pay:</span>
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
                <span>Monthly Gross:</span>
                <span>{formatCurrency(gross)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setSelectedEmp(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={submitting}>
                Save Salary Change
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

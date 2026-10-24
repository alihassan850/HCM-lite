import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Users, Search, Download, Plus, Eye, Phone, Mail, Building } from 'lucide-react';
import { employeesApi } from '../../api/employees.api';
import { setupApi } from '../../api/setup.api';
import { useAuth } from '../../hooks/useAuth';
import Table from '../../components/ui/Table';
import FilterBar from '../../components/FilterBar';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import { formatDate } from '../../utils/formatDate';
import { formatCurrency } from '../../utils/formatCurrency';
import { downloadBlob } from '../../utils/downloadFile';

export default function EmployeeDirectory() {
  const navigate = useNavigate();
  const { user, isAdmin, isHr } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });

  // Filters
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setupApi.getDepartments().then(res => setDepartments(res.data.departments || []));
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [page, search, department, status]);

  async function loadEmployees() {
    try {
      setLoading(true);
      const res = await employeesApi.listEmployees({
        search: search || undefined,
        department_id: department || undefined,
        status: status || undefined,
        page,
        limit: 15
      });
      setEmployees(res.data.employees || []);
      setPagination(res.data.pagination || { totalPages: 1, total: 0 });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleExportCsv() {
    try {
      setExporting(true);
      const res = await employeesApi.exportCsv();
      downloadBlob(res.data, 'hcm_employees_export.csv');
    } catch (err) {
      alert('Failed to export CSV.');
    } finally {
      setExporting(false);
    }
  }

  const columns = [
    {
      header: 'Employee Details',
      key: 'name',
      render: (emp) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center flex-shrink-0 uppercase">
            {emp.first_name?.charAt(0)}{emp.last_name?.charAt(0)}
          </div>
          <div>
            <Link
              to={`/shared/employees/${emp.id}`}
              className="font-bold text-slate-900 hover:text-teal-600 block transition-colors"
            >
              {emp.first_name} {emp.last_name}
            </Link>
            <span className="text-xs text-slate-400 font-mono">{emp.employee_code}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Contact Info',
      key: 'contact',
      render: (emp) => (
        <div className="text-xs space-y-0.5">
          <div className="flex items-center gap-1.5 text-slate-600">
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            <span>{emp.email}</span>
          </div>
          {emp.phone && (
            <div className="flex items-center gap-1.5 text-slate-400">
              <Phone className="w-3.5 h-3.5" />
              <span>{emp.phone}</span>
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Department & Role',
      key: 'dept',
      render: (emp) => (
        <div>
          <span className="font-semibold text-slate-800 text-xs block">{emp.designation_title || 'Staff'}</span>
          <span className="text-xs text-slate-400">{emp.department_name || 'General'}</span>
        </div>
      )
    },
    {
      header: 'Status',
      key: 'employment_status',
      render: (emp) => (
        <Badge variant={emp.employment_status === 'active' ? 'success' : emp.employment_status === 'probation' ? 'warning' : 'danger'}>
          {emp.employment_status.toUpperCase()}
        </Badge>
      )
    },
    // Salary only visible to Admin & HR
    ...(isAdmin || isHr ? [
      {
        header: 'Gross Salary',
        key: 'gross_salary',
        render: (emp) => (
          <span className="font-semibold text-slate-800 text-xs">
            {formatCurrency(emp.gross_salary)}
          </span>
        )
      }
    ] : []),
    {
      header: 'Actions',
      key: 'actions',
      render: (emp) => (
        <Link to={`/shared/employees/${emp.id}`}>
          <Button variant="secondary" size="sm" icon={Eye}>
            360 Profile
          </Button>
        </Link>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Employee Directory</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Searchable corporate personnel database with 360-degree dossiers
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(isAdmin || isHr) && (
            <>
              <Button
                variant="secondary"
                size="md"
                icon={Download}
                loading={exporting}
                onClick={handleExportCsv}
              >
                Export CSV
              </Button>
              <Link to="/hr/employee-new">
                <Button variant="primary" size="md" icon={Plus}>
                  Register Employee
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      <FilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        department={department}
        onDepartmentChange={(v) => { setDepartment(v); setPage(1); }}
        departments={departments}
        status={status}
        onStatusChange={(v) => { setStatus(v); setPage(1); }}
        statusOptions={[
          { value: 'active', label: 'Active' },
          { value: 'probation', label: 'Probation' },
          { value: 'resigned', label: 'Resigned' },
          { value: 'terminated', label: 'Terminated' }
        ]}
        onReset={() => {
          setSearch('');
          setDepartment('');
          setStatus('');
          setPage(1);
        }}
      />

      <Table
        columns={columns}
        data={employees}
        isLoading={loading}
        emptyMessage="No employees matched your search filters."
      />

      <Pagination
        currentPage={page}
        totalPages={pagination.totalPages}
        totalItems={pagination.total}
        pageSize={15}
        onPageChange={(p) => setPage(p)}
      />
    </div>
  );
}

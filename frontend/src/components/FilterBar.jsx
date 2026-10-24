import React from 'react';
import { Search, Filter, RotateCcw } from 'lucide-react';
import Input from './ui/Input';
import Select from './ui/Select';
import Button from './ui/Button';

export default function FilterBar({
  search,
  onSearchChange,
  department,
  onDepartmentChange,
  departments = [],
  status,
  onStatusChange,
  statusOptions = [],
  onReset,
  children
}) {
  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm mb-5">
      <div className="flex flex-1 flex-col sm:flex-row items-center gap-3">
        {onSearchChange !== undefined && (
          <div className="w-full sm:w-72">
            <Input
              placeholder="Search by code, name, email..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              icon={Search}
            />
          </div>
        )}

        {onDepartmentChange !== undefined && (
          <div className="w-full sm:w-48">
            <Select
              placeholder="All Departments"
              value={department}
              onChange={(e) => onDepartmentChange(e.target.value)}
              options={departments.map(d => ({ value: d.id, label: d.name }))}
            />
          </div>
        )}

        {onStatusChange !== undefined && statusOptions.length > 0 && (
          <div className="w-full sm:w-40">
            <Select
              placeholder="All Statuses"
              value={status}
              onChange={(e) => onStatusChange(e.target.value)}
              options={statusOptions}
            />
          </div>
        )}

        {onReset && (
          <Button variant="ghost" size="sm" icon={RotateCcw} onClick={onReset}>
            Reset
          </Button>
        )}
      </div>

      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

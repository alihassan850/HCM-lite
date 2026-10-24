import React, { useState, useEffect } from 'react';
import { CalendarCheck, Calendar, Filter, Clock, Camera, Globe } from 'lucide-react';
import { attendanceApi } from '../../api/attendance.api';
import Table from '../../components/ui/Table';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import { formatDate, formatTime } from '../../utils/formatDate';

export default function AttendanceBoard() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [board, setBoard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBoard();
  }, [date]);

  async function loadBoard() {
    try {
      setLoading(true);
      const res = await attendanceApi.getDailyBoard(date);
      setBoard(res.data.board || []);
    } catch (err) {
      console.error('Failed to load daily attendance board:', err);
    } finally {
      setLoading(false);
    }
  }

  // Summary counts
  const presentCount = board.filter(b => b.status === 'present').length;
  const lateCount = board.filter(b => b.status === 'late').length;
  const onLeaveCount = board.filter(b => b.status === 'on_leave').length;
  const halfDayCount = board.filter(b => b.status === 'half_day').length;
  const absentCount = board.filter(b => b.status === 'absent').length;

  const statusBadges = {
    present: { label: 'PRESENT', variant: 'success' },
    late: { label: 'LATE', variant: 'warning' },
    half_day: { label: 'HALF DAY', variant: 'danger' },
    on_leave: { label: 'ON LEAVE', variant: 'info' },
    absent: { label: 'ABSENT', variant: 'danger' },
    missing_checkout: { label: 'MISSING CHECK-OUT', variant: 'warning' }
  };

  const columns = [
    {
      header: 'Employee Details',
      key: 'name',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 block">{row.first_name} {row.last_name}</span>
          <span className="text-xs text-slate-400 font-mono">{row.employee_code} &bull; {row.department_name || 'N/A'}</span>
        </div>
      )
    },
    {
      header: 'Check In',
      key: 'check_in',
      render: (row) => (
        row.check_in ? (
          <span className="font-mono text-xs font-semibold text-slate-800">
            {formatTime(row.check_in)}
          </span>
        ) : '—'
      )
    },
    {
      header: 'Check Out',
      key: 'check_out',
      render: (row) => (
        row.check_out ? (
          <span className="font-mono text-xs font-semibold text-slate-800">
            {formatTime(row.check_out)}
          </span>
        ) : '—'
      )
    },
    {
      header: 'Logged Hours',
      key: 'total_hours',
      render: (row) => (
        row.total_hours > 0 ? `${row.total_hours} hrs` : '—'
      )
    },
    {
      header: 'Punch Channel',
      key: 'source',
      render: (row) => {
        if (!row.source) return '—';
        return (
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-medium">
            {row.source === 'camera' ? <Camera className="w-3.5 h-3.5 text-teal-600" /> : <Globe className="w-3.5 h-3.5 text-slate-400" />}
            {row.source.toUpperCase()}
          </span>
        );
      }
    },
    {
      header: 'Attendance Status',
      key: 'status',
      render: (row) => {
        const badgeInfo = statusBadges[row.status] || { label: row.status?.toUpperCase() || 'UNKNOWN', variant: 'default' };
        return (
          <Badge variant={badgeInfo.variant}>
            {badgeInfo.label}
          </Badge>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Daily Attendance Board</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time daily roster displaying presence, punctuality, and approved leaves
          </p>
        </div>

        <div className="w-full sm:w-52">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            icon={Calendar}
          />
        </div>
      </div>

      {/* Quick Summary Pill Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-sm text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Present</span>
          <span className="text-xl font-extrabold text-emerald-600">{presentCount}</span>
        </div>
        <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-sm text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Late</span>
          <span className="text-xl font-extrabold text-amber-500">{lateCount}</span>
        </div>
        <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-sm text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Half Day</span>
          <span className="text-xl font-extrabold text-rose-500">{halfDayCount}</span>
        </div>
        <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-sm text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">On Leave</span>
          <span className="text-xl font-extrabold text-sky-600">{onLeaveCount}</span>
        </div>
        <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-sm text-center col-span-2 sm:col-span-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Absent</span>
          <span className="text-xl font-extrabold text-slate-700">{absentCount}</span>
        </div>
      </div>

      <Table
        columns={columns}
        data={board}
        isLoading={loading}
        emptyMessage={`No employees registered for attendance date: ${formatDate(date)}.`}
      />
    </div>
  );
}

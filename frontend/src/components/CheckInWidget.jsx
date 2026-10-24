import React, { useState, useEffect } from 'react';
import { Clock, LogIn, LogOut, Camera, CheckCircle2 } from 'lucide-react';
import { attendanceApi } from '../api/attendance.api';
import Button from './ui/Button';
import Badge from './ui/Badge';
import CameraCheckIn from './CameraCheckIn';

export default function CheckInWidget({ todayAttendance, onRefresh }) {
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showCamera, setShowCamera] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  async function handleWebCheckIn() {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const res = await attendanceApi.checkIn({ source: 'web' });
      setSuccess(res.data.message);
      if (onRefresh) onRefresh();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to check in.');
    } finally {
      setLoading(false);
    }
  }

  async function handleWebCheckOut() {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const res = await attendanceApi.checkOut();
      setSuccess(res.data.message);
      if (onRefresh) onRefresh();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to check out.');
    } finally {
      setLoading(false);
    }
  }

  const isCheckedIn = !!todayAttendance?.check_in;
  const isCheckedOut = !!todayAttendance?.check_out;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-slate-700">
          <Clock className="w-5 h-5 text-teal-600 animate-pulse" />
          <span className="text-sm font-bold">Attendance Punch</span>
        </div>
        <span className="font-mono text-sm font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
          {time}
        </span>
      </div>

      {/* Current Status Box */}
      <div className="mb-4 p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Today's State</span>
          <span className="text-sm font-bold text-slate-800">
            {!isCheckedIn ? 'Not Checked In' : isCheckedOut ? 'Shift Completed' : 'Currently Working'}
          </span>
        </div>
        <div>
          {!isCheckedIn && <Badge variant="default">Pending</Badge>}
          {isCheckedIn && todayAttendance?.status === 'present' && <Badge variant="success">Present</Badge>}
          {isCheckedIn && todayAttendance?.status === 'late' && <Badge variant="warning">Late</Badge>}
          {isCheckedIn && todayAttendance?.status === 'half_day' && <Badge variant="danger">Half Day</Badge>}
        </div>
      </div>

      {/* Check In / Out Details */}
      {isCheckedIn && (
        <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <span className="text-slate-400 block">Check In:</span>
            <span className="font-semibold text-slate-800">{todayAttendance.check_in}</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <span className="text-slate-400 block">Check Out:</span>
            <span className="font-semibold text-slate-800">{todayAttendance.check_out || '—'}</span>
          </div>
        </div>
      )}

      {error && (
        <div className="p-2.5 mb-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
          {error}
        </div>
      )}

      {success && (
        <div className="p-2.5 mb-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-medium flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4" />
          {success}
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {!isCheckedIn ? (
          <>
            <Button
              variant="primary"
              onClick={handleWebCheckIn}
              loading={loading}
              icon={LogIn}
              className="w-full"
            >
              Web Check In
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowCamera(true)}
              disabled={loading}
              icon={Camera}
              className="w-full"
            >
              Camera Check In
            </Button>
          </>
        ) : !isCheckedOut ? (
          <Button
            variant="danger"
            onClick={handleWebCheckOut}
            loading={loading}
            icon={LogOut}
            className="w-full col-span-2"
          >
            Check Out Now
          </Button>
        ) : (
          <div className="col-span-2 text-center py-2 text-xs text-slate-500 font-medium">
            Attendance complete for today. Total logged: {todayAttendance.total_hours}h
          </div>
        )}
      </div>

      {/* Bonus Camera CheckIn Modal */}
      {showCamera && (
        <CameraCheckIn
          isOpen={showCamera}
          onClose={() => setShowCamera(false)}
          onSuccess={() => {
            setShowCamera(false);
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </div>
  );
}

import React from 'react';
import { Menu, Sparkles, User, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import NotificationBell from '../components/NotificationBell';

export default function Topbar({ onToggleSidebar, onToggleAiChat }) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 sm:px-6 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500">
          <span className="flex items-center gap-1.5 text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200/60">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            Active Session
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Ask AI Pill Button */}
        <button
          onClick={onToggleAiChat}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-teal-700 bg-gradient-to-r from-teal-50 to-indigo-50 border border-teal-200/80 hover:shadow-sm hover:from-teal-100/60 transition-all"
        >
          <Sparkles className="w-3.5 h-3.5 text-teal-600 animate-spin" />
          <span>Ask AI Assistant</span>
        </button>

        <NotificationBell />

        <div className="h-6 w-[1px] bg-slate-200 mx-1 hidden sm:block"></div>

        {/* User Avatar */}
        <div className="flex items-center gap-2.5 pl-1">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-sm">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="hidden md:block text-left">
            <span className="block text-xs font-bold text-slate-800 truncate max-w-[120px]">
              {user?.employee ? user.employee.first_name : user?.email?.split('@')[0]}
            </span>
            <span className="block text-[10px] text-slate-400 capitalize">{user?.role}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

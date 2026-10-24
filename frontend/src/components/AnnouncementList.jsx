import React from 'react';
import { Megaphone, Calendar } from 'lucide-react';
import Badge from './ui/Badge';
import { formatDate } from '../utils/formatDate';

export default function AnnouncementList({ announcements = [], emptyMessage = 'No announcements published yet.' }) {
  if (!announcements || announcements.length === 0) {
    return (
      <div className="text-center py-8 text-xs text-slate-400">
        <Megaphone className="w-6 h-6 mx-auto mb-2 text-slate-300" />
        {emptyMessage}
      </div>
    );
  }

  const priorityVariants = {
    low: 'default',
    normal: 'info',
    high: 'warning',
    urgent: 'danger'
  };

  return (
    <div className="space-y-3">
      {announcements.map((ann) => (
        <div
          key={ann.id}
          className="p-4 rounded-xl border border-slate-200/80 bg-white shadow-sm hover:border-slate-300 transition-all"
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <h4 className="text-sm font-bold text-slate-900">{ann.title}</h4>
            <Badge variant={priorityVariants[ann.priority] || 'info'} size="sm">
              {ann.priority ? ann.priority.toUpperCase() : 'NORMAL'}
            </Badge>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{ann.content}</p>
          <div className="flex items-center gap-2 mt-3 text-[11px] text-slate-400">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatDate(ann.created_at)}</span>
            {ann.target_role && ann.target_role !== 'all' && (
              <>
                <span>&bull;</span>
                <span className="uppercase font-semibold text-slate-500">Audience: {ann.target_role}</span>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

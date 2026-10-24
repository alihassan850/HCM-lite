import React from 'react';
import { Sparkles } from 'lucide-react';

export default function AiBadge({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gradient-to-r from-teal-500/10 to-indigo-500/10 text-teal-700 border border-teal-200/50 shadow-sm ${className}`}>
      <Sparkles className="w-3 h-3 text-teal-600 animate-pulse" />
      <span>AI-generated</span>
    </span>
  );
}

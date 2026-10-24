import React from 'react';

export default function DeptBarChart({ data = [], valueKey = 'headcount', labelKey = 'name', color = '#0d9488' }) {
  if (!data || data.length === 0) {
    return <div className="text-center py-8 text-xs text-slate-400">No departmental data to display</div>;
  }

  const maxVal = Math.max(...data.map(d => d[valueKey] || 0), 1);

  return (
    <div className="space-y-3 py-2">
      {data.map((item, idx) => {
        const val = item[valueKey] || 0;
        const pct = Math.max(4, Math.round((val / maxVal) * 100));

        return (
          <div key={idx} className="space-y-1">
            <div className="flex justify-between text-xs font-medium text-slate-700">
              <span className="truncate max-w-[200px]">{item[labelKey] || 'Unassigned'}</span>
              <span className="font-semibold text-slate-900">
                {typeof val === 'number' && val > 1000 ? `PKR ${val.toLocaleString()}` : val}
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

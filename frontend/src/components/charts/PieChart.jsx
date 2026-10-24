import React from 'react';

export default function PieChart({ data = [], labelKey = 'name', valueKey = 'count' }) {
  if (!data || data.length === 0) {
    return <div className="text-center py-8 text-xs text-slate-400">No distribution data</div>;
  }

  const palette = ['#0d9488', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#10b981'];
  const total = data.reduce((sum, item) => sum + (item[valueKey] || 0), 0);

  if (total === 0) {
    return <div className="text-center py-8 text-xs text-slate-400">All values are zero</div>;
  }

  let accumulatedAngle = 0;
  const slices = data.map((item, idx) => {
    const val = item[valueKey] || 0;
    const angle = (val / total) * 360;
    const startAngle = accumulatedAngle;
    accumulatedAngle += angle;
    return {
      label: item[labelKey] || 'Other',
      val,
      percentage: Math.round((val / total) * 100),
      color: palette[idx % palette.length],
      startAngle,
      angle
    };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
      {/* SVG Donut */}
      <div className="relative w-36 h-36 flex-shrink-0">
        <svg viewBox="0 0 42 42" className="w-full h-full transform -rotate-90">
          <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#f1f5f9" strokeWidth="6" />
          {slices.map((slice, idx) => {
            const dashArray = `${slice.percentage} ${100 - slice.percentage}`;
            const dashOffset = 100 - (slice.startAngle / 360) * 100;
            return (
              <circle
                key={idx}
                cx="21"
                cy="21"
                r="15.91549430918954"
                fill="transparent"
                stroke={slice.color}
                strokeWidth="6"
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                className="transition-all duration-300"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-lg font-bold text-slate-800">{total}</span>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">Total</span>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-1 gap-2 w-full text-xs">
        {slices.map((slice, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: slice.color }} />
              <span className="text-slate-600 truncate">{slice.label}</span>
            </div>
            <div className="font-semibold text-slate-900 ml-2">
              {slice.val} <span className="text-slate-400 font-normal">({slice.percentage}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

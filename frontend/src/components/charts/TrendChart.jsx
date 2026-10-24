import React from 'react';

export default function TrendChart({ data = [], height = 220 }) {
  if (!data || data.length === 0) {
    return <div className="text-center py-10 text-xs text-slate-400">No trend data available</div>;
  }

  const maxVal = Math.max(...data.map(d => Math.max(d.present || 0, d.absent || 0, d.late || 0, 5)), 10);
  const width = 600;
  const padding = 35;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const pointsPresent = data.map((d, i) => {
    const x = padding + (i / Math.max(data.length - 1, 1)) * chartWidth;
    const y = height - padding - ((d.present || 0) / maxVal) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  const pointsLate = data.map((d, i) => {
    const x = padding + (i / Math.max(data.length - 1, 1)) * chartWidth;
    const y = height - padding - ((d.late || 0) / maxVal) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-full">
      <div className="flex items-center justify-end gap-4 mb-2 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-teal-600"></span>
          <span>Present</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span>Late</span>
        </div>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = height - padding - ratio * chartHeight;
            const val = Math.round(ratio * maxVal);
            return (
              <g key={ratio}>
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                <text x={padding - 6} y={y + 3} textAnchor="end" fontSize="10" fill="#94a3b8">
                  {val}
                </text>
              </g>
            );
          })}

          {/* Lines */}
          <polyline
            fill="none"
            stroke="#0d9488"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={pointsPresent}
          />

          <polyline
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2"
            strokeDasharray="4 4"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={pointsLate}
          />

          {/* Dots */}
          {data.map((d, i) => {
            const x = padding + (i / Math.max(data.length - 1, 1)) * chartWidth;
            const yPres = height - padding - ((d.present || 0) / maxVal) * chartHeight;
            return (
              <g key={i}>
                <circle cx={x} cy={yPres} r="3.5" fill="#0d9488" className="hover:r-5 transition-all" />
                <text x={x} y={height - 12} textAnchor="middle" fontSize="9" fill="#94a3b8">
                  {d.date}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

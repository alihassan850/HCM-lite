import React from 'react';

export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  className = ''
}) {
  const base = "inline-flex items-center font-medium rounded-full";

  const variants = {
    default: "bg-slate-100 text-slate-700",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200/60",
    warning: "bg-amber-50 text-amber-700 border border-amber-200/60",
    danger: "bg-rose-50 text-rose-700 border border-rose-200/60",
    info: "bg-sky-50 text-sky-700 border border-sky-200/60",
    purple: "bg-purple-50 text-purple-700 border border-purple-200/60",
    teal: "bg-teal-50 text-teal-700 border border-teal-200/60"
  };

  const sizes = {
    sm: "px-2 py-0.5 text-[11px]",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3 py-1 text-sm"
  };

  return (
    <span className={`${base} ${variants[variant] || variants.default} ${sizes[size] || sizes.md} ${className}`}>
      {children}
    </span>
  );
}

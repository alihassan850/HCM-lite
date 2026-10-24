import React from 'react';

export default function Spinner({ size = 'md', className = '', label = 'Loading...' }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  return (
    <div className={`flex flex-col items-center justify-center p-4 gap-2 ${className}`}>
      <svg
        className={`animate-spin text-teal-600 ${sizes[size] || sizes.md}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v8H4z"
        ></path>
      </svg>
      {label && <span className="text-xs font-medium text-slate-500">{label}</span>}
    </div>
  );
}

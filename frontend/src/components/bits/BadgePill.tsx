import React from 'react';

interface BadgePillProps {
  status: 'SETTLED' | 'PENDING' | 'ESCALATED' | 'INFO' | 'AI' | 'CAPTURED';
  label?: string;
  className?: string;
}

export const BadgePill: React.FC<BadgePillProps> = ({ status, label, className = '' }) => {
  const getStyles = () => {
    switch (status) {
      case 'SETTLED':
      case 'CAPTURED':
        return {
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
          dot: 'bg-emerald-400',
          text: label || 'SETTLED',
        };
      case 'PENDING':
        return {
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
          dot: 'bg-amber-400',
          text: label || 'PENDING',
        };
      case 'ESCALATED':
        return {
          bg: 'bg-rose-500/10 text-rose-400 border-rose-500/25',
          dot: 'bg-rose-400',
          text: label || 'ESCALATED',
        };
      case 'AI':
        return {
          bg: 'bg-purple-500/10 text-purple-400 border-purple-500/25',
          dot: 'bg-purple-400',
          text: label || 'GEMINI AI',
        };
      default:
        return {
          bg: 'bg-blue-500/10 text-blue-400 border-blue-500/25',
          dot: 'bg-blue-400',
          text: label || 'ACTIVE',
        };
    }
  };

  const style = getStyles();

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border ${style.bg} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {style.text}
    </span>
  );
};

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
          bg: 'bg-[var(--settled)]/10 text-[var(--settled)] border-[var(--settled)]/25',
          dot: 'bg-[var(--settled)]',
          text: label || 'SETTLED',
        };
      case 'PENDING':
        return {
          bg: 'bg-[var(--surface-elevated)] text-[var(--muted)] border-[var(--border)]',
          dot: 'bg-[var(--muted)]',
          text: label || 'PENDING',
        };
      case 'ESCALATED':
        return {
          bg: 'bg-[var(--owes)]/10 text-[var(--owes)] border-[var(--owes)]/25',
          dot: 'bg-[var(--owes)]',
          text: label || 'ESCALATED',
        };
      case 'AI':
        return {
          bg: 'bg-[var(--surface-elevated)] text-[var(--text)] border-[var(--border)]',
          dot: 'bg-[var(--text)]',
          text: label || 'GEMINI AI',
        };
      default:
        return {
          bg: 'bg-[var(--surface-elevated)] text-[var(--text)] border-[var(--border)]',
          dot: 'bg-[var(--text)]',
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

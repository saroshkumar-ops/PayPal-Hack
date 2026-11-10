import React from 'react';
import { cn } from '../../lib/utils';

export type StatusVariant = 'paid' | 'owes' | 'pending' | 'active' | 'organizer';

export interface StatusPillProps {
  status: StatusVariant;
  label?: string;
  className?: string;
  dotOnly?: boolean;
}

export const StatusPill: React.FC<StatusPillProps> = ({
  status,
  label,
  className,
  dotOnly = false,
}) => {
  const configs: Record<
    StatusVariant,
    { bg: string; text: string; border: string; dot: string; defaultLabel: string }
  > = {
    paid: {
      bg: 'bg-[var(--settled)]/10',
      text: 'text-[var(--settled)]',
      border: 'border-[var(--settled)]/30',
      dot: 'bg-[var(--settled)]',
      defaultLabel: 'Settled',
    },
    owes: {
      bg: 'bg-[var(--owes)]/10',
      text: 'text-[var(--owes)]',
      border: 'border-[var(--owes)]/30',
      dot: 'bg-[var(--owes)]',
      defaultLabel: 'Owes',
    },
    pending: {
      bg: 'bg-white/5',
      text: 'text-[var(--muted)]',
      border: 'border-[var(--border)]',
      dot: 'bg-[var(--muted)]',
      defaultLabel: 'Pending',
    },
    active: {
      bg: 'bg-white/5',
      text: 'text-[var(--text)]',
      border: 'border-white/20',
      dot: 'bg-white/70',
      defaultLabel: 'Active',
    },
    organizer: {
      bg: 'bg-[var(--surface-elevated)]',
      text: 'text-[var(--text)]',
      border: 'border-[var(--border)]',
      dot: 'bg-white/60',
      defaultLabel: 'Organizer',
    },
  };

  const current = configs[status] || configs.pending;
  const displayLabel = label || current.defaultLabel;

  if (dotOnly) {
    return (
      <span
        className={cn('inline-block w-2 h-2 rounded-full', current.dot, className)}
        title={displayLabel}
      />
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs sm:text-sm font-mono font-medium border select-none',
        current.bg,
        current.text,
        current.border,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', current.dot)} />
      <span className="font-semibold tracking-tight">{displayLabel}</span>
    </span>
  );
};

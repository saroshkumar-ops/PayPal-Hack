import React from 'react';
import { cn } from '../../lib/utils';

export type StatusVariant = 'paid' | 'owes' | 'pending' | 'escrow' | 'active' | 'organizer';

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
      bg: 'bg-[#C6FF3D]/10',
      text: 'text-[#C6FF3D]',
      border: 'border-[#C6FF3D]/30',
      dot: 'bg-[#C6FF3D]',
      defaultLabel: 'Settled',
    },
    owes: {
      bg: 'bg-[#FF5C7A]/10',
      text: 'text-[#FF5C7A]',
      border: 'border-[#FF5C7A]/30',
      dot: 'bg-[#FF5C7A]',
      defaultLabel: 'Owes',
    },
    pending: {
      bg: 'bg-white/5',
      text: 'text-[#8A8FA3]',
      border: 'border-white/10',
      dot: 'bg-[#8A8FA3]',
      defaultLabel: 'Pending',
    },
    escrow: {
      bg: 'bg-[#FFC439]/10',
      text: 'text-[#FFC439]',
      border: 'border-[#FFC439]/30',
      dot: 'bg-[#FFC439]',
      defaultLabel: 'In Escrow',
    },
    active: {
      bg: 'bg-[#C6FF3D]/10',
      text: 'text-[#C6FF3D]',
      border: 'border-[#C6FF3D]/30',
      dot: 'bg-[#C6FF3D]',
      defaultLabel: 'Live',
    },
    organizer: {
      bg: 'bg-[#171A23]',
      text: 'text-[#EDEEF2]',
      border: 'border-white/16',
      dot: 'bg-[#C6FF3D]',
      defaultLabel: 'Organizer',
    },
  };

  const config = configs[status] || configs.pending;
  const displayLabel = label || config.defaultLabel;

  if (dotOnly) {
    return (
      <span className={cn('relative flex h-2 w-2', className)}>
        <span
          className={cn(
            'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
            config.dot
          )}
        />
        <span className={cn('relative inline-flex rounded-full h-2 w-2', config.dot)} />
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium border tracking-tight',
        config.bg,
        config.text,
        config.border,
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', config.dot)} />
      <span>{displayLabel}</span>
    </span>
  );
};

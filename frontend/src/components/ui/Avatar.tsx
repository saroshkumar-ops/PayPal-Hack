import React from 'react';
import { cn } from '../../lib/utils';

export interface AvatarProps {
  userId?: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showStatus?: boolean;
  status?: 'paid' | 'owes' | 'pending';
  className?: string;
}

// 6 deterministic member tag tokens (cycled in order, no orange)
export const MEMBER_TAG_PALETTE = [
  { token: 'cyan', bg: 'rgba(56, 225, 255, 0.12)', text: 'var(--tag-cyan)', border: 'rgba(56, 225, 255, 0.35)' },
  { token: 'blue', bg: 'rgba(91, 140, 255, 0.12)', text: 'var(--tag-blue)', border: 'rgba(91, 140, 255, 0.35)' },
  { token: 'purple', bg: 'rgba(162, 123, 255, 0.12)', text: 'var(--tag-purple)', border: 'rgba(162, 123, 255, 0.35)' },
  { token: 'pink', bg: 'rgba(244, 114, 208, 0.12)', text: 'var(--tag-pink)', border: 'rgba(244, 114, 208, 0.35)' },
  { token: 'sand', bg: 'rgba(232, 213, 163, 0.12)', text: 'var(--tag-sand)', border: 'rgba(232, 213, 163, 0.35)' },
  { token: 'teal', bg: 'rgba(45, 212, 191, 0.12)', text: 'var(--tag-teal)', border: 'rgba(45, 212, 191, 0.35)' },
];

export function getMemberTagColor(identifier: string) {
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = (hash << 5) - hash + identifier.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % MEMBER_TAG_PALETTE.length;
  return MEMBER_TAG_PALETTE[index];
}

export const Avatar: React.FC<AvatarProps> = ({
  userId,
  name,
  size = 'md',
  showStatus = false,
  status = 'pending',
  className,
}) => {
  const identifier = userId || name || 'User';
  const color = getMemberTagColor(identifier);

  // Extract 1 or 2 uppercase initials
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || name.slice(0, 1).toUpperCase() || 'U';

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-xs sm:text-sm',
    lg: 'w-12 h-12 text-sm sm:text-base',
    xl: 'w-16 h-16 text-lg',
  };

  const statusDotColors = {
    paid: 'bg-[var(--settled)]',
    owes: 'bg-[var(--owes)]',
    pending: 'bg-[var(--muted)]',
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center shrink-0 select-none', className)}>
      <div
        style={{
          backgroundColor: color.bg,
          borderColor: color.border,
          color: color.text,
        }}
        className={cn(
          'rounded-xl border flex items-center justify-center font-mono font-bold tracking-tight transition-transform',
          sizeClasses[size]
        )}
      >
        <span>{initials}</span>
      </div>

      {showStatus && (
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-[var(--canvas)]',
            statusDotColors[status]
          )}
          title={`Status: ${status}`}
        />
      )}
    </div>
  );
};

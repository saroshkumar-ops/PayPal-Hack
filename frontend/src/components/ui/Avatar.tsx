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

// 8 distinct deterministic colors derived from cyber ledger family
const AVATAR_PALETTE = [
  { bg: 'rgba(198, 255, 61, 0.15)', text: '#C6FF3D', border: 'rgba(198, 255, 61, 0.4)' }, // Acid Lime
  { bg: 'rgba(56, 225, 255, 0.15)', text: '#38E1FF', border: 'rgba(56, 225, 255, 0.4)' }, // Cyan Electric
  { bg: 'rgba(255, 155, 66, 0.15)', text: '#FF9B42', border: 'rgba(255, 155, 66, 0.4)' }, // Sunset Amber
  { bg: 'rgba(183, 198, 211, 0.15)', text: '#B7C6D3', border: 'rgba(183, 198, 211, 0.4)' }, // Titanium Slate
  { bg: 'rgba(255, 92, 122, 0.15)', text: '#FF5C7A', border: 'rgba(255, 92, 122, 0.4)' }, // Coral Owes
  { bg: 'rgba(162, 123, 255, 0.15)', text: '#A27BFF', border: 'rgba(162, 123, 255, 0.4)' }, // Cyber Orchid
  { bg: 'rgba(78, 106, 131, 0.25)', text: '#B7C6D3', border: 'rgba(78, 106, 131, 0.5)' }, // Deep Steel
  { bg: 'rgba(255, 196, 57, 0.15)', text: '#FFC439', border: 'rgba(255, 196, 57, 0.4)' }, // PayPal Gold
];

function getPaletteIndex(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % AVATAR_PALETTE.length;
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
  const color = AVATAR_PALETTE[getPaletteIndex(identifier)];

  // Get 1 or 2 initials
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || '?';

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-xs sm:text-sm',
    lg: 'w-12 h-12 text-sm sm:text-base font-bold',
    xl: 'w-16 h-16 text-lg font-bold',
  };

  const statusColors = {
    paid: 'bg-[#C6FF3D]',
    owes: 'bg-[#FF5C7A]',
    pending: 'bg-[#8A8FA3]',
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center shrink-0', className)}>
      <div
        style={{
          backgroundColor: color.bg,
          color: color.text,
          borderColor: color.border,
        }}
        className={cn(
          'rounded-xl border font-mono font-semibold flex items-center justify-center select-none tracking-tight shadow-sm',
          sizeClasses[size]
        )}
      >
        {initials}
      </div>

      {showStatus && (
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[#0F1117]',
            statusColors[status]
          )}
        />
      )}
    </div>
  );
};

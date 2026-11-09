import React from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  accentBorder?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive = false, accentBorder = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'relative rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5 sm:p-6 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.6)] overflow-hidden',
          interactive &&
            'transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:shadow-[0_12px_40px_-6px_rgba(0,0,0,0.8)]',
          accentBorder && 'border-white/20',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

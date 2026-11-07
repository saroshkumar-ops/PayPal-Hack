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
          'relative rounded-2xl bg-[#0F1117]/90 backdrop-blur-md border border-white/8 p-5 sm:p-6 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.6)] overflow-hidden',
          interactive &&
            'transition-all duration-200 hover:-translate-y-0.5 hover:border-white/16 hover:shadow-[0_12px_40px_-6px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.12)]',
          accentBorder && 'border-[#C6FF3D]/40 shadow-[0_0_24px_rgba(198,255,61,0.1)]',
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

import React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, rightElement, error, type, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        <div className="relative flex items-center w-full">
          {icon && (
            <div className="absolute left-3.5 text-[var(--muted)] pointer-events-none flex items-center justify-center">
              {icon}
            </div>
          )}

          <input
            type={type}
            ref={ref}
            className={cn(
              'w-full bg-[var(--canvas)] border border-[var(--border)] rounded-xl py-2.5 px-3.5 text-xs sm:text-sm text-[var(--text)] placeholder-[var(--muted)] font-body transition-all duration-150',
              'hover:border-white/16',
              'focus:outline-none focus:border-white/35 focus:ring-1 focus:ring-white/20',
              icon && 'pl-10',
              rightElement && 'pr-11',
              error && 'border-[var(--owes)] focus:border-[var(--owes)] focus:ring-[var(--owes)]/20',
              className
            )}
            {...props}
          />

          {rightElement && (
            <div className="absolute right-3.5 flex items-center justify-center">
              {rightElement}
            </div>
          )}
        </div>

        {error && <p className="text-[11px] text-[var(--owes)] font-mono mt-1">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

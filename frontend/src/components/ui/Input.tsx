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
            <div className="absolute left-3.5 text-[#8A8FA3] pointer-events-none flex items-center justify-center">
              {icon}
            </div>
          )}

          <input
            type={type}
            ref={ref}
            className={cn(
              'w-full bg-[#07080D] border border-white/8 rounded-xl py-2.5 px-3.5 text-xs sm:text-sm text-[#EDEEF2] placeholder-[#8A8FA3] font-body transition-all duration-150',
              'hover:border-white/16',
              'focus:outline-none focus:border-[#C6FF3D] focus:shadow-[0_0_20px_-2px_rgba(198,255,61,0.25)]',
              icon && 'pl-10',
              rightElement && 'pr-11',
              error && 'border-[#FF5C7A] focus:border-[#FF5C7A] focus:shadow-[0_0_20px_-2px_rgba(255,92,122,0.25)]',
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

        {error && <p className="text-[11px] text-[#FF5C7A] font-mono mt-1">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

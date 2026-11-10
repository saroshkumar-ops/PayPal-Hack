import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '../../lib/utils';

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'paypal' | 'owes' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'secondary',
      size = 'md',
      children,
      icon,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center transition-all select-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none rounded-xl';

    const sizeStyles = {
      sm: 'text-xs sm:text-sm px-3.5 py-1.5 gap-1.5 font-mono font-medium',
      md: 'text-sm sm:text-base px-4 py-2.5 gap-2 font-body font-semibold tracking-tight',
      lg: 'text-base sm:text-lg px-6 py-3.5 gap-2.5 font-body font-bold tracking-tight',
    };

    const variantStyles = {
      // ONE Lime-filled button per screen for the primary action
      primary:
        'bg-[var(--settled)] text-[var(--canvas)] font-body font-bold hover:brightness-105 active:scale-[0.98] border border-[var(--settled)]',
      // Secondary action: dark elevated surface with hairline border
      secondary:
        'bg-[var(--surface-elevated)] text-[var(--text)] border border-[var(--border)] hover:border-white/20 hover:bg-white/5 active:scale-[0.98]',
      // Dedicated PayPal Gold (#FFC439) strictly for PayPal checkouts and payouts
      paypal:
        'bg-[var(--paypal)] text-[var(--canvas)] font-body font-bold hover:brightness-105 active:scale-[0.98] border border-[var(--paypal)]',
      // Destructive confirmation button inside dialogs only
      owes:
        'bg-[var(--owes)] text-white font-body font-bold hover:brightness-105 active:scale-[0.98] border border-[var(--owes)]',
      ghost:
        'bg-transparent text-[var(--muted)] hover:text-[var(--text)] hover:bg-white/5 border border-transparent',
      outline:
        'bg-transparent text-[var(--text)] border border-[var(--border)] hover:border-white/30 hover:bg-white/5',
    };

    return (
      <motion.button
        ref={ref}
        whileHover={disabled ? undefined : { y: -1 }}
        whileTap={disabled ? undefined : { scale: 0.98 }}
        transition={{ duration: 0.12, ease: 'easeOut' }}
        className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
        disabled={disabled}
        {...props}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        <span>{children}</span>
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

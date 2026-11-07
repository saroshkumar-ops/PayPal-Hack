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
      'inline-flex items-center justify-center font-medium transition-all select-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none rounded-xl';

    const sizeStyles = {
      sm: 'text-xs px-3 py-1.5 gap-1.5 font-medium tracking-tight',
      md: 'text-xs sm:text-sm px-4 py-2.5 gap-2 font-semibold tracking-tight',
      lg: 'text-sm sm:text-base px-6 py-3.5 gap-2.5 font-bold tracking-tight',
    };

    const variantStyles = {
      // 10% Acid Lime reserved for primary conversion actions
      primary:
        'bg-[#C6FF3D] text-[#07080D] font-display font-semibold hover:bg-[#b8f52f] shadow-[0_0_24px_rgba(198,255,61,0.25)] hover:shadow-[0_0_32px_rgba(198,255,61,0.4)] border border-[#C6FF3D]',
      // 30% Dark surface with hairline border
      secondary:
        'bg-[#171A23] text-[#EDEEF2] border border-white/8 hover:border-white/16 hover:bg-[#1f232f] hover:text-white',
      // Strict PayPal Gold (#FFC439) for checkout actions
      paypal:
        'bg-[#FFC439] text-[#07080D] font-bold hover:bg-[#f5b828] shadow-[0_0_20px_rgba(255,196,57,0.25)] border border-[#FFC439]',
      // Debt / Owes action (Coral #FF5C7A)
      owes:
        'bg-[#FF5C7A] text-[#07080D] font-bold hover:bg-[#f04f6e] shadow-[0_0_20px_rgba(255,92,122,0.25)] border border-[#FF5C7A]',
      ghost:
        'bg-transparent text-[#8A8FA3] hover:text-[#EDEEF2] hover:bg-white/4 border border-transparent',
      outline:
        'bg-transparent text-[#EDEEF2] border border-white/12 hover:border-[#C6FF3D] hover:text-[#C6FF3D]',
    };

    return (
      <motion.button
        ref={ref}
        whileHover={disabled ? undefined : { y: -1 }}
        whileTap={disabled ? undefined : { y: 1, scale: 0.98 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
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

import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
}) => {
  const sizeMap = {
    sm: { icon: 26, text: 'text-xs' },
    md: { icon: 32, text: 'text-sm' },
    lg: { icon: 40, text: 'text-base' },
    xl: { icon: 48, text: 'text-xl' },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 ${className} select-none`}>
      {/* Precision Ledger Emblem */}
      <svg
        width={currentSize.icon}
        height={currentSize.icon}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <defs>
          <linearGradient id="sheriff-shield-bg" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--surface-elevated, #171A23)" />
            <stop offset="100%" stopColor="var(--canvas, #07080D)" />
          </linearGradient>
        </defs>

        {/* Outer Shield Frame */}
        <rect
          x="3"
          y="3"
          width="42"
          height="42"
          rx="12"
          fill="url(#sheriff-shield-bg)"
          stroke="var(--border, rgba(255, 255, 255, 0.08))"
          strokeWidth="1.2"
        />

        {/* Reticle Guideline */}
        <circle cx="24" cy="24" r="13" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" strokeDasharray="3 3" />

        {/* Compass Diamond */}
        <path
          d="M24 10L27 20L37 24L27 28L24 38L21 28L11 24L21 20L24 10Z"
          fill="var(--text, #EDEEF2)"
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="1"
        />

        {/* Core Center Dot (Clean crisp white, not decorative lime) */}
        <circle cx="24" cy="24" r="3" fill="var(--canvas, #07080D)" stroke="var(--text, #EDEEF2)" strokeWidth="1.5" />

        {/* Micro Corner Registry Marks */}
        <circle cx="15" cy="15" r="1" fill="var(--muted, #8A8FA3)" />
        <circle cx="33" cy="15" r="1" fill="var(--muted, #8A8FA3)" />
        <circle cx="15" cy="33" r="1" fill="var(--muted, #8A8FA3)" />
        <circle cx="33" cy="33" r="1" fill="var(--muted, #8A8FA3)" />
      </svg>

      {showText && (
        <div>
          <div className={`font-display font-bold tracking-tight text-[var(--text)] flex items-center gap-1.5 leading-tight ${currentSize.text}`}>
            <span>TripSheriff</span>
          </div>
          <div className="text-xs text-[var(--muted)] font-mono tracking-wider uppercase font-medium">
            Travel Expenses
          </div>
        </div>
      )}
    </div>
  );
};

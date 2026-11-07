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
    md: { icon: 34, text: 'text-sm' },
    lg: { icon: 42, text: 'text-base' },
    xl: { icon: 52, text: 'text-xl' },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Cyber Ledger Shield Emblem */}
      <svg
        width={currentSize.icon}
        height={currentSize.icon}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <defs>
          <linearGradient id="cyber-shield-bg" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#171A23" />
            <stop offset="100%" stopColor="#07080D" />
          </linearGradient>
        </defs>

        {/* Outer Shield Frame */}
        <rect
          x="3"
          y="3"
          width="42"
          height="42"
          rx="12"
          fill="url(#cyber-shield-bg)"
          stroke="rgba(255, 255, 255, 0.12)"
          strokeWidth="1.2"
        />

        {/* Inner Subtle Reticle Ring */}
        <circle cx="24" cy="24" r="13" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" strokeDasharray="3 3" />

        {/* Cyber Compass Diamond */}
        <path
          d="M24 10L27 20L37 24L27 28L24 38L21 28L11 24L21 20L24 10Z"
          fill="#EDEEF2"
          stroke="rgba(255, 255, 255, 0.16)"
          strokeWidth="1"
        />

        {/* Acid-Lime Core Center Pulse Dot */}
        <circle cx="24" cy="24" r="3.5" fill="#C6FF3D" />

        {/* Precision Micro Corner Dots */}
        <circle cx="15" cy="15" r="1" fill="#8A8FA3" />
        <circle cx="33" cy="15" r="1" fill="#8A8FA3" />
        <circle cx="15" cy="33" r="1" fill="#8A8FA3" />
        <circle cx="33" cy="33" r="1" fill="#8A8FA3" />
      </svg>

      {showText && (
        <div>
          <div className={`font-display font-bold tracking-tight text-[#EDEEF2] flex items-center gap-1.5 leading-tight ${currentSize.text}`}>
            <span>TripSheriff</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#C6FF3D]" />
          </div>
          <div className="text-[10px] text-[#8A8FA3] font-mono tracking-widest uppercase">
            Cyber Ledger
          </div>
        </div>
      )}
    </div>
  );
};

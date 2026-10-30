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
    sm: { icon: 28, text: 'text-xs' },
    md: { icon: 36, text: 'text-sm' },
    lg: { icon: 44, text: 'text-base' },
    xl: { icon: 56, text: 'text-xl' },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Bespoke Geometric Sheriff-Compass Fintech Shield Emblem */}
      <svg
        width={currentSize.icon}
        height={currentSize.icon}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <defs>
          <linearGradient id="ts-shield-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1F2C38" />
            <stop offset="100%" stopColor="#10161C" />
          </linearGradient>
          <linearGradient id="ts-star-grad" x1="14" y1="14" x2="34" y2="34" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#E7EDF2" />
            <stop offset="100%" stopColor="#8199AE" />
          </linearGradient>
        </defs>

        {/* Outer Shield Container */}
        <rect
          x="3"
          y="3"
          width="42"
          height="42"
          rx="12"
          fill="url(#ts-shield-grad)"
          stroke="#33475A"
          strokeWidth="1.5"
        />

        {/* Inner Subtle Ring */}
        <circle cx="24" cy="24" r="14" stroke="#4E6A83" strokeWidth="1" strokeDasharray="2 2" opacity="0.6" />

        {/* 6-Pointed Geometric Sheriff Star / Compass */}
        {/* Vertical/Horizontal Diamond Points */}
        <path
          d="M24 10L27 20L37 24L27 28L24 38L21 28L11 24L21 20L24 10Z"
          fill="url(#ts-star-grad)"
          stroke="#33475A"
          strokeWidth="1"
        />

        {/* Diagonal Subtle Cross Facets */}
        <circle cx="24" cy="24" r="3" fill="#1F2C38" stroke="#E7EDF2" strokeWidth="1.2" />

        {/* 4 Corner Constellation Dots */}
        <circle cx="15" cy="15" r="1.2" fill="#8199AE" />
        <circle cx="33" cy="15" r="1.2" fill="#8199AE" />
        <circle cx="15" cy="33" r="1.2" fill="#8199AE" />
        <circle cx="33" cy="33" r="1.2" fill="#8199AE" />
      </svg>

      {showText && (
        <div>
          <div className={`font-bold tracking-tight text-[#E7EDF2] leading-tight ${currentSize.text}`}>
            TripSheriff <span className="text-[#8199AE] font-semibold">AI</span>
          </div>
          <div className="text-[10px] text-[#8199AE] tracking-wide uppercase font-mono">
            Travel Treasury
          </div>
        </div>
      )}
    </div>
  );
};

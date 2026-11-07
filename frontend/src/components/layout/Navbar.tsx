import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Terminal, 
  LayoutDashboard, 
  ReceiptText, 
  CreditCard, 
  Clock, 
  Users,
  Maximize2, 
  Minimize2,
  LogIn,
  LogOut 
} from 'lucide-react';
import { Logo } from '../common/Logo';
import { Button } from '../ui/Button';
import type { AuthResponseDto } from '../../types';

interface NavbarProps {
  tripName?: string;
  hoursElapsed: number;
  isBackendConnected: boolean;
  onOpenReceiptModal: () => void;
  onNewParty?: () => void;
  currentUser?: AuthResponseDto | null;
  onOpenAuthModal?: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  tripName,
  hoursElapsed,
  isBackendConnected,
  onOpenReceiptModal,
  onNewParty,
  currentUser,
  onOpenAuthModal,
  onLogout,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const navLinks = [
    { to: '/', label: 'Overview', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
    { to: '/simulator', label: 'Judge Simulator', icon: <Terminal className="w-3.5 h-3.5" /> },
    { to: '/ledger', label: 'Ledger & AG Grid', icon: <CreditCard className="w-3.5 h-3.5" /> },
    { to: '/payouts', label: 'Payouts & Events', icon: <ReceiptText className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/8 bg-[#07080D]/90 backdrop-blur-xl px-4 sm:px-6 lg:px-8 py-3">
      <div className="w-full flex items-center justify-between gap-3">
        {/* Brand Identity & Active Party Name */}
        <div className="flex items-center gap-3">
          <NavLink to="/" className="no-underline flex items-center">
            <Logo size="md" />
          </NavLink>

          {tripName && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0F1117] border border-white/8 text-[11px] font-mono text-[#EDEEF2]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C6FF3D]" />
              <span className="text-[#8A8FA3]">Party:</span>
              <span className="font-semibold truncate max-w-[140px]">{tripName}</span>
            </div>
          )}
        </div>

        {/* Desktop Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-[#0F1117] border border-white/8">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all no-underline ${
                  isActive
                    ? 'bg-[#171A23] text-[#C6FF3D] font-semibold border border-white/8 shadow-sm'
                    : 'text-[#8A8FA3] hover:text-[#EDEEF2] hover:bg-white/4'
                }`
              }
            >
              {link.icon}
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Actions & Utilities */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* New Party Action Button */}
          {onNewParty && (
            <button
              onClick={onNewParty}
              title="Create a new party and group ledger"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0F1117] hover:bg-[#171A23] border border-white/8 text-[#EDEEF2] text-xs font-mono font-medium transition-all cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-[#C6FF3D]" />
              <span>New Party</span>
            </button>
          )}

          {/* Scan Receipt Action Button */}
          <Button
            variant="primary"
            size="sm"
            onClick={onOpenReceiptModal}
            icon={<ReceiptText className="w-3.5 h-3.5" />}
            className="text-xs font-display font-semibold"
          >
            Scan Receipt
          </Button>

          {/* Virtual Time Advance Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#0F1117] border border-white/8 text-[11px] sm:text-xs text-[#EDEEF2] font-mono">
            <Clock className="w-3.5 h-3.5 text-[#8A8FA3]" />
            <span className="tabular-nums">+{hoursElapsed}h</span>
          </div>

          {/* Backend Connectivity Status */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#0F1117] border border-white/8 text-[11px] sm:text-xs font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                isBackendConnected ? 'bg-[#C6FF3D] shadow-[0_0_8px_#C6FF3D]' : 'bg-[#FF5C7A]'
              }`}
            />
            <span className="text-[#8A8FA3]">
              {isBackendConnected ? 'Core Live' : 'Offline'}
            </span>
          </div>

          {/* Authentication Status / Sign In */}
          {currentUser ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#0F1117] border border-white/8 text-[11px] sm:text-xs font-mono text-[#EDEEF2]">
              <div className="w-4 h-4 rounded-full bg-[#171A23] border border-[#C6FF3D]/40 flex items-center justify-center text-[10px] text-[#C6FF3D] font-bold">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="truncate max-w-[90px] text-[#C6FF3D] font-medium hidden sm:inline">
                {currentUser.handle || currentUser.name}
              </span>
              {onLogout && (
                <button
                  onClick={onLogout}
                  title="Sign Out"
                  className="ml-1 p-0.5 text-[#8A8FA3] hover:text-[#FF5C7A] transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            onOpenAuthModal && (
              <button
                onClick={onOpenAuthModal}
                title="Sign In / Register"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0F1117] hover:bg-[#171A23] border border-white/8 text-[#EDEEF2] text-xs font-mono font-medium transition-all cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-[#C6FF3D]" />
                <span>Sign In</span>
              </button>
            )
          )}

          {/* Fullscreen Mode Button */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Full Screen' : 'Toggle Full Screen'}
            className="flex items-center justify-center p-2 rounded-xl bg-[#0F1117] hover:bg-[#171A23] border border-white/8 text-[#8A8FA3] hover:text-[#EDEEF2] transition-colors cursor-pointer"
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

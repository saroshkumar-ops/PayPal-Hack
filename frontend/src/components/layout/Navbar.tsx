import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Terminal, 
  LayoutDashboard, 
  ReceiptText, 
  CreditCard, 
  Clock, 
  CheckCircle2, 
  Bot,
  Plus,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { Logo } from '../common/Logo';

interface NavbarProps {
  hoursElapsed: number;
  isBackendConnected: boolean;
  onOpenReceiptModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  hoursElapsed,
  isBackendConnected,
  onOpenReceiptModal,
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
    { to: '/', label: 'Overview', shortLabel: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { to: '/simulator', label: 'Judge Simulator', shortLabel: 'Simulator', icon: <Terminal className="w-4 h-4" /> },
    { to: '/ledger', label: 'Ledger & AG Grid', shortLabel: 'Ledger', icon: <CreditCard className="w-4 h-4" /> },
    { to: '/payouts', label: 'Payouts & Events', shortLabel: 'Payouts', icon: <ReceiptText className="w-4 h-4" /> },
  ];

  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-[#33475A] bg-[#10161C]/95 backdrop-blur-md px-4 sm:px-6 lg:px-8 xl:px-10 py-3">
        <div className="w-full flex items-center justify-between gap-3">
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <NavLink to="/" className="no-underline flex items-center">
              <Logo size="md" />
            </NavLink>
          </div>

          {/* Desktop Navigation Tabs (Hidden on mobile) */}
          <nav className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-[#1F2C38] border border-[#33475A]">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all no-underline ${
                    isActive
                      ? 'bg-[#4E6A83] text-[#E7EDF2] shadow-sm'
                      : 'text-[#8199AE] hover:text-[#B7C6D3] hover:bg-[#33475A]/40'
                  }`
                }
              >
                {link.icon}
                <span>{link.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Actions & Utilities */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile Scan Button */}
            <button
              onClick={onOpenReceiptModal}
              title="Scan Receipt"
              className="md:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#1F2C38] hover:bg-[#33475A] border border-[#33475A] text-[#E7EDF2] text-xs font-medium transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#8199AE]" />
              <span className="text-[11px]">Scan</span>
            </button>

            {/* Desktop Scan Button */}
            <button
              onClick={onOpenReceiptModal}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1F2C38] hover:bg-[#33475A] border border-[#33475A] text-[#E7EDF2] text-xs font-medium transition-all cursor-pointer"
            >
              <ReceiptText className="w-3.5 h-3.5 text-[#8199AE]" />
              <span>Scan Receipt</span>
            </button>

            {/* Time Counter */}
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#1F2C38] border border-[#33475A] text-[11px] sm:text-xs text-[#E7EDF2] font-mono">
              <Clock className="w-3.5 h-3.5 text-[#8199AE]" />
              <span>+{hoursElapsed}h</span>
            </div>

            {/* Backend Status (Desktop) */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#1F2C38] border border-[#33475A] text-[11px] sm:text-xs font-mono">
              {isBackendConnected ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#8199AE]" />
                  <span className="text-[#E7EDF2]">Java Live</span>
                </>
              ) : (
                <>
                  <Bot className="w-3.5 h-3.5 text-[#8199AE]" />
                  <span className="text-[#8199AE]">Autonomous</span>
                </>
              )}
            </div>

            {/* PC Fullscreen Mode Button */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Full Screen' : 'Toggle Full Screen (PC)'}
              className="flex items-center justify-center p-2 rounded-lg bg-[#1F2C38] hover:bg-[#33475A] border border-[#33475A] text-[#8199AE] hover:text-[#E7EDF2] transition-colors cursor-pointer"
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

      {/* Mobile Bottom Navigation Dock (Fixed at bottom on phones) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#10161C]/95 backdrop-blur-xl border-t border-[#33475A] px-2 py-1.5 flex items-center justify-around shadow-2xl">
        {navLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all no-underline ${
                isActive
                  ? 'text-[#E7EDF2] bg-[#4E6A83]/30 font-semibold'
                  : 'text-[#8199AE] hover:text-[#B7C6D3]'
              }`
            }
          >
            <div className="w-5 h-5 flex items-center justify-center mb-0.5">
              {link.icon}
            </div>
            <span className="text-[10px] tracking-tight">{link.shortLabel}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
};

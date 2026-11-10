import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Terminal, 
  LayoutDashboard, 
  ReceiptText, 
  CreditCard, 
  Users,
  Maximize2, 
  Minimize2,
  LogOut,
  Compass,
  ChevronDown
} from 'lucide-react';
import { Logo } from '../common/Logo';
import { Button } from '../ui/Button';
import { formatPartyName } from '../../lib/formatters';
import type { AuthResponseDto } from '../../types';

interface NavbarProps {
  tripName?: string;
  onOpenReceiptModal: () => void;
  onNewParty?: () => void;
  onOpenAllParties?: () => void;
  partyCount?: number;
  currentUser?: AuthResponseDto | null;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  tripName,
  onOpenReceiptModal,
  onNewParty,
  onOpenAllParties,
  partyCount,
  currentUser,
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
    { to: '/simulator', label: 'Simulator', icon: <Terminal className="w-3.5 h-3.5" /> },
    { to: '/ledger', label: 'Expenses', icon: <CreditCard className="w-3.5 h-3.5" /> },
    { to: '/payouts', label: 'Payouts', icon: <ReceiptText className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[var(--border)] bg-[var(--canvas)] px-4 sm:px-6 lg:px-8 py-3">
      <div className="w-full flex items-center justify-between gap-3">
        {/* Brand Identity & Active Trip Name Switcher */}
        <div className="flex items-center gap-3">
          <NavLink to="/" className="no-underline flex items-center">
            <Logo size="md" />
          </NavLink>

          {tripName ? (
            <button
              type="button"
              onClick={onOpenAllParties}
              title="Click to view all parties or switch"
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--surface-elevated)] hover:bg-white/10 border border-[var(--border)] text-sm font-mono text-[var(--text)] transition-colors cursor-pointer"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
              <span className="font-semibold truncate max-w-[160px]">{formatPartyName(tripName)}</span>
              {onOpenAllParties && <ChevronDown className="w-3 h-3 text-[var(--muted)] ml-0.5" />}
            </button>
          ) : null}
        </div>

        {/* Desktop Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-body transition-all no-underline ${
                  isActive
                    ? 'bg-[var(--surface-elevated)] text-[var(--text)] font-semibold border border-[var(--border)]'
                    : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-white/[0.04]'
                }`
              }
            >
              {link.icon}
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Actions & Utilities */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* My Parties Action Button */}
          {onOpenAllParties && (
            <button
              type="button"
              onClick={onOpenAllParties}
              title="View all your parties and switch"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--text)] text-sm font-mono font-medium transition-all cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 text-[var(--muted)]" />
              <span className="hidden sm:inline">My Parties</span>
              {typeof partyCount === 'number' && partyCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[var(--surface-elevated)] border border-[var(--border)] text-xs font-mono text-[var(--muted)]">
                  {partyCount}
                </span>
              )}
            </button>
          )}

          {/* New Trip Action Button */}
          {onNewParty && (
            <button
              type="button"
              onClick={onNewParty}
              title="Create a new trip"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--text)] text-sm font-mono font-medium transition-all cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-[var(--muted)]" />
              <span className="hidden sm:inline">New Party</span>
            </button>
          )}

          {/* Upload Bill Secondary Action (Allows page to own the single lime button) */}
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenReceiptModal}
            icon={<ReceiptText className="w-3.5 h-3.5" />}
            className="px-2.5 sm:px-3"
          >
            <span className="hidden sm:inline">Upload Bill</span>
            <span className="sm:hidden inline">Upload</span>
          </Button>

          {/* Authentication Status / Sign In */}
          {currentUser ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm font-mono text-[var(--text)]">
              <div className="w-5 h-5 rounded-full bg-[var(--surface-elevated)] border border-white/20 flex items-center justify-center text-xs text-[var(--text)] font-bold">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="truncate max-w-[110px] font-medium hidden sm:inline">
                {currentUser.handle || currentUser.name}
              </span>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  title="Sign Out"
                  className="ml-1 p-0.5 text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : null}

          {/* Fullscreen Mode Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Full Screen' : 'Toggle Full Screen'}
            className="flex items-center justify-center p-2 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
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
import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Terminal, 
  LayoutDashboard, 
  ReceiptText, 
  CreditCard, 
  Clock, 
  CheckCircle2, 
  Bot,
  Plus
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
  const navLinks = [
    { to: '/', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { to: '/simulator', label: 'Judge Simulator', icon: <Terminal className="w-4 h-4" /> },
    { to: '/ledger', label: 'Ledger & AG Grid', icon: <CreditCard className="w-4 h-4" /> },
    { to: '/payouts', label: 'Payouts & Events', icon: <ReceiptText className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#33475A] bg-[#10161C]/90 backdrop-blur-md px-4 sm:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand identity with new Logo */}
        <div className="flex items-center justify-between w-full md:w-auto">
          <NavLink to="/" className="no-underline">
            <Logo size="md" />
          </NavLink>

          {/* Mobile scan button */}
          <button
            onClick={onOpenReceiptModal}
            className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1F2C38] border border-[#33475A] text-[#E7EDF2] text-xs font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            Receipt
          </button>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 p-1 rounded-xl bg-[#1F2C38] border border-[#33475A]">
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

        {/* Actions & Status */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={onOpenReceiptModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1F2C38] hover:bg-[#33475A] border border-[#33475A] text-[#E7EDF2] text-xs font-medium transition-all cursor-pointer"
          >
            <ReceiptText className="w-3.5 h-3.5 text-[#8199AE]" />
            <span>Scan Receipt</span>
          </button>

          {/* Time Counter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1F2C38] border border-[#33475A] text-xs text-[#E7EDF2] font-mono">
            <Clock className="w-3.5 h-3.5 text-[#8199AE]" />
            <span>+{hoursElapsed}h</span>
          </div>

          {/* Backend Status */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1F2C38] border border-[#33475A] text-xs font-mono">
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
        </div>
      </div>
    </header>
  );
};

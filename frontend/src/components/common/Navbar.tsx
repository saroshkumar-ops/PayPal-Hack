import React from 'react';
import { AnimatedTabs } from '../bits/AnimatedTabs';
import type { TabItem } from '../bits/AnimatedTabs';
import { Clock, CheckCircle2, Bot, Terminal, LayoutDashboard, ReceiptText, Sparkles } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  hoursElapsed: number;
  isBackendConnected: boolean;
  onOpenReceiptModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  hoursElapsed,
  isBackendConnected,
  onOpenReceiptModal,
}) => {
  const tabs: TabItem[] = [
    {
      id: 'simulator',
      label: 'Judge Simulator',
      icon: <Terminal className="w-3.5 h-3.5" />,
    },
    {
      id: 'dashboard',
      label: 'Organizer Treasury',
      icon: <LayoutDashboard className="w-3.5 h-3.5" />,
      badge: 'AG Grid',
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.07] bg-[#08090D]/80 backdrop-blur-2xl px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3.5">
        {/* Brand identity */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-amber-500 p-0.5 shadow-lg shadow-blue-500/20">
              <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-[#0E121B] text-xl">
                🤠
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-tight text-white">
                  TripSheriff <span className="text-blue-400">AI</span>
                </span>
                <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400 border border-blue-500/20">
                  PayPal Hackathon
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 m-0">
                Autonomous Group Travel Treasury & Debt Enforcement
              </p>
            </div>
          </div>

          {/* Mobile scan button */}
          <button
            onClick={onOpenReceiptModal}
            className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-semibold"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            Scan
          </button>
        </div>

        {/* Center Animated Tab Switcher */}
        <div className="w-full md:w-auto flex justify-center">
          <AnimatedTabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={setActiveTab}
          />
        </div>

        {/* Right Status Badges & Quick Action */}
        <div className="hidden md:flex items-center gap-2.5">
          {/* Scan Receipt Button */}
          <button
            onClick={onOpenReceiptModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600/80 to-blue-600/80 hover:from-purple-500 hover:to-blue-500 border border-white/10 text-white text-xs font-semibold shadow-md shadow-purple-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <ReceiptText className="w-3.5 h-3.5" />
            AI Receipt OCR
          </button>

          {/* Time Counter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-white/[0.08] text-xs text-amber-300 font-mono">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>+{hoursElapsed}h</span>
          </div>

          {/* Backend Status Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-white/[0.08] text-xs">
            {isBackendConnected ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Java Live</span>
              </>
            ) : (
              <>
                <Bot className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-zinc-300 font-medium">Autonomous</span>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

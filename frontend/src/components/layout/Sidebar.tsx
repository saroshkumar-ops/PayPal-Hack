import React from 'react';
import { 
  Terminal, 
  LayoutDashboard, 
  ReceiptText, 
  Clock, 
  ShieldCheck 
} from 'lucide-react';
import type { Member } from '../../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  organizer: Member;
  onOpenReceiptModal: () => void;
  onFastForward: () => void;
  onPayout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  organizer,
  onOpenReceiptModal,
  onFastForward,
  onPayout,
}) => {
  const navItems = [
    {
      id: 'simulator',
      label: 'Chat Simulator',
      subtitle: 'Live Telegram agent & roasts',
      icon: <Terminal className="w-4 h-4" />,
      badge: 'Live Bot',
    },
    {
      id: 'dashboard',
      label: 'Treasury & AG Grid',
      subtitle: 'Double-entry cash flow',
      icon: <LayoutDashboard className="w-4 h-4" />,
      badge: 'Sponsor Prize',
    },
  ];

  return (
    <aside className="w-64 border-r border-white/[0.07] bg-[#0A0D14]/90 backdrop-blur-2xl flex flex-col justify-between p-4 shrink-0 hidden lg:flex h-screen sticky top-0">
      <div>
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 py-3 mb-6">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#0070E0] via-indigo-600 to-amber-500 p-0.5 shadow-lg shadow-blue-500/20">
            <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-[#0A0D14]">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-white font-sans">
                TripSheriff <span className="text-blue-400">AI</span>
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 m-0">Group Travel Treasury Agent</p>
          </div>
        </div>

        {/* Primary Navigation */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-3 mb-2 font-mono">
            Navigation
          </div>

          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all cursor-pointer text-left ${
                  isActive
                    ? 'bg-blue-600/15 border border-blue-500/30 text-white shadow-lg shadow-blue-500/10'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                      isActive ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-900 text-zinc-400'
                    }`}
                  >
                    {item.icon}
                  </div>
                  <div>
                    <div className="text-xs font-bold leading-tight">{item.label}</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">{item.subtitle}</div>
                  </div>
                </div>

                {item.badge && (
                  <span
                    className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold ${
                      isActive
                        ? 'bg-blue-500 text-white'
                        : 'bg-zinc-800 text-zinc-400 border border-white/5'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Secondary Quick Action Shortcuts */}
        <div className="mt-8 space-y-2">
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-3 mb-2 font-mono">
            Agent Actions
          </div>

          <button
            onClick={onOpenReceiptModal}
            className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/15 border border-purple-500/20 text-purple-300 text-xs font-semibold transition-all cursor-pointer active:scale-98"
          >
            <ReceiptText className="w-4 h-4 text-purple-400" />
            <span>AI Receipt OCR</span>
          </button>

          <button
            onClick={onFastForward}
            className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 text-amber-300 text-xs font-semibold transition-all cursor-pointer active:scale-98"
          >
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Fast-Forward +24h</span>
          </button>

          <button
            onClick={onPayout}
            className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 text-emerald-300 text-xs font-semibold transition-all cursor-pointer active:scale-98"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Batch Payout</span>
          </button>
        </div>
      </div>

      {/* Bottom Profile Section */}
      <div className="pt-4 border-t border-white/[0.07]">
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-zinc-900/60 border border-white/[0.05]">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <img
                src={organizer.avatar_url}
                alt=""
                className="h-8 w-8 rounded-xl object-cover border border-white/10"
              />
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-[#0A0D14]" />
            </div>
            <div>
              <div className="text-xs font-bold text-white leading-tight">{organizer.name}</div>
              <div className="text-[10px] text-zinc-400 font-mono">ORGANIZER</div>
            </div>
          </div>
          <div className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
            Ready
          </div>
        </div>
      </div>
    </aside>
  );
};

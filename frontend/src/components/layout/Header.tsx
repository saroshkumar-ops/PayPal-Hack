import React from 'react';
import { Clock, CheckCircle2, Bot, ReceiptText } from 'lucide-react';

interface HeaderProps {
  tripName: string;
  hoursElapsed: number;
  isBackendConnected: boolean;
  onOpenReceiptModal: () => void;
  onFastForward: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  tripName,
  hoursElapsed,
  isBackendConnected,
  onOpenReceiptModal,
  onFastForward,
}) => {
  return (
    <header className="w-full border-b border-white/[0.07] bg-[#08090D]/80 backdrop-blur-2xl px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sticky top-0 z-30">
      {/* Breadcrumb & Trip Name */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold text-blue-400 uppercase tracking-wider">
            Trips
          </span>
          <span className="text-zinc-600">/</span>
          <h2 className="text-sm font-bold text-white m-0 tracking-tight flex items-center gap-2">
            {tripName}
            <span className="text-[10px] font-mono font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              Live Group
            </span>
          </h2>
        </div>
        <p className="text-[11px] text-zinc-400 m-0 mt-0.5 hidden sm:block">
          Autonomous treasury coordinator powered by PayPal Sandbox & Gemini AI
        </p>
      </div>

      {/* Action Controls & Status Pills */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Quick Fast Forward */}
        <button
          onClick={onFastForward}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/25 text-amber-300 text-xs font-semibold transition-all cursor-pointer active:scale-95"
        >
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>+{hoursElapsed}h Elapsed (Advance +24h)</span>
        </button>

        {/* AI Receipt OCR Button */}
        <button
          onClick={onOpenReceiptModal}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition-all cursor-pointer active:scale-95"
        >
          <ReceiptText className="w-3.5 h-3.5" />
          <span>Upload Receipt</span>
        </button>

        {/* Backend Status Pill */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-white/[0.08] text-xs font-mono">
          {isBackendConnected ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Java :8080</span>
            </>
          ) : (
            <>
              <Bot className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-zinc-300">Autonomous</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

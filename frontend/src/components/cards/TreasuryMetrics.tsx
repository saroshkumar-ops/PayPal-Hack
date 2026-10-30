import React from 'react';
import { SpotlightCard } from '../bits/SpotlightCard';
import { 
  Receipt, 
  Clock, 
  ShieldCheck, 
  Users, 
  PlusCircle, 
  Sparkles,
  Zap
} from 'lucide-react';

interface TreasuryMetricsProps {
  totalSpend: string;
  settledAmount: string;
  pendingAmount: string;
  settledPercentage: number;
  memberCount: number;
  onAddExpense: () => void;
  onFastForward: () => void;
  onScanReceipt: () => void;
}

export const TreasuryMetrics: React.FC<TreasuryMetricsProps> = ({
  totalSpend,
  settledAmount,
  pendingAmount,
  settledPercentage,
  memberCount,
  onAddExpense,
  onFastForward,
  onScanReceipt,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Metric 1: Total Spend & Collection Progress */}
      <SpotlightCard className="p-5 flex flex-col justify-between shadow-xl">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Total Trip Spend
          </span>
          <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
            <Receipt className="w-4 h-4" />
          </div>
        </div>

        <div className="my-3">
          <div className="text-3xl font-extrabold font-mono text-white tracking-tight">
            ${totalSpend}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-700"
                style={{ width: `${settledPercentage}%` }}
              />
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400">
              {settledPercentage}% Settled
            </span>
          </div>
        </div>

        <div className="text-[11px] text-zinc-500">
          Integer-cent storage • Zero rounding drift
        </div>
      </SpotlightCard>

      {/* Metric 2: Settled vs Pending Debts */}
      <SpotlightCard className="p-5 flex flex-col justify-between shadow-xl">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Debt Status Overview
          </span>
          <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 my-2">
          <div className="p-2.5 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15">
            <div className="text-[10px] text-emerald-400/80 font-medium uppercase">Settled</div>
            <div className="text-lg font-bold font-mono text-emerald-400">${settledAmount}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/[0.06] border border-amber-500/15">
            <div className="text-[10px] text-amber-400/80 font-medium uppercase">Pending</div>
            <div className="text-lg font-bold font-mono text-amber-400">${pendingAmount}</div>
          </div>
        </div>

        <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-zinc-500" />
          <span>Across {memberCount} active trip members</span>
        </div>
      </SpotlightCard>

      {/* Metric 3: Quick Action Launchpad */}
      <SpotlightCard className="p-5 flex flex-col justify-between shadow-xl bg-gradient-to-br from-[#0E1322] via-[#101426] to-[#15102a]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" /> Quick Actions
          </span>
          <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
            Interactive
          </span>
        </div>

        <div className="space-y-2 my-2">
          <button
            onClick={onFastForward}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-xs font-semibold text-amber-300 transition-all cursor-pointer active:scale-98"
          >
            <span className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-amber-400" /> Fast-Forward +24h
            </span>
            <span className="text-[10px] font-mono text-amber-400">Escalate</span>
          </button>

          <button
            onClick={onScanReceipt}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-xs font-semibold text-purple-300 transition-all cursor-pointer active:scale-98"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Gemini Receipt OCR
            </span>
            <span className="text-[10px] font-mono text-purple-400">Scan</span>
          </button>

          <button
            onClick={onAddExpense}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-semibold text-zinc-200 transition-all cursor-pointer active:scale-98"
          >
            <span className="flex items-center gap-2">
              <PlusCircle className="w-3.5 h-3.5 text-blue-400" /> Simulate $150 Dinner
            </span>
            <span className="text-[10px] font-mono text-zinc-400">Add</span>
          </button>
        </div>
      </SpotlightCard>
    </div>
  );
};

import React from 'react';
import { SpotlightCard } from '../bits/SpotlightCard';
import { Flame, Sparkles } from 'lucide-react';
import type { EscalationTier, Member } from '../../types';

interface EscalationGaugeProps {
  debtor: Member;
  amountCents: number;
  hoursOverdue: number;
  currentTier?: EscalationTier;
  onAdvanceTier: () => void;
}

export const EscalationGauge: React.FC<EscalationGaugeProps> = ({
  debtor,
  amountCents,
  hoursOverdue,
  currentTier = 'DISAPPOINTED_PARENT',
  onAdvanceTier,
}) => {
  const heat = debtor.heat_score || 75;

  const getTierDisplay = (tier: EscalationTier) => {
    switch (tier) {
      case 'POLITE_CONCIERGE':
        return { name: 'Tier 1: Polite Concierge', icon: '🏖️', quote: 'Hey Alex! Quick link for your $80 villa split.' };
      case 'PASSIVE_AGGRESSIVE':
        return { name: 'Tier 2: Passive-Aggressive', icon: '👀', quote: 'Must be nice watching sunset while Sarah fronts your bed...' };
      case 'DISAPPOINTED_PARENT':
        return { name: 'Tier 3: Disappointed Parent', icon: '👵', quote: 'Alex beta, is this how we raised you? Sipping mojitos while friends carry debt?' };
      case 'PUBLIC_ROAST':
        return { name: 'Tier 4: Public Deadbeat Roast', icon: '🤠', quote: 'WANTED: Alex Rivera | Bounty: $80 | Crime: Wagyu on borrowed card' };
      case 'ITINERARY_EMBARGO':
        return { name: 'Tier 5: Itinerary Embargo', icon: '⛔', quote: 'Trip sanction: Demoted to sleeping on the pull-out couch.' };
    }
  };

  const tierInfo = getTierDisplay(currentTier);

  return (
    <SpotlightCard className="p-5 shadow-xl flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.07]">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <Flame className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider m-0">
              Debt Escalation Matrix
            </h3>
            <p className="text-[11px] text-zinc-400 m-0">Consensual Comedic Enforcement</p>
          </div>
        </div>

        <span className="text-[10px] font-mono font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full">
          Consent: {debtor.roast_consent}
        </span>
      </div>

      {/* Target Debtor & Heat Bar */}
      <div className="my-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src={debtor.avatar_url}
              alt=""
              className="h-9 w-9 rounded-full object-cover border border-white/10"
            />
            <div>
              <div className="text-xs font-bold text-white">{debtor.name}</div>
              <div className="text-[10px] text-zinc-400 font-mono">{debtor.handle}</div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm font-bold font-mono text-rose-400">
              -${(amountCents / 100).toFixed(2)}
            </div>
            <div className="text-[10px] text-zinc-500">{hoursOverdue}h Overdue</div>
          </div>
        </div>

        {/* Heat Gauge Bar */}
        <div>
          <div className="flex justify-between text-[11px] mb-1">
            <span className="text-zinc-400 font-medium">Debt Heat Level</span>
            <span className="font-mono font-bold text-orange-400">{heat}% 🔥</span>
          </div>
          <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 rounded-full transition-all duration-500"
              style={{ width: `${heat}%` }}
            />
          </div>
        </div>
      </div>

      {/* Active Persona Box */}
      <div className="p-3 rounded-2xl bg-zinc-900/60 border border-white/[0.06] mb-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">{tierInfo.icon}</span>
          <span className="text-xs font-bold text-purple-300">{tierInfo.name}</span>
        </div>
        <p className="text-[11px] text-zinc-300 italic m-0 line-clamp-2 leading-relaxed">
          "{tierInfo.quote}"
        </p>
      </div>

      {/* Next Step Escalate CTA */}
      <button
        onClick={onAdvanceTier}
        className="w-full py-2 px-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-semibold text-zinc-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        Escalate to Next Enforcement Tier
      </button>
    </SpotlightCard>
  );
};

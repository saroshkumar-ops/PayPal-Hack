import React from 'react';
import type { TripLedger, PayPalEventLog } from '../../types';
import { SpotlightCard } from '../bits/SpotlightCard';
import { BadgePill } from '../bits/BadgePill';
import { 
  DollarSign, 
  Flame, 
  Activity, 
  ShieldCheck, 
  ArrowUpRight, 
  ArrowDownLeft 
} from 'lucide-react';

interface LedgerPreviewProps {
  ledger: TripLedger;
  paypalLogs: PayPalEventLog[];
  onTriggerPayout: () => void;
}

export const LedgerPreview: React.FC<LedgerPreviewProps> = ({
  ledger,
  paypalLogs,
  onTriggerPayout,
}) => {
  const getNetBalance = (userId: string) => {
    return (ledger.net_balances_cents[userId] || 0) / 100;
  };

  return (
    <div className="flex flex-col h-[780px] space-y-4">
      {/* Top Card: Live Integer-Cent Balances */}
      <SpotlightCard className="p-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.07]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white m-0">Double-Entry Ledger</h3>
              <p className="text-[11px] text-zinc-400 m-0">Zero floating-point rounding drift</p>
            </div>
          </div>
          <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
            Integer Cents Math
          </span>
        </div>

        {/* Member Balances List */}
        <div className="space-y-2.5">
          {ledger.members.map((member) => {
            const net = getNetBalance(member.user_id);
            const isCreditor = net > 0;
            const isSettled = net === 0;

            return (
              <div
                key={member.user_id}
                className="flex items-center justify-between p-3 rounded-2xl bg-zinc-900/60 border border-white/[0.05] transition-all hover:border-white/[0.12]"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={member.avatar_url}
                    alt={member.name}
                    className="h-10 w-10 rounded-2xl object-cover border border-white/10"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white">{member.name}</span>
                      {member.role === 'organizer' && (
                        <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.2 rounded border border-blue-500/20">
                          ORGANIZER
                        </span>
                      )}
                    </div>

                    {/* Roast Consent & Heat Score */}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-zinc-400">
                        Consent: <strong className="text-zinc-200">{member.roast_consent}</strong>
                      </span>

                      {member.heat_score !== undefined && member.heat_score > 0 && (
                        <div className="flex items-center gap-1.5 pl-2 border-l border-white/10">
                          <Flame className="w-3 h-3 text-orange-400" />
                          <span className="text-[10px] font-bold text-orange-400">
                            {member.heat_score}% Heat
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Net Balance Pill */}
                <div className="text-right">
                  <div
                    className={`font-mono font-bold text-sm tabular-nums flex items-center justify-end gap-1 ${
                      isCreditor
                        ? 'text-emerald-400'
                        : isSettled
                        ? 'text-zinc-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {isCreditor && <ArrowUpRight className="w-3.5 h-3.5" />}
                    {!isCreditor && !isSettled && <ArrowDownLeft className="w-3.5 h-3.5" />}
                    {isCreditor ? `+$${net.toFixed(2)}` : isSettled ? '$0.00' : `-$${Math.abs(net).toFixed(2)}`}
                  </div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
                    {isCreditor ? 'Fronted' : isSettled ? 'Settled' : 'Owes'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Batch Payout Call-to-action */}
        <div className="mt-4 pt-3 border-t border-white/[0.07] flex items-center justify-between">
          <div className="text-xs text-zinc-400">
            Trip conclusion payout:
          </div>
          <button
            onClick={onTriggerPayout}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Batch Payout to Sarah
          </button>
        </div>
      </SpotlightCard>

      {/* Bottom Card: Live PayPal Sandbox Webhook Stream */}
      <SpotlightCard className="flex-1 p-5 shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.07]">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400 animate-pulse" />
            <h3 className="text-sm font-bold text-white m-0">PayPal Real-Time Webhooks</h3>
          </div>
          <BadgePill status="CAPTURED" label="Live Signature Verification" />
        </div>

        {/* Log Entries */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {paypalLogs.map((log) => (
            <div
              key={log.id}
              className="p-3 rounded-2xl bg-zinc-900/60 border border-white/[0.05] text-xs transition-all hover:border-white/[0.12]"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`font-mono font-bold text-[10px] px-2 py-0.5 rounded-full ${
                    log.event_type.includes('COMPLETED') || log.event_type.includes('SUCCESS')
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  }`}
                >
                  {log.event_type}
                </span>
                <span className="font-mono text-[10px] text-zinc-500">{log.timestamp}</span>
              </div>
              <p className="text-zinc-300 text-xs m-0 leading-relaxed font-sans">
                {log.summary}
              </p>
              {log.reference_id && (
                <div className="mt-1.5 text-[10px] font-mono text-zinc-500">
                  Ref: {log.reference_id}
                </div>
              )}
            </div>
          ))}
        </div>
      </SpotlightCard>
    </div>
  );
};

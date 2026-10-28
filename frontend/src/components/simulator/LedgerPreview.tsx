import React from 'react';
import type { TripLedger, PayPalEventLog } from '../../types';
import { DollarSign, Flame, Activity, ShieldCheck } from 'lucide-react';

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
    <div className="flex flex-col h-[750px] space-y-4">
      {/* Top Card: Live Integer-Cent Net Balances */}
      <div className="bg-gray-950 border border-gray-800 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3 border-b border-gray-800 pb-2">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white m-0">Live Integer-Cent Balances</h3>
          </div>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
            Zero Rounding Drift
          </span>
        </div>

        <div className="space-y-3">
          {ledger.members.map((member) => {
            const net = getNetBalance(member.user_id);
            const isCreditor = net > 0;
            const isSettled = net === 0;

            return (
              <div
                key={member.user_id}
                className="bg-gray-900/70 border border-gray-800/80 rounded-xl p-3 flex items-center justify-between transition-all hover:border-gray-700"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={member.avatar_url}
                    alt={member.name}
                    className="w-10 h-10 rounded-full border border-gray-700 object-cover"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-100">{member.name}</span>
                      <span className="text-[10px] text-gray-500 font-mono">{member.handle}</span>
                      {member.role === 'organizer' && (
                        <span className="text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded font-semibold">
                          ORGANIZER
                        </span>
                      )}
                    </div>

                    {/* Debt Heat Score */}
                    {member.heat_score !== undefined && member.heat_score > 0 && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Flame className="w-3 h-3 text-orange-400 animate-pulse" />
                        <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-rose-600 rounded-full"
                            style={{ width: `${member.heat_score}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-orange-400 font-bold">
                          {member.heat_score}/100 Heat
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`text-sm font-bold font-mono ${
                      isSettled
                        ? 'text-gray-400'
                        : isCreditor
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {isCreditor ? `+$${net.toFixed(2)}` : isSettled ? '$0.00' : `-$${Math.abs(net).toFixed(2)}`}
                  </div>
                  <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                    {isCreditor ? 'Fronted' : isSettled ? 'Settled' : 'Owes'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Organizer Settle Button */}
        <div className="mt-4 pt-3 border-t border-gray-800/80 flex items-center justify-between">
          <div className="text-xs text-gray-400">
            Trip conclusion settlement:
          </div>
          <button
            onClick={onTriggerPayout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Batch Payout to Sarah
          </button>
        </div>
      </div>

      {/* Bottom Card: Real-time PayPal Sandbox Webhook Stream */}
      <div className="flex-1 bg-gray-950 border border-gray-800 rounded-2xl p-4 shadow-xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between mb-3 border-b border-gray-800 pb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
            <h3 className="text-sm font-semibold text-white m-0">PayPal Sandbox Event Stream</h3>
          </div>
          <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-mono">
            Signed Webhooks
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {paypalLogs.map((log) => (
            <div
              key={log.id}
              className="bg-gray-900/60 border border-gray-800 rounded-xl p-2.5 text-xs transition-all hover:border-gray-700"
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    log.event_type.includes('COMPLETED') || log.event_type.includes('SUCCESS')
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}
                >
                  {log.event_type}
                </span>
                <span className="text-[10px] text-gray-500 font-mono">{log.timestamp}</span>
              </div>
              <p className="text-gray-300 m-0 leading-relaxed font-sans text-[11px]">
                {log.summary}
              </p>
              {log.reference_id && (
                <div className="mt-1 text-[9px] text-gray-500 font-mono">
                  Ref: {log.reference_id}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

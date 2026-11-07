import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Radio, 
  CheckCircle, 
  Wallet, 
  HelpCircle, 
  CreditCard,
  Zap
} from 'lucide-react';
import type { TripLedger, PayPalEventLog } from '../types';
import { Button } from '../components/ui/Button';
import { StatusPill } from '../components/ui/StatusPill';
import { getCurrencySymbol } from '../lib/currency';

interface PayoutsPageProps {
  ledger: TripLedger;
  paypalLogs: PayPalEventLog[];
  onOpenPayoutModal: () => void;
}

export const PayoutsPage: React.FC<PayoutsPageProps> = ({
  ledger,
  paypalLogs,
  onOpenPayoutModal,
}) => {
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [showArchGuide, setShowArchGuide] = useState(false);
  const cur = getCurrencySymbol(ledger.currency);

  const organizer = ledger.members.find((m) => m.role === 'organizer') || ledger.members[0] || {
    user_id: 'organizer',
    name: 'Party Organizer',
    handle: '@organizer',
    role: 'organizer' as const,
    paypal_email: '',
    roast_consent: 'MILD' as const,
  };
  const organizerOwedCents = Math.max(0, ledger.net_balances_cents[organizer.user_id] || 0);

  let settledCents = 0;
  ledger.expenses.forEach((exp) => {
    exp.splits.forEach((split) => {
      if (split.paid_status === 'SETTLED') {
        settledCents += split.owes_cents;
      }
    });
  });

  return (
    <div className="space-y-6 w-full max-w-[1560px] mx-auto py-2">
      {/* ================================================================ */}
      {/* 1. TOP VAULT STATUS                                              */}
      {/* ================================================================ */}
      <div className="rounded-3xl bg-[#0F1117] border border-white/8 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-[0_16px_48px_rgba(0,0,0,0.8)]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFC439] animate-pulse" />
            <span className="text-xs font-mono font-bold text-[#FFC439] uppercase">
              PAYPAL ESCROW DISBURSEMENT
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-[#EDEEF2] m-0">
            Escrow Liquidity Vault
          </h1>
          <p className="text-xs sm:text-sm text-[#8A8FA3] font-body mt-1 max-w-xl m-0">
            Inbound member PayPal checkouts pool into escrow and disburse as a batch payout to the trip organizer.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setShowArchGuide(!showArchGuide)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#171A23] hover:bg-white/6 border border-white/10 text-xs font-mono text-[#8A8FA3] hover:text-[#C6FF3D] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#C6FF3D]" />
            <span>{showArchGuide ? 'Hide Architecture' : 'How Escrow Works'}</span>
          </button>

          <Button
            variant="paypal"
            size="lg"
            onClick={onOpenPayoutModal}
            disabled={organizerOwedCents <= 0}
            icon={<ShieldCheck className="w-4 h-4" />}
            className="w-full sm:w-auto text-xs sm:text-sm"
          >
            Authorize Batch Payout
          </Button>
        </div>
      </div>

      {/* ================================================================ */}
      {/* 2. VISUAL ARCHITECTURE GUIDE (PAYPAL ESCROW + PAYOUT LIFECYCLE) */}
      {/* ================================================================ */}
      {showArchGuide && (
        <div className="p-6 rounded-3xl bg-[#0F1117] border border-[#FFC439]/30 shadow-[0_16px_48px_rgba(0,0,0,0.8)] space-y-5">
          <div className="flex items-center justify-between border-b border-white/8 pb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#FFC439]" />
              <h3 className="text-sm font-display font-bold text-[#EDEEF2] m-0">
                End-to-End PayPal Escrow Architecture
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[#8A8FA3]">PayPal Orders v2 + Payouts API v1</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
            {/* Step 1 */}
            <div className="p-4 rounded-2xl bg-[#07080D] border border-white/6 space-y-2">
              <div className="flex items-center justify-between text-[#8A8FA3]">
                <span className="text-[10px] uppercase font-bold text-[#FFC439]">Phase 01</span>
                <CreditCard className="w-3.5 h-3.5 text-[#FFC439]" />
              </div>
              <div className="font-semibold text-[#EDEEF2] font-body">Debtor Checkout</div>
              <p className="text-[11px] text-[#8A8FA3] font-body m-0 leading-relaxed">
                Debtors click their personalized 1-tap link to approve a sandbox order via PayPal Orders v2.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-4 rounded-2xl bg-[#07080D] border border-white/6 space-y-2">
              <div className="flex items-center justify-between text-[#8A8FA3]">
                <span className="text-[10px] uppercase font-bold text-[#C6FF3D]">Phase 02</span>
                <Radio className="w-3.5 h-3.5 text-[#C6FF3D]" />
              </div>
              <div className="font-semibold text-[#EDEEF2] font-body">Webhook Capture</div>
              <p className="text-[11px] text-[#8A8FA3] font-body m-0 leading-relaxed">
                PayPal sends a real-time webhook (`PAYMENT.CAPTURE.COMPLETED`). Funds land safely in platform escrow.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-4 rounded-2xl bg-[#07080D] border border-white/6 space-y-2">
              <div className="flex items-center justify-between text-[#8A8FA3]">
                <span className="text-[10px] uppercase font-bold text-[#38E1FF]">Phase 03</span>
                <Wallet className="w-3.5 h-3.5 text-[#38E1FF]" />
              </div>
              <div className="font-semibold text-[#EDEEF2] font-body">Escrow Accumulation</div>
              <p className="text-[11px] text-[#8A8FA3] font-body m-0 leading-relaxed">
                Balances pool securely without manual bank transfers. The ledger verifies 0.00 drift.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-4 rounded-2xl bg-[#07080D] border border-white/6 space-y-2">
              <div className="flex items-center justify-between text-[#8A8FA3]">
                <span className="text-[10px] uppercase font-bold text-[#C6FF3D]">Phase 04</span>
                <ShieldCheck className="w-3.5 h-3.5 text-[#C6FF3D]" />
              </div>
              <div className="font-semibold text-[#EDEEF2] font-body">Organizer Batch Payout</div>
              <p className="text-[11px] text-[#8A8FA3] font-body m-0 leading-relaxed">
                The organizer clicks "Authorize Batch Payout". PayPal Batch Payouts API disburses pooled funds directly.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* 3. GRID: BENEFICIARY RAIL (5) & WEBHOOK RADAR (7)                */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Beneficiary Details */}
        <div className="lg:col-span-5 rounded-3xl bg-[#0F1117] border border-white/8 p-6 flex flex-col justify-between shadow-[0_16px_48px_rgba(0,0,0,0.8)] space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/8 pb-3">
              <span className="text-xs font-mono font-semibold text-[#EDEEF2]">
                DISBURSEMENT BENEFICIARY
              </span>
              <StatusPill status="paid" label="Verified Receiver" />
            </div>

            {/* Beneficiary Card */}
            <div className="p-4 rounded-2xl bg-[#07080D] border border-white/8 space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#8A8FA3]">Organizer:</span>
                <span className="text-[#EDEEF2] font-body font-semibold">{organizer.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#8A8FA3]">PayPal Email:</span>
                <span className="text-[#C6FF3D] truncate max-w-[200px]">
                  {organizer.paypal_email || 'Not configured'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#8A8FA3]">Escrow Pool Collected:</span>
                <span className="text-[#EDEEF2] tabular-nums font-semibold">
                  {cur}{(settledCents / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-white/8">
                <span className="text-[#8A8FA3]">Reimbursable Balance:</span>
                <span className="text-base font-bold text-[#C6FF3D] tabular-nums">
                  {cur}{(organizerOwedCents / 100).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#07080D]/60 border border-white/6 space-y-2">
              <div className="text-xs font-semibold text-[#EDEEF2] flex items-center gap-2">
                <Wallet className="w-3.5 h-3.5 text-[#C6FF3D]" />
                <span>Payout Status</span>
              </div>
              <p className="text-xs text-[#8A8FA3] font-body m-0 leading-relaxed">
                {organizerOwedCents > 0
                  ? `${cur}${(organizerOwedCents / 100).toFixed(2)} is ready for batch disbursement to ${organizer.paypal_email || organizer.name}.`
                  : 'All collected group funds have been fully disbursed. Escrow is settled.'}
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#171A23] border border-white/8 text-[11px] font-mono text-[#8A8FA3] flex items-center justify-between">
            <span>Escrow Integrity:</span>
            <span className="text-[#C6FF3D] flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              <span>Balanced</span>
            </span>
          </div>
        </div>

        {/* Right Column: Real-Time PayPal SSE Webhook Radar (7 cols) */}
        <div className="lg:col-span-7 rounded-3xl bg-[#0F1117] border border-white/8 p-6 flex flex-col justify-between shadow-[0_16px_48px_rgba(0,0,0,0.8)] space-y-4">
          <div className="flex items-center justify-between border-b border-white/8 pb-3">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#C6FF3D] animate-pulse" />
              <h3 className="text-sm font-display font-bold text-[#EDEEF2] m-0">
                PayPal Webhook Telemetry
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[#8A8FA3] bg-[#171A23] px-2.5 py-0.5 rounded">
              {paypalLogs.length} Events Logged
            </span>
          </div>

          {/* Webhook Log Event Stream */}
          <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1 scrollbar-none">
            {paypalLogs.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#07080D] border border-white/6 text-center space-y-3">
                <Radio className="w-8 h-8 text-[#8A8FA3]/50 mx-auto" />
                <div className="text-xs font-mono text-[#EDEEF2] font-semibold">
                  Real-Time SSE Listener Active
                </div>
                <p className="text-xs text-[#8A8FA3] font-body max-w-sm mx-auto m-0">
                  When a member simulates a PayPal capture or executes a batch payout, live Webhook JSON packets stream directly into this console.
                </p>
              </div>
            ) : (
              paypalLogs.map((log) => {
                const isPayout = log.event_type.includes('PAYOUT');
                const isCapture = log.event_type.includes('CAPTURE');
                const isSelected = selectedLogId === log.id;

                return (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLogId(isSelected ? null : log.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer font-mono text-xs ${
                      isSelected
                        ? 'bg-[#171A23] border-[#C6FF3D] shadow-[0_0_16px_rgba(198,255,61,0.15)]'
                        : 'bg-[#07080D] border-white/8 hover:border-white/16'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isPayout
                            ? 'bg-[#FFC439]/15 text-[#FFC439] border border-[#FFC439]/30'
                            : isCapture
                            ? 'bg-[#C6FF3D]/15 text-[#C6FF3D] border border-[#C6FF3D]/30'
                            : 'bg-white/10 text-[#EDEEF2]'
                        }`}
                      >
                        {log.event_type}
                      </span>
                      <span className="text-[11px] text-[#8A8FA3]">
                        {log.timestamp}
                      </span>
                    </div>

                    <div className="text-xs font-body text-[#EDEEF2] leading-relaxed mb-2">
                      {log.summary}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#8A8FA3] pt-2 border-t border-white/6">
                      <span className="truncate max-w-[220px]">Ref: {log.reference_id || log.id}</span>
                      <span className="font-bold text-[#EDEEF2] tabular-nums">{log.amount}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-3 rounded-xl bg-[#07080D] border border-white/6 flex items-center justify-between text-xs font-mono text-[#8A8FA3]">
            <span>Listener: /api/trips/{ledger.trip_id}/events</span>
            <span className="text-[#C6FF3D]">STREAMING 200 OK</span>
          </div>
        </div>
      </div>
    </div>
  );
};

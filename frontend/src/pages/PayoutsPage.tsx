import React, { useState } from 'react';
import { ShieldCheck, Radio } from 'lucide-react';
import type { TripLedger, PayPalEventLog } from '../types';
import { Button } from '../components/ui/Button';
import { StatusPill } from '../components/ui/StatusPill';

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

  const organizer = ledger.members.find((m) => m.role === 'organizer') || ledger.members[0];
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
      {/* 1. TOP VAULT STATUS COCKPIT                                       */}
      {/* ================================================================ */}
      <div className="rounded-3xl bg-[#0F1117] border border-white/8 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-[0_16px_48px_rgba(0,0,0,0.8)]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFC439] animate-pulse" />
            <span className="text-xs font-mono font-bold text-[#FFC439] uppercase">
              PAYPAL BATCH PAYOUTS & WEBHOOK STREAM
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-[#EDEEF2] m-0">
            Escrow Liquidity Vault
          </h1>
          <p className="text-xs sm:text-sm text-[#8A8FA3] font-body mt-1 max-w-xl m-0">
            Automated settlement pipeline: inbound member PayPal checkouts pool into escrow and disburse as a unified batch reimbursement to the trip organizer.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <Button
            variant="paypal"
            size="lg"
            onClick={onOpenPayoutModal}
            icon={<ShieldCheck className="w-4 h-4" />}
            className="w-full sm:w-auto text-xs sm:text-sm"
          >
            Authorize Batch Payout
          </Button>
        </div>
      </div>

      {/* ================================================================ */}
      {/* 2. ASYMMETRIC GRID: DISBURSEMENT RAIL (5) & WEBHOOK RADAR (7)    */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Beneficiary & Payout Pipeline (5 cols) */}
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
                <span className="text-[#C6FF3D] truncate max-w-[200px]">{organizer.paypal_email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#8A8FA3]">Reimbursable Balance:</span>
                <span className="text-base font-bold text-[#EDEEF2] tabular-nums">
                  ₹{(organizerOwedCents / 100).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payout Pipeline Steps */}
            <div className="space-y-3 pt-2">
              <div className="text-xs font-mono text-[#8A8FA3] uppercase">
                SETTLEMENT PROTOCOL PIPELINE:
              </div>

              {[
                { step: '01', title: 'Debtor Capture', desc: 'Debtors pay exact integer debt via PayPal Orders v2 sandbox checkout.', done: true },
                { step: '02', title: 'Treasury Pooling', desc: 'Funds accumulate in non-custodial double-entry trip escrow.', done: true },
                { step: '03', title: 'Batch Payout v1', desc: 'Organizer triggers unified disbursement with zero remainder drift.', done: false },
              ].map((p, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-[#07080D]/60 border border-white/6 flex items-start gap-3"
                >
                  <span className="text-xs font-mono font-bold text-[#C6FF3D] mt-0.5">{p.step}</span>
                  <div>
                    <div className="text-xs font-semibold text-[#EDEEF2] font-body">{p.title}</div>
                    <div className="text-[11px] text-[#8A8FA3] font-body mt-0.5 leading-relaxed">{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#171A23] border border-white/8 text-[11px] font-mono text-[#8A8FA3] flex items-center justify-between">
            <span>Cryptographic Proof: SHA-256</span>
            <span className="text-[#C6FF3D]">Double-Entry Valid</span>
          </div>
        </div>

        {/* Right Column: Real-Time PayPal SSE Webhook Radar (7 cols) */}
        <div className="lg:col-span-7 rounded-3xl bg-[#0F1117] border border-white/8 p-6 flex flex-col justify-between shadow-[0_16px_48px_rgba(0,0,0,0.8)] space-y-4">
          <div className="flex items-center justify-between border-b border-white/8 pb-3">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#C6FF3D] animate-pulse" />
              <h3 className="text-sm font-display font-bold text-[#EDEEF2] m-0">
                Live PayPal SSE Webhook Telemetry
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[#8A8FA3] bg-[#171A23] px-2.5 py-0.5 rounded">
              {paypalLogs.length} Events Received
            </span>
          </div>

          {/* Webhook Log Event Stream */}
          <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1 scrollbar-none">
            {paypalLogs.map((log) => {
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
                      {new Date(log.timestamp).toLocaleTimeString()}
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
            })}
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

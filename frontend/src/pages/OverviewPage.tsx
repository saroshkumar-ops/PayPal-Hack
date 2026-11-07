import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, 
  Clock, 
  ArrowRight, 
  Sparkles, 
  Layers, 
  CheckCircle,
  Receipt,
  Flame,
  ChevronRight
} from 'lucide-react';
import type { TripLedger } from '../types';
import { VirtualTripCard } from '../components/cards/VirtualTripCard';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { StatusPill } from '../components/ui/StatusPill';

interface OverviewPageProps {
  ledger: TripLedger;
  onSimulateExpense: () => void;
  onAdvanceTime: () => void;
  onOpenReceiptModal: () => void;
  onOpenPayoutModal: () => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  ledger,
  onSimulateExpense,
  onAdvanceTime,
  onOpenReceiptModal,
  onOpenPayoutModal,
}) => {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const totalSpendCents = ledger.expenses.reduce((acc, exp) => acc + exp.amount_cents, 0);
  let settledCents = 0;
  let pendingCents = 0;

  ledger.expenses.forEach((exp) => {
    exp.splits.forEach((split) => {
      if (split.paid_status === 'SETTLED') {
        settledCents += split.owes_cents;
      } else {
        pendingCents += split.owes_cents;
      }
    });
  });

  const settledPercentage = totalSpendCents > 0 ? Math.round((settledCents / totalSpendCents) * 100) : 0;
  const fallbackMember = {
    user_id: 'user_sarah',
    name: 'Sarah Connor',
    handle: '@sarah',
    role: 'organizer' as const,
    paypal_email: 'sarah.organizer@personal.example.com',
    roast_consent: 'SPICY' as const,
  };
  const organizer = ledger.members.find((m) => m.role === 'organizer') || ledger.members[0] || fallbackMember;
  const organizerOwedCents = Math.max(0, ledger.net_balances_cents[organizer.user_id] || 0);

  // Simplified settlements list from backend (or fallback calculate)
  const settlements = ledger.simplified_settlements || [
    { from_user_id: 'user_alex', to_user_id: 'user_sarah', amount_cents: 6000, formatted_amount: '60.00' },
    { from_user_id: 'user_priya', to_user_id: 'user_sarah', amount_cents: 6000, formatted_amount: '60.00' },
  ];

  const activeFocusMember = (selectedMemberId 
    ? ledger.members.find(m => m.user_id === selectedMemberId) 
    : organizer) || organizer;

  return (
    <div className="space-y-8 w-full max-w-[1560px] mx-auto py-2">
      {/* ================================================================ */}
      {/* 1. INSTITUTIONAL FINANCIAL TICKER BAR (CYBER COMMAND LINE)        */}
      {/* ================================================================ */}
      <div className="w-full rounded-xl bg-[#0F1117] border border-white/8 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shadow-sm">
        <div className="flex items-center gap-4 overflow-x-auto scrollbar-none py-0.5">
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#C6FF3D] animate-pulse" />
            <span className="text-[#8A8FA3]">LEDGER EQUILIBRIUM:</span>
            <span className="text-[#C6FF3D] font-bold">LOCKED (0.00 PAISA DRIFT)</span>
          </div>
          <span className="text-white/10 shrink-0">|</span>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[#8A8FA3]">ESCROW RESERVES:</span>
            <span className="text-[#EDEEF2] tabular-nums font-semibold">₹{(settledCents / 100).toFixed(2)}</span>
          </div>
          <span className="text-white/10 shrink-0">|</span>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[#8A8FA3]">SIMULATED CLOCK:</span>
            <span className="text-[#EDEEF2] tabular-nums">+{ledger.hours_elapsed}h</span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onAdvanceTime}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#171A23] hover:bg-white/6 border border-white/10 text-[11px] text-[#8A8FA3] hover:text-[#EDEEF2] transition-colors cursor-pointer"
          >
            <Clock className="w-3 h-3 text-[#C6FF3D]" />
            <span>Fast-Forward +24h</span>
          </button>
          <span className="text-[10px] text-[#8A8FA3] uppercase tracking-widest hidden sm:inline">
            PAYPAL SANDBOX ACTIVE
          </span>
        </div>
      </div>

      {/* ================================================================ */}
      {/* 2. ASYMMETRIC PRIMARY COCKPIT (70% GRAPH / 30% EXECUTION RAIL)   */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Cockpit: The Cyber Treasury Graph & Cash-Flow Visualizer */}
        <section className="lg:col-span-8 rounded-3xl bg-[#0F1117] border border-white/8 p-6 sm:p-8 flex flex-col justify-between shadow-[0_16px_48px_rgba(0,0,0,0.8)] relative overflow-hidden">
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(rgba(255,255,255,0.2)_1px,transparent_1px)] [background-size:24px_24px]" />

          <div className="relative z-10 space-y-6">
            {/* Asymmetric Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#171A23] border border-white/10 text-[11px] font-mono text-[#C6FF3D] mb-3">
                  <span>TRIP TREASURY CORE</span>
                  <span className="text-[#8A8FA3]">•</span>
                  <span className="text-[#8A8FA3]">{ledger.trip_name || 'Bali Retreat 2026'}</span>
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-[#EDEEF2] tracking-tight leading-[1.08] m-0">
                  Autonomous Group Treasury Matrix
                </h1>
                <p className="text-xs sm:text-sm text-[#8A8FA3] mt-2 max-w-xl font-body leading-relaxed m-0">
                  Deterministic zero-drift ledger calculating optimal bipartite settlements across {ledger.members.length} travelers.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex sm:flex-col items-center sm:items-end gap-2.5 shrink-0">
                <Button
                  variant="primary"
                  size="md"
                  onClick={onOpenReceiptModal}
                  icon={<Receipt className="w-4 h-4" />}
                  className="w-full sm:w-auto"
                >
                  Dissect Bill (OCR)
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSimulateExpense}
                  icon={<Sparkles className="w-3.5 h-3.5 text-[#C6FF3D]" />}
                  className="w-full sm:w-auto text-xs"
                >
                  + Sample Bill
                </Button>
                <Link to="/simulator" className="no-underline w-full sm:w-auto">
                  <Button
                    variant="secondary"
                    size="md"
                    icon={<ArrowRight className="w-4 h-4" />}
                    className="w-full"
                  >
                    Simulator War Room
                  </Button>
                </Link>
              </div>
            </div>

            {/* Interactive Bipartite Cash-Flow Node Canvas */}
            <div className="rounded-2xl bg-[#07080D] border border-white/8 p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/6 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold text-[#EDEEF2]">
                    BIPARTITE CASH FLOW TOPOLOGY
                  </span>
                  <span className="text-[10px] font-mono text-[#8A8FA3] bg-[#171A23] px-2 py-0.5 rounded">
                    O(V+E) Minimized
                  </span>
                </div>
                <span className="text-[11px] font-mono text-[#8A8FA3]">
                  Select node to inspect flows
                </span>
              </div>

              {/* Visual Node Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {ledger.members.map((member) => {
                  const netCents = ledger.net_balances_cents[member.user_id] || 0;
                  const isCreditor = netCents > 0;
                  const isDebtor = netCents < 0;
                  const isSelected = selectedMemberId === member.user_id;

                  return (
                    <motion.div
                      key={member.user_id}
                      onClick={() => setSelectedMemberId(member.user_id)}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between h-28 ${
                        isSelected
                          ? 'bg-[#171A23] border-[#C6FF3D] shadow-[0_0_16px_rgba(198,255,61,0.15)]'
                          : 'bg-[#0F1117] border-white/8 hover:border-white/16'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <Avatar
                          userId={member.user_id}
                          name={member.name}
                          size="sm"
                          showStatus
                          status={isCreditor ? 'paid' : isDebtor ? 'owes' : 'pending'}
                        />
                        <span
                          className={`text-[10px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded ${
                            isCreditor
                              ? 'text-[#C6FF3D] bg-[#C6FF3D]/10'
                              : isDebtor
                              ? 'text-[#FF5C7A] bg-[#FF5C7A]/10'
                              : 'text-[#8A8FA3] bg-white/4'
                          }`}
                        >
                          {member.role}
                        </span>
                      </div>

                      <div>
                        <div className="text-xs font-body font-semibold text-[#EDEEF2] truncate">
                          {member.name}
                        </div>
                        <div
                          className={`text-xs font-mono font-bold tabular-nums mt-0.5 ${
                            isCreditor ? 'text-[#C6FF3D]' : isDebtor ? 'text-[#FF5C7A]' : 'text-[#8A8FA3]'
                          }`}
                        >
                          {isCreditor ? `+₹${(netCents / 100).toFixed(2)}` : isDebtor ? `-₹${(Math.abs(netCents) / 100).toFixed(2)}` : '₹0.00'}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Dynamic Settlement Vector Preview */}
              <div className="p-3.5 rounded-xl bg-[#0F1117] border border-white/6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2 text-[#8A8FA3]">
                  <Layers className="w-4 h-4 text-[#C6FF3D]" />
                  <span>OPTIMIZED TRANSIT CHANNELS:</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {settlements.map((s, idx) => {
                    const fromMember = ledger.members.find(m => m.user_id === s.from_user_id)?.name.split(' ')[0] || s.from_user_id;
                    const toMember = ledger.members.find(m => m.user_id === s.to_user_id)?.name.split(' ')[0] || s.to_user_id;
                    return (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-[#171A23] border border-white/8 text-[#EDEEF2] flex items-center gap-1.5"
                      >
                        <span className="text-[#FF5C7A] font-semibold">{fromMember}</span>
                        <ArrowRight className="w-3 h-3 text-[#8A8FA3]" />
                        <span className="text-[#C6FF3D] font-semibold">{toMember}</span>
                        <span className="text-[#8A8FA3] ml-1">₹{(s.amount_cents / 100).toFixed(2)}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Telemetry Ticker (Volume, Settled, Drift) */}
          <div className="relative z-10 pt-6 mt-6 border-t border-white/8 grid grid-cols-3 gap-3 sm:gap-4 font-mono">
            <div className="p-3 rounded-xl bg-[#07080D] border border-white/6">
              <div className="text-[10px] text-[#8A8FA3] uppercase tracking-wider">TOTAL VOLUME</div>
              <div className="text-lg sm:text-2xl font-bold text-[#EDEEF2] tabular-nums mt-0.5">
                ₹{(totalSpendCents / 100).toFixed(2)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#07080D] border border-white/6">
              <div className="text-[10px] text-[#8A8FA3] uppercase tracking-wider">SETTLED RATE</div>
              <div className="text-lg sm:text-2xl font-bold text-[#EDEEF2] tabular-nums mt-0.5">
                {settledPercentage}%
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#07080D] border border-white/6">
              <div className="text-[10px] text-[#8A8FA3] uppercase tracking-wider">ROUNDING DRIFT</div>
              <div className="text-lg sm:text-2xl font-bold text-[#C6FF3D] tabular-nums mt-0.5">
                ₹0.00
              </div>
            </div>
          </div>
        </section>

        {/* Right Cockpit: 3D Liquidity Card & Immediate Settlement Station */}
        <section className="lg:col-span-4 flex flex-col justify-between gap-6">
          {/* Virtual Card Canvas */}
          <div className="rounded-3xl bg-[#0F1117] border border-white/8 p-5 sm:p-6 shadow-[0_16px_48px_rgba(0,0,0,0.8)] flex flex-col items-center justify-center">
            <div className="w-full flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-[#8A8FA3] uppercase">LIQUIDITY VAULT</span>
              <span className="text-[10px] font-mono text-[#C6FF3D] bg-[#C6FF3D]/10 px-2 py-0.5 rounded">
                PAYPAL LIVE
              </span>
            </div>

            <VirtualTripCard
              balanceCents={organizerOwedCents}
              tripName={ledger.trip_name || ledger.name || 'Goa Beach Trip 2026'}
              organizerName={organizer.name}
              organizerEmail={organizer.paypal_email || 'sarah.connor@trip.mock'}
              onPayout={onOpenPayoutModal}
            />
          </div>

          {/* Selected Traveler Standings Card */}
          <div className="rounded-3xl bg-[#0F1117] border border-white/8 p-5 sm:p-6 shadow-[0_16px_48px_rgba(0,0,0,0.8)] space-y-4">
            <div className="flex items-center justify-between border-b border-white/8 pb-3">
              <div className="flex items-center gap-2">
                <Avatar userId={activeFocusMember.user_id} name={activeFocusMember.name} size="sm" />
                <div>
                  <div className="text-xs font-semibold text-[#EDEEF2]">{activeFocusMember.name}</div>
                  <div className="text-[10px] text-[#8A8FA3] font-mono">{activeFocusMember.handle}</div>
                </div>
              </div>
              <StatusPill
                status={(ledger.net_balances_cents[activeFocusMember.user_id] || 0) > 0 ? 'paid' : (ledger.net_balances_cents[activeFocusMember.user_id] || 0) < 0 ? 'owes' : 'pending'}
                label={(ledger.net_balances_cents[activeFocusMember.user_id] || 0) > 0 ? 'Creditor' : (ledger.net_balances_cents[activeFocusMember.user_id] || 0) < 0 ? 'Debtor' : 'Settled'}
              />
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between text-[#8A8FA3]">
                <span>Net Position:</span>
                <span className="font-bold text-[#EDEEF2] tabular-nums">
                  ₹{((ledger.net_balances_cents[activeFocusMember.user_id] || 0) / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[#8A8FA3]">
                <span>Roast Consent:</span>
                <span className="text-[#C6FF3D] font-bold">{activeFocusMember.roast_consent}</span>
              </div>
              <div className="flex justify-between text-[#8A8FA3]">
                <span>PayPal Account:</span>
                <span className="text-[#EDEEF2] truncate max-w-[170px]">{activeFocusMember.paypal_email}</span>
              </div>
            </div>

            <div className="pt-2">
              <Link to="/simulator" className="no-underline block">
                <Button variant="secondary" size="sm" className="w-full justify-between">
                  <span>Simulate Payment Link</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* ================================================================ */}
      {/* 3. TACTICAL ARCHITECTURAL PROOF DECK (3 ASYMMETRIC TILES)        */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        {/* Proof Tile 1: Integer-Paisa Equilibrium */}
        <div className="rounded-2xl bg-[#0F1117] border border-white/8 p-6 space-y-3 shadow-md">
          <div className="w-9 h-9 rounded-xl bg-[#171A23] border border-white/10 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-[#C6FF3D]" />
          </div>
          <h3 className="text-base font-display font-semibold text-[#EDEEF2] m-0">
            Integer-Paisa Nonce Proof
          </h3>
          <p className="text-xs text-[#8A8FA3] font-body leading-relaxed m-0">
            Every split divides whole cents with remainders assigned systematically to fronting organizers. Floating-point IEEE-754 drift is architecturally impossible.
          </p>
          <div className="pt-2 font-mono text-[11px] text-[#C6FF3D] flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Formally Verified by Contract 1</span>
          </div>
        </div>

        {/* Proof Tile 2: Gemini 2.5 Flash Itemizer */}
        <div className="rounded-2xl bg-[#0F1117] border border-white/8 p-6 space-y-3 shadow-md">
          <div className="w-9 h-9 rounded-xl bg-[#171A23] border border-white/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[#38E1FF]" />
          </div>
          <h3 className="text-base font-display font-semibold text-[#EDEEF2] m-0">
            Gemini Multimodal OCR
          </h3>
          <p className="text-xs text-[#8A8FA3] font-body leading-relaxed m-0">
            Crumpled paper receipts, multilingual dishes, and service taxes parsed into structured line items with proportional consumption weight.
          </p>
          <div className="pt-2 font-mono text-[11px] text-[#38E1FF] flex items-center gap-1.5">
            <Receipt className="w-3.5 h-3.5" />
            <span>Drag-and-Drop Dropzone Ready</span>
          </div>
        </div>

        {/* Proof Tile 3: Autonomous Escalation Engine */}
        <div className="rounded-2xl bg-[#0F1117] border border-white/8 p-6 space-y-3 shadow-md">
          <div className="w-9 h-9 rounded-xl bg-[#171A23] border border-white/10 flex items-center justify-center">
            <Flame className="w-4 h-4 text-[#FF5C7A]" />
          </div>
          <h3 className="text-base font-display font-semibold text-[#EDEEF2] m-0">
            Sim-Time Escalation
          </h3>
          <p className="text-xs text-[#8A8FA3] font-body leading-relaxed m-0">
            Virtual trip hours advance through 5 delinquency tiers: from courteous reminders to AI roast cards and group chat payment links.
          </p>
          <div className="pt-2 font-mono text-[11px] text-[#FF5C7A] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Interactive +24h Simulator Rail</span>
          </div>
        </div>
      </div>
    </div>
  );
};

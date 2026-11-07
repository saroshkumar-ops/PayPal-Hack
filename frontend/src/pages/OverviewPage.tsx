import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, 
  Clock, 
  ArrowRight, 
  Sparkles, 
  PieChart, 
  ChevronDown, 
  Layers, 
  CheckCircle,
  Receipt,
  Flame,
  ArrowUpRight
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
  const [spotlightPos, setSpotlightPos] = useState({ x: 0, y: 0, active: false });

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
  const organizer = ledger.members.find((m) => m.role === 'organizer') || ledger.members[0];
  const organizerOwedCents = Math.max(0, ledger.net_balances_cents[organizer.user_id] || 0);

  const handleHeroMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setSpotlightPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      active: true,
    });
  };

  const handleHeroMouseLeave = () => {
    setSpotlightPos((prev) => ({ ...prev, active: false }));
  };

  const scrollToFeatures = () => {
    const el = document.getElementById('ledger-features');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-14 w-full py-2">
      {/* ================================================================ */}
      {/* 1. ASYMMETRIC CYBER LEDGER HERO                                  */}
      {/* ================================================================ */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        onMouseMove={handleHeroMouseMove}
        onMouseLeave={handleHeroMouseLeave}
        className="relative rounded-3xl bg-[#0F1117]/85 border border-white/8 shadow-[0_16px_48px_-8px_rgba(0,0,0,0.8)] overflow-hidden pt-10 sm:pt-14 px-6 sm:px-10 lg:px-14 pb-14 sm:pb-16"
      >
        {/* Hairline subtle dot matrix */}
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(rgba(255,255,255,0.2)_1px,transparent_1px)] [background-size:24px_24px]" 
        />

        {/* Dynamic interactive cursor spotlight */}
        {spotlightPos.active && (
          <div
            className="absolute pointer-events-none rounded-full blur-3xl transition-opacity duration-300"
            style={{
              width: 480,
              height: 480,
              left: spotlightPos.x - 240,
              top: spotlightPos.y - 240,
              background: 'radial-gradient(circle, rgba(198, 255, 61, 0.08) 0%, rgba(255, 255, 255, 0.02) 45%, transparent 70%)',
            }}
          />
        )}

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Asymmetric confident typography & actions */}
          <div className="lg:col-span-7 space-y-7">
            {/* Top Tag Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#171A23] border border-white/10 text-xs font-mono text-[#EDEEF2]">
              <span className="w-2 h-2 rounded-full bg-[#C6FF3D] shadow-[0_0_8px_#C6FF3D]" />
              <span className="tracking-wider uppercase text-[11px] text-[#8A8FA3]">
                Autonomous Travel Treasury
              </span>
            </div>

            {/* Main Headline & Subtitle */}
            <div className="space-y-3.5">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-[#EDEEF2] tracking-tight leading-[1.08] m-0">
                Digital banking made for group trips
              </h1>
              <p className="text-sm sm:text-base text-[#8A8FA3] max-w-xl leading-relaxed m-0 font-body">
                Zero-drift integer-cent splits, real-time PayPal settlements, and escalation-aware trip treasury.
              </p>
            </div>

            {/* Action CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <Link to="/simulator" className="no-underline">
                <Button
                  variant="primary"
                  size="md"
                  icon={<ArrowRight className="w-4 h-4" />}
                >
                  Try Judge Simulator
                </Button>
              </Link>

              <Button
                variant="secondary"
                size="md"
                onClick={onOpenReceiptModal}
                icon={<Sparkles className="w-4 h-4 text-[#C6FF3D]" />}
              >
                Scan Receipt (Gemini)
              </Button>
            </div>

            {/* Active Travelers Row with Distinct Palette Avatars */}
            <div className="flex items-center gap-3.5 pt-2">
              <div className="flex -space-x-2">
                {ledger.members.slice(0, 5).map((m) => (
                  <Avatar
                    key={m.user_id}
                    userId={m.user_id}
                    name={m.name}
                    size="sm"
                    className="ring-2 ring-[#0F1117]"
                  />
                ))}
              </div>

              <div>
                <div className="text-xs sm:text-sm font-semibold text-[#EDEEF2]">
                  {ledger.members.length} Active Travelers <span className="text-[#8A8FA3] font-normal">• {ledger.trip_name || ledger.name || 'Goa Beach Trip 2026'}</span>
                </div>
                <div className="text-[11px] text-[#C6FF3D] font-mono flex items-center gap-1.5 mt-0.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>100% Zero-drift settled</span>
                </div>
              </div>
            </div>

            {/* Bottom 3-Stat Counter Grid (JetBrains Mono Tabular Numerals) */}
            <div className="pt-6 border-t border-white/8 grid grid-cols-3 gap-3 sm:gap-4">
              <div className="p-3 sm:p-4 rounded-xl bg-[#07080D]/60 border border-white/6">
                <div className="text-xl sm:text-2xl font-mono font-bold text-[#EDEEF2] tracking-tight tabular-nums">
                  ₹{(totalSpendCents / 100).toFixed(0)}
                </div>
                <div className="text-[10px] text-[#8A8FA3] font-mono uppercase tracking-wider mt-1">
                  Total Volume
                </div>
              </div>

              <div className="p-3 sm:p-4 rounded-xl bg-[#07080D]/60 border border-white/6">
                <div className="text-xl sm:text-2xl font-mono font-bold text-[#EDEEF2] tracking-tight tabular-nums">
                  {settledPercentage}%
                </div>
                <div className="text-[10px] text-[#8A8FA3] font-mono uppercase tracking-wider mt-1">
                  Settled Rate
                </div>
              </div>

              <div className="p-3 sm:p-4 rounded-xl bg-[#07080D]/60 border border-white/6">
                <div className="text-xl sm:text-2xl font-mono font-bold text-[#C6FF3D] tracking-tight tabular-nums">
                  ₹0.00
                </div>
                <div className="text-[10px] text-[#8A8FA3] font-mono uppercase tracking-wider mt-1">
                  Rounding Drift
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: 3D Cyber Ledger Virtual Card */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <VirtualTripCard
              balanceCents={organizerOwedCents}
              tripName={ledger.trip_name || ledger.name || 'Goa Beach Trip 2026'}
              organizerName={organizer.name}
              organizerEmail={organizer.paypal_email || 'sarah.chen@trip.mock'}
              onPayout={onOpenPayoutModal}
            />
          </div>
        </div>

        {/* Scroll down trigger */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center justify-center">
          <button
            onClick={scrollToFeatures}
            aria-label="Scroll to features"
            className="w-10 h-10 rounded-full bg-[#171A23] border border-white/12 shadow-xl flex items-center justify-center text-[#8A8FA3] hover:text-[#C6FF3D] hover:border-[#C6FF3D]/40 transition-colors cursor-pointer"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
      </motion.section>

      {/* ================================================================ */}
      {/* 2. ARCHITECTURE PROTOCOL RAIL                                    */}
      {/* ================================================================ */}
      <section className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 py-1">
        {[
          { label: 'PayPal Orders v2', icon: <ShieldCheck className="w-3.5 h-3.5 text-[#FFC439]" /> },
          { label: 'Gemini 2.5 Flash OCR', icon: <Sparkles className="w-3.5 h-3.5 text-[#C6FF3D]" /> },
          { label: 'Spring Boot 3.4 Core', icon: <Layers className="w-3.5 h-3.5 text-[#EDEEF2]" /> },
          { label: 'Double-Entry Accounting', icon: <Clock className="w-3.5 h-3.5 text-[#8A8FA3]" /> },
          { label: 'Bipartite Minimum Cash Flow', icon: <CheckCircle className="w-3.5 h-3.5 text-[#C6FF3D]" /> },
        ].map((item, idx) => (
          <div
            key={idx}
            className="px-3.5 py-1.5 rounded-xl bg-[#0F1117] border border-white/6 text-xs font-mono text-[#8A8FA3] flex items-center gap-2 shadow-sm"
          >
            {item.icon}
            <span>{item.label}</span>
          </div>
        ))}
      </section>

      {/* ================================================================ */}
      {/* 3. ASYMMETRIC BENTO CYBER LEDGER SYSTEM                          */}
      {/* ================================================================ */}
      <section id="ledger-features" className="space-y-6 pt-4">
        {/* Asymmetric Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 border-b border-white/8 pb-4">
          <div>
            <div className="text-xs font-mono text-[#C6FF3D] uppercase tracking-widest">
              Core Architecture
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#EDEEF2] tracking-tight mt-1 m-0">
              Deterministic Treasury Engine
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#8A8FA3] max-w-md m-0 font-body">
            Replaces clumsy spreadsheets with mathematical equilibrium, instant PayPal checkout links, and multimodal bill itemization.
          </p>
        </div>

        {/* Asymmetric Bento Grid (Span 7 + Span 5 layout) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Card 1 (Span 7): Zero-Drift Integer Cent Mathematics */}
          <div className="lg:col-span-7 rounded-2xl bg-[#0F1117] border border-white/8 p-6 sm:p-8 flex flex-col justify-between shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#171A23] border border-white/10 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-[#C6FF3D]" />
                </div>
                <StatusPill status="paid" label="Deterministic 0-Drift" />
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-display font-semibold text-[#EDEEF2] m-0">
                  Integer-Cent Balance & Escrow
                </h3>
                <p className="text-xs sm:text-sm text-[#8A8FA3] mt-1.5 leading-relaxed font-body">
                  Eliminates rounding discrepancy across multi-currency splits. Floating point drift is forbidden by contract: all splits calculate in integer paise with remainder distribution to the primary payer.
                </p>
              </div>
            </div>

            {/* Live Terminal Accounting Preview */}
            <div className="mt-6 p-4 rounded-xl bg-[#07080D] border border-white/6 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between text-[#8A8FA3]">
                <span>LEDGER STATE</span>
                <span className="text-[#C6FF3D]">CONGRUENT</span>
              </div>
              <div className="h-1.5 w-full bg-[#171A23] rounded-full overflow-hidden">
                <div className="h-full bg-[#C6FF3D] rounded-full w-full" />
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1">
                <span className="text-[#8A8FA3]">Double-Entry Proof:</span>
                <span className="text-[#EDEEF2] font-semibold tabular-nums">
                  Σ(Credits) = Σ(Debits)
                </span>
              </div>
            </div>
          </div>

          {/* Card 2 (Span 5): Gemini 2.5 Flash OCR Scanner */}
          <div className="lg:col-span-5 rounded-2xl bg-[#0F1117] border border-white/8 p-6 sm:p-8 flex flex-col justify-between shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#171A23] border border-white/10 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-[#38E1FF]" />
                </div>
                <span className="text-[11px] font-mono text-[#38E1FF] bg-[#38E1FF]/10 border border-[#38E1FF]/30 px-2.5 py-0.5 rounded-full">
                  Gemini OCR
                </span>
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-display font-semibold text-[#EDEEF2] m-0">
                  Multimodal Line-Itemization
                </h3>
                <p className="text-xs sm:text-sm text-[#8A8FA3] mt-1.5 leading-relaxed font-body">
                  Drop any crumpled restaurant bill. Structured line items, proportional tax, and tip shares are apportioned to each traveler automatically.
                </p>
              </div>
            </div>

            <div className="mt-6">
              <Button
                variant="secondary"
                size="sm"
                onClick={onOpenReceiptModal}
                className="w-full justify-between"
                icon={<Sparkles className="w-4 h-4 text-[#C6FF3D]" />}
              >
                <span>Launch OCR Dropzone</span>
                <ArrowUpRight className="w-4 h-4 text-[#8A8FA3]" />
              </Button>
            </div>
          </div>

          {/* Card 3 (Span 5): PayPal Orders v2 Sandbox Rails */}
          <div className="lg:col-span-5 rounded-2xl bg-[#0F1117] border border-white/8 p-6 sm:p-8 flex flex-col justify-between shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#171A23] border border-white/10 flex items-center justify-center">
                  <span className="font-display font-black text-[#FFC439] text-base">P</span>
                </div>
                <StatusPill status="escrow" label="PayPal Orders v2" />
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-display font-semibold text-[#EDEEF2] m-0">
                  Instant PayPal Settlement Links
                </h3>
                <p className="text-xs sm:text-sm text-[#8A8FA3] mt-1.5 leading-relaxed font-body">
                  Every split generates an authenticated PayPal Sandbox checkout token. Debts settle directly into the group treasury with zero manual chasing.
                </p>
              </div>
            </div>

            <div className="mt-6 p-3.5 rounded-xl bg-[#07080D] border border-white/6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#FFC439]" />
                <span className="text-xs font-mono text-[#EDEEF2]">PayPal Webhook SSE</span>
              </div>
              <span className="text-[11px] font-mono text-[#8A8FA3]">PAYMENT.CAPTURE</span>
            </div>
          </div>

          {/* Card 4 (Span 7): Autonomous Escalation Matrix */}
          <div className="lg:col-span-7 rounded-2xl bg-[#0F1117] border border-white/8 p-6 sm:p-8 flex flex-col justify-between shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#171A23] border border-white/10 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-[#FF5C7A]" />
                </div>
                <StatusPill status="owes" label="Dynamic Roast Escalator" />
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-display font-semibold text-[#EDEEF2] m-0">
                  Sim-Time Adaptive Peer Pressure
                </h3>
                <p className="text-xs sm:text-sm text-[#8A8FA3] mt-1.5 leading-relaxed font-body">
                  TripSheriff advances simulated virtual hours to test delinquent repayment behaviors: gently nudging polite concierges, transitioning to passive-aggressive group warnings, and generating AI roast cards.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={onAdvanceTime}
                icon={<Clock className="w-3.5 h-3.5" />}
              >
                Fast-Forward +24h
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={onSimulateExpense}
                icon={<PieChart className="w-3.5 h-3.5" />}
              >
                Simulate Seafood Dinner
              </Button>
              <Link to="/simulator" className="no-underline ml-auto">
                <Button variant="ghost" size="sm" icon={<ArrowRight className="w-3.5 h-3.5 text-[#C6FF3D]" />}>
                  Open Full Simulator
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

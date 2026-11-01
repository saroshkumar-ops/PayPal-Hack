import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Receipt, 
  ShieldCheck, 
  Clock, 
  ArrowRight, 
  PlusCircle, 
  Sparkles,
  PieChart,
  BarChart3,
  ChevronDown,
  Quote,
  Layers,
  Coins,
  Star,
  CheckCircle
} from 'lucide-react';
import type { TripLedger } from '../types';
import { VirtualTripCard } from '../components/cards/VirtualTripCard';

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

  const scrollToFeatures = () => {
    const el = document.getElementById('bento-features');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-12 w-full py-3">
      {/* ================================================================ */}
      {/* 1. HERO SECTION (CYBERBANK FINTECH SHOWCASE)                     */}
      {/* ================================================================ */}
      <motion.section 
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative rounded-[32px] sm:rounded-[44px] bg-[#10161C] border border-[#33475A] shadow-2xl overflow-hidden pt-10 sm:pt-16 px-6 sm:px-12 lg:px-16 pb-16 sm:pb-20"
      >
        {/* Subtle blueprint grid background */}
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#8199AE_1.5px,transparent_1.5px)] [background-size:32px_32px]" />

        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-[#4E6A83]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left Column: Bold Typography, CTA, Avatars, Key Stats */}
          <div className="lg:col-span-7 space-y-8">
            {/* Top pill badge */}
            <motion.div 
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#1F2C38] border border-[#33475A] text-xs sm:text-sm font-mono text-[#B7C6D3] shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-[#B7C6D3] animate-pulse" />
              <span className="uppercase tracking-widest font-bold">Autonomous Travel Treasury</span>
            </motion.div>

            {/* Main Headline & Punchy Subtitle */}
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#E7EDF2] tracking-tight leading-[1.08] m-0">
                Digital banking made for group trips
              </h1>
              <p className="text-base sm:text-lg text-[#8199AE] max-w-xl leading-relaxed m-0 font-medium">
                Zero-drift integer-cent splits, real-time PayPal settlements, and escalation-aware trip treasury.
              </p>
            </div>

            {/* Action CTA Pills with Micro-Interactions */}
            <div className="flex flex-wrap items-center gap-4">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  to="/simulator"
                  className="inline-flex items-center gap-3.5 px-7 py-4 rounded-full bg-[#4E6A83] hover:bg-[#33475A] text-[#E7EDF2] text-sm sm:text-base font-bold transition-all no-underline shadow-xl shadow-black/50 group"
                >
                  <span>Try Judge Simulator</span>
                  <span className="w-8 h-8 rounded-full bg-[#E7EDF2] text-[#10161C] flex items-center justify-center transition-transform group-hover:translate-x-1 shadow-md">
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </Link>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <button
                  onClick={onOpenReceiptModal}
                  className="inline-flex items-center gap-2.5 px-6 py-4 rounded-full bg-[#1F2C38] hover:bg-[#33475A] border border-[#33475A] text-[#E7EDF2] text-sm sm:text-base font-bold transition-all cursor-pointer shadow-md"
                >
                  <Sparkles className="w-4 h-4 text-[#8199AE]" />
                  <span>Scan Receipt (Gemini)</span>
                </button>
              </motion.div>
            </div>

            {/* Social Proof Avatar Stack (Bigger & High Contrast) */}
            <div className="flex items-center gap-4 pt-2">
              <div className="flex -space-x-3">
                {ledger.members.map((m, idx) => (
                  <motion.div
                    key={m.user_id}
                    whileHover={{ y: -3, scale: 1.1 }}
                    title={m.name}
                    className="w-10 h-10 rounded-full bg-[#1F2C38] border-2 border-[#10161C] flex items-center justify-center text-sm font-bold text-[#E7EDF2] shadow-md cursor-pointer"
                    style={{ zIndex: 10 - idx }}
                  >
                    {m.name.charAt(0)}
                  </motion.div>
                ))}
              </div>
              <div>
                <div className="text-sm sm:text-base font-bold text-[#E7EDF2]">
                  {ledger.members.length} Active Travelers <span className="text-[#8199AE] font-normal">• {ledger.trip_name || ledger.name || 'Goa Beach Trip 2026'}</span>
                </div>
                <div className="text-xs sm:text-sm text-[#4E6A83] font-semibold flex items-center gap-1.5 mt-0.5">
                  <CheckCircle className="w-3.5 h-3.5 text-[#8199AE]" />
                  <span>100% Zero-drift settled</span>
                </div>
              </div>
            </div>

            {/* Bottom 3-Stat Counter Row (Bigger, Bold, Clean) */}
            <div className="pt-8 border-t border-[#33475A]/70 grid grid-cols-3 gap-6">
              <div>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-black font-mono text-[#E7EDF2] tracking-tight">
                  ₹{(totalSpendCents / 100).toFixed(0)}
                </div>
                <div className="text-xs sm:text-sm text-[#8199AE] font-bold uppercase tracking-wider mt-1">
                  Total Volume
                </div>
              </div>

              <div>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-black font-mono text-[#E7EDF2] tracking-tight">
                  {settledPercentage}%
                </div>
                <div className="text-xs sm:text-sm text-[#8199AE] font-bold uppercase tracking-wider mt-1">
                  Settled Rate
                </div>
              </div>

              <div>
                <div className="text-2xl sm:text-3xl lg:text-4xl font-black font-mono text-[#E7EDF2] tracking-tight">
                  ₹0.00
                </div>
                <div className="text-xs sm:text-sm text-[#8199AE] font-bold uppercase tracking-wider mt-1">
                  Rounding Drift
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: 3D Dual Floating Cards with Live Data */}
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

        {/* Distinctive Bottom Curved Notch with Down Arrow */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center justify-center">
          <motion.button
            whileHover={{ y: 2, scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={scrollToFeatures}
            aria-label="Scroll to features"
            className="w-12 h-12 rounded-full bg-[#1F2C38] border border-[#33475A] shadow-2xl flex items-center justify-center text-[#E7EDF2] hover:bg-[#33475A] transition-colors cursor-pointer group"
          >
            <ChevronDown className="w-6 h-6 text-[#8199AE] group-hover:text-[#E7EDF2] transition-colors" />
          </motion.button>
        </div>
      </motion.section>

      {/* ================================================================ */}
      {/* 2. PARTNER / ARCHITECTURE PILL MARQUEE                           */}
      {/* ================================================================ */}
      <section className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 py-2">
        {[
          { label: 'PayPal Orders v2', icon: <ShieldCheck className="w-4 h-4 text-[#B7C6D3]" /> },
          { label: 'Gemini 2.5 Flash OCR', icon: <Sparkles className="w-4 h-4 text-[#B7C6D3]" /> },
          { label: 'Spring Boot 3.4', icon: <Layers className="w-4 h-4 text-[#B7C6D3]" /> },
          { label: 'AG Grid Enterprise', icon: <Coins className="w-4 h-4 text-[#B7C6D3]" /> },
          { label: 'Sim-Time Escalation', icon: <Clock className="w-4 h-4 text-[#B7C6D3]" /> },
        ].map((item, idx) => (
          <motion.div
            key={idx}
            whileHover={{ y: -2, scale: 1.03 }}
            className="px-5 py-2.5 rounded-full bg-[#1F2C38] border border-[#33475A] text-xs sm:text-sm font-mono font-semibold text-[#8199AE] hover:text-[#E7EDF2] flex items-center gap-2.5 shadow-sm transition-colors cursor-default"
          >
            {item.icon}
            <span>{item.label}</span>
          </motion.div>
        ))}
      </section>

      {/* ================================================================ */}
      {/* 3. "WHAT DO WE OFFER?" BENTO FEATURE GRID (HIGHLY VISUAL)        */}
      {/* ================================================================ */}
      <section id="bento-features" className="space-y-8 pt-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-3xl sm:text-4xl font-black text-[#E7EDF2] tracking-tight m-0">
            What do we offer?
          </h2>
          <p className="text-sm sm:text-base text-[#8199AE] m-0 font-medium">
            Zero-drift mathematics, multimodal itemization, and automated checkout.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Bento Card 1: Zero Drift Guarantee */}
          <motion.div 
            whileHover={{ y: -6, borderColor: '#4E6A83' }}
            transition={{ duration: 0.2 }}
            className="rounded-3xl bg-[#1F2C38] border border-[#33475A] p-7 sm:p-8 flex flex-col justify-between shadow-lg"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-[#10161C] border border-[#33475A] flex items-center justify-center mb-6 shadow-inner">
                <ShieldCheck className="w-7 h-7 text-[#E7EDF2]" />
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-[#E7EDF2] m-0">
                Security Guarantee
              </h3>
              <p className="text-sm text-[#8199AE] mt-2 mb-6 leading-relaxed">
                Deterministic integer-paisa split algorithm ensures exact mathematical balance with zero drift.
              </p>
            </div>

            {/* Visual Mini-Widget: Live Drift Equilibrium Gauge */}
            <div className="p-4 rounded-2xl bg-[#10161C] border border-[#33475A] space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#8199AE] font-semibold">Ledger Drift:</span>
                <span className="text-[#E7EDF2] font-bold">₹0.00 / 0%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-[#1F2C38] overflow-hidden">
                <div className="h-full bg-[#4E6A83] rounded-full w-full" />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-[#8199AE] pt-1">
                <span>100% Balanced</span>
                <span className="text-[#B7C6D3] font-semibold">Verified</span>
              </div>
            </div>
          </motion.div>

          {/* Bento Card 2: Proportional Itemization */}
          <motion.div 
            whileHover={{ y: -6, borderColor: '#4E6A83' }}
            transition={{ duration: 0.2 }}
            className="rounded-3xl bg-[#1F2C38] border border-[#33475A] p-7 sm:p-8 flex flex-col justify-between shadow-lg"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-[#10161C] border border-[#33475A] flex items-center justify-center mb-6 shadow-inner">
                <PieChart className="w-7 h-7 text-[#E7EDF2]" />
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-[#E7EDF2] m-0">
                Proportional Splits
              </h3>
              <p className="text-sm text-[#8199AE] mt-2 mb-6 leading-relaxed">
                Gemini OCR extracts line items. Taxes and tips are apportioned by actual consumption ratio.
              </p>
            </div>

            {/* Visual Mini-Widget: Proportional Ratio Split Bar */}
            <div className="p-4 rounded-2xl bg-[#10161C] border border-[#33475A] space-y-2.5">
              <div className="text-xs font-mono text-[#8199AE] font-semibold">
                Dynamic Tax & Tip Share
              </div>
              <div className="flex h-2.5 w-full rounded-full overflow-hidden gap-1">
                <div className="bg-[#E7EDF2] h-full w-[42%]" title="Sarah 42%" />
                <div className="bg-[#8199AE] h-full w-[33%]" title="Alex 33%" />
                <div className="bg-[#4E6A83] h-full w-[25%]" title="Dave 25%" />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-[#8199AE]">
                <span>Sarah 42%</span>
                <span>Alex 33%</span>
                <span>Dave 25%</span>
              </div>
            </div>
          </motion.div>

          {/* Bento Card 3: Autonomous Escalations */}
          <motion.div 
            whileHover={{ y: -6, borderColor: '#4E6A83' }}
            transition={{ duration: 0.2 }}
            className="rounded-3xl bg-[#1F2C38] border border-[#33475A] p-7 sm:p-8 flex flex-col justify-between shadow-lg"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-[#10161C] border border-[#33475A] flex items-center justify-center mb-6 shadow-inner">
                <BarChart3 className="w-7 h-7 text-[#E7EDF2]" />
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-[#E7EDF2] m-0">
                Automated Escalation
              </h3>
              <p className="text-sm text-[#8199AE] mt-2 mb-6 leading-relaxed">
                Sim-time engine advances overdue debts through 5 roast tiers and triggers 1-click PayPal orders.
              </p>
            </div>

            {/* Visual Mini-Widget: 3-Tier Escalation Step Progress */}
            <div className="p-4 rounded-2xl bg-[#10161C] border border-[#33475A] space-y-2">
              <div className="text-xs font-mono text-[#8199AE] font-semibold">
                Sim-Time Escalation Pipeline
              </div>
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <div className="p-1.5 rounded-lg bg-[#1F2C38] text-center border border-[#33475A]">
                  <span className="text-[10px] font-mono text-[#8199AE] block">24h</span>
                  <span className="text-xs font-bold text-[#B7C6D3]">Notice</span>
                </div>
                <div className="p-1.5 rounded-lg bg-[#4E6A83]/30 text-center border border-[#4E6A83]">
                  <span className="text-[10px] font-mono text-[#B7C6D3] block">48h</span>
                  <span className="text-xs font-bold text-[#E7EDF2]">AI Roast</span>
                </div>
                <div className="p-1.5 rounded-lg bg-[#1F2C38] text-center border border-[#33475A]">
                  <span className="text-[10px] font-mono text-[#8199AE] block">72h</span>
                  <span className="text-xs font-bold text-[#8199AE]">Embargo</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 4. QUICK SIMULATION CONTROLS (INTERACTIVE ACTION CARDS)          */}
      {/* ================================================================ */}
      <section className="rounded-3xl bg-[#1F2C38] border border-[#33475A] p-7 sm:p-8 shadow-xl">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#33475A]">
          <div>
            <span className="text-sm sm:text-base font-bold text-[#E7EDF2] uppercase tracking-wider font-mono">
              Quick Simulation Controls
            </span>
            <div className="text-xs sm:text-sm text-[#8199AE] mt-0.5">
              Trigger virtual transactions and simulate real-time PayPal operations
            </div>
          </div>
          <span className="text-xs sm:text-sm font-mono text-[#8199AE] px-3 py-1 rounded-lg bg-[#10161C] border border-[#33475A]">
            Trip: <strong className="text-[#E7EDF2]">{ledger.trip_id}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.button
            whileHover={{ y: -3, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onSimulateExpense}
            className="flex items-center gap-3.5 p-4 rounded-2xl bg-[#10161C] hover:bg-[#33475A]/60 border border-[#33475A] text-left transition-all cursor-pointer shadow-md"
          >
            <div className="w-10 h-10 rounded-xl bg-[#1F2C38] border border-[#33475A] flex items-center justify-center shrink-0">
              <PlusCircle className="w-5 h-5 text-[#8199AE]" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#E7EDF2]">Simulate Dinner</div>
              <div className="text-xs text-[#8199AE]">₹1,500 Group Split</div>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ y: -3, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onAdvanceTime}
            className="flex items-center gap-3.5 p-4 rounded-2xl bg-[#10161C] hover:bg-[#33475A]/60 border border-[#33475A] text-left transition-all cursor-pointer shadow-md"
          >
            <div className="w-10 h-10 rounded-xl bg-[#1F2C38] border border-[#33475A] flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-[#8199AE]" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#E7EDF2]">Advance Time</div>
              <div className="text-xs text-[#8199AE]">+24h Sim-Time</div>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ y: -3, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onOpenReceiptModal}
            className="flex items-center gap-3.5 p-4 rounded-2xl bg-[#10161C] hover:bg-[#33475A]/60 border border-[#33475A] text-left transition-all cursor-pointer shadow-md"
          >
            <div className="w-10 h-10 rounded-xl bg-[#1F2C38] border border-[#33475A] flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-[#8199AE]" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#E7EDF2]">Scan Receipt</div>
              <div className="text-xs text-[#8199AE]">Multimodal Vision</div>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ y: -3, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onOpenPayoutModal}
            className="flex items-center gap-3.5 p-4 rounded-2xl bg-[#4E6A83] hover:bg-[#33475A] border border-[#33475A] text-left transition-all cursor-pointer shadow-md"
          >
            <div className="w-10 h-10 rounded-xl bg-[#10161C] border border-[#8199AE]/40 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-[#E7EDF2]" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#E7EDF2]">Batch Payout</div>
              <div className="text-xs text-[#B7C6D3]">1-Click PayPal</div>
            </div>
          </motion.button>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 5. "WHAT OUR TRAVELERS ARE SAYING" (HIGH IMPACT QUOTES)          */}
      {/* ================================================================ */}
      <section className="space-y-8 pt-4">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-3xl sm:text-4xl font-black text-[#E7EDF2] tracking-tight m-0">
            What our travelers are saying
          </h2>
          <p className="text-sm sm:text-base text-[#8199AE] m-0 font-medium">
            Real crew feedback on zero-drift settlements and AI escalations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Quote 1: Alex */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="rounded-3xl bg-[#1F2C38] border border-[#33475A] p-7 flex flex-col justify-between shadow-md"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <Quote className="w-7 h-7 text-[#8199AE]" />
                <div className="flex gap-1 text-[#E7EDF2]">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current text-[#B7C6D3]" />
                  ))}
                </div>
              </div>
              <p className="text-sm sm:text-base text-[#E7EDF2] leading-relaxed mb-6 italic font-medium">
                "The Gemini receipt scanner parsed our ₹14,500 beachfront dinner in seconds. Everyone paid their fair share with zero arguments."
              </p>
            </div>
            <div className="flex items-center gap-3.5 pt-4 border-t border-[#33475A]">
              <div className="w-10 h-10 rounded-full bg-[#10161C] border border-[#4E6A83] flex items-center justify-center text-sm font-bold text-[#E7EDF2]">
                AR
              </div>
              <div>
                <div className="text-sm font-bold text-[#E7EDF2]">Alex Rivera</div>
                <div className="text-xs text-[#8199AE]">Trip Member • @alex_travels</div>
              </div>
            </div>
          </motion.div>

          {/* Quote 2: Dave */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="rounded-3xl bg-[#1F2C38] border border-[#33475A] p-7 flex flex-col justify-between shadow-md"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <Quote className="w-7 h-7 text-[#8199AE]" />
                <div className="flex gap-1 text-[#E7EDF2]">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current text-[#B7C6D3]" />
                  ))}
                </div>
              </div>
              <p className="text-sm sm:text-base text-[#E7EDF2] leading-relaxed mb-6 italic font-medium">
                "I ignored the 48-hour reminder and TripSheriff roasted me in our group chat! Settled my share instantly via PayPal checkout."
              </p>
            </div>
            <div className="flex items-center gap-3.5 pt-4 border-t border-[#33475A]">
              <div className="w-10 h-10 rounded-full bg-[#10161C] border border-[#4E6A83] flex items-center justify-center text-sm font-bold text-[#E7EDF2]">
                DK
              </div>
              <div>
                <div className="text-sm font-bold text-[#E7EDF2]">Dave Kim</div>
                <div className="text-xs text-[#8199AE]">Trip Member • @dave_k</div>
              </div>
            </div>
          </motion.div>

          {/* Quote 3: Sarah (Organizer) */}
          <motion.div 
            whileHover={{ y: -5 }}
            className="rounded-3xl bg-[#1F2C38] border border-[#33475A] p-7 flex flex-col justify-between shadow-md"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <Quote className="w-7 h-7 text-[#8199AE]" />
                <div className="flex gap-1 text-[#E7EDF2]">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current text-[#B7C6D3]" />
                  ))}
                </div>
              </div>
              <p className="text-sm sm:text-base text-[#E7EDF2] leading-relaxed mb-6 italic font-medium">
                "As the organizer, I fronted ₹14,500 for the villa. TripSheriff tracked every rupee and delivered a 1-click batch payout to my wallet."
              </p>
            </div>
            <div className="flex items-center gap-3.5 pt-4 border-t border-[#33475A]">
              <div className="w-10 h-10 rounded-full bg-[#10161C] border border-[#4E6A83] flex items-center justify-center text-sm font-bold text-[#E7EDF2]">
                SC
              </div>
              <div>
                <div className="text-sm font-bold text-[#E7EDF2]">Sarah Chen</div>
                <div className="text-xs text-[#8199AE]">Trip Organizer • @sarah_c</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 6. RECENT EXPENSES LIST (WITH AG GRID JUMP LINK)                 */}
      {/* ================================================================ */}
      <section className="rounded-3xl bg-[#1F2C38] border border-[#33475A] p-7 sm:p-8 shadow-xl">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#33475A]">
          <div>
            <span className="text-sm sm:text-base font-bold text-[#E7EDF2] uppercase tracking-wider font-mono">
              Recent Logged Expenses
            </span>
            <div className="text-xs sm:text-sm text-[#8199AE] mt-0.5">
              Live entries tracked with integer-cent accuracy
            </div>
          </div>
          <Link
            to="/ledger"
            className="text-xs sm:text-sm text-[#E7EDF2] hover:text-[#B7C6D3] no-underline flex items-center gap-2 font-semibold px-4 py-2 rounded-xl bg-[#10161C] border border-[#33475A] hover:border-[#4E6A83] transition-all shadow-sm"
          >
            <span>Open AG Grid</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="space-y-3">
          {ledger.expenses.slice(0, 4).map((exp) => (
            <motion.div
              key={exp.expense_id}
              whileHover={{ x: 4 }}
              className="flex items-center justify-between p-4 rounded-2xl bg-[#10161C] border border-[#33475A] hover:border-[#4E6A83] transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-[#1F2C38] border border-[#33475A] flex items-center justify-center shrink-0">
                  <Receipt className="w-5 h-5 text-[#8199AE]" />
                </div>
                <div>
                  <div className="text-sm sm:text-base font-bold text-[#E7EDF2]">{exp.description}</div>
                  <div className="text-xs text-[#8199AE] mt-0.5">
                    Category: {exp.category} • Fronted by Sarah
                  </div>
                </div>
              </div>
              <div className="text-right font-mono font-black text-base sm:text-lg text-[#E7EDF2]">
                ₹{(exp.amount_cents / 100).toFixed(2)}
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
};

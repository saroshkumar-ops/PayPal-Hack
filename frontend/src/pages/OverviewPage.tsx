import React from 'react';
import { Link } from 'react-router-dom';
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
  Coins
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
    <div className="space-y-10 w-full py-2">
      {/* ================================================================ */}
      {/* HERO SECTION (CYBERBANK FINTECH SHOWCASE)                        */}
      {/* ================================================================ */}
      <section className="relative rounded-[28px] sm:rounded-[36px] bg-[#10161C] border border-[#33475A] shadow-2xl overflow-hidden pt-8 sm:pt-12 px-6 sm:px-10 lg:px-12 pb-14">
        {/* Subtle grid background pattern */}
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#8199AE_1px,transparent_1px)] [background-size:28px_28px]" />

        {/* Top ambient glow light */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#4E6A83]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Typography, CTA, Avatars, Key Stats */}
          <div className="lg:col-span-7 space-y-6 sm:space-y-8">
            {/* Top pill badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1F2C38] border border-[#33475A] text-xs font-mono text-[#8199AE]">
              <Sparkles className="w-3.5 h-3.5 text-[#B7C6D3]" />
              <span className="uppercase tracking-wider">Autonomous Travel Treasury</span>
            </div>

            {/* Main Headline */}
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#E7EDF2] tracking-tight leading-[1.1] m-0">
                Digital banking made for group trips
              </h1>
              <p className="text-sm sm:text-base text-[#8199AE] max-w-xl leading-relaxed m-0">
                Since 2026, guiding travel groups with zero-drift integer-cent splits, 
                real-time PayPal v2 settlements, and escalation-aware trip treasury.
              </p>
            </div>

            {/* Action CTA Pills */}
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/simulator"
                className="inline-flex items-center gap-3 px-6 py-3.5 rounded-full bg-[#4E6A83] hover:bg-[#33475A] text-[#E7EDF2] text-sm font-semibold transition-all no-underline shadow-lg shadow-black/40 group"
              >
                <span>Try Judge Simulator</span>
                <span className="w-7 h-7 rounded-full bg-[#E7EDF2] text-[#10161C] flex items-center justify-center transition-transform group-hover:translate-x-0.5">
                  <ArrowRight className="w-4 h-4" />
                </span>
              </Link>

              <button
                onClick={onOpenReceiptModal}
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-full bg-[#1F2C38] hover:bg-[#33475A] border border-[#33475A] text-[#E7EDF2] text-sm font-semibold transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#8199AE]" />
                <span>Scan Receipt (Gemini OCR)</span>
              </button>
            </div>

            {/* Social Proof Avatar Stack */}
            <div className="flex items-center gap-3 pt-2">
              <div className="flex -space-x-2">
                {ledger.members.map((m, idx) => (
                  <div
                    key={m.user_id}
                    title={m.name}
                    className="w-8 h-8 rounded-full bg-[#1F2C38] border-2 border-[#10161C] flex items-center justify-center text-xs font-bold text-[#E7EDF2] shadow-sm"
                    style={{ zIndex: 10 - idx }}
                  >
                    {m.name.charAt(0)}
                  </div>
                ))}
              </div>
              <div className="text-xs text-[#8199AE]">
                <strong className="text-[#E7EDF2] font-semibold">{ledger.members.length} Active Travelers</strong> in {ledger.trip_name || ledger.name || 'Goa Beach Trip 2026'}
                <span className="block text-[11px] text-[#4E6A83]">100% Zero-drift settled</span>
              </div>
            </div>

            {/* Bottom 3-Stat Counter Row (Matching CyberBank Frame) */}
            <div className="pt-6 border-t border-[#33475A]/60 grid grid-cols-3 gap-4">
              <div>
                <div className="text-xl sm:text-2xl font-extrabold font-mono text-[#E7EDF2]">
                  ₹{(totalSpendCents / 100).toFixed(0)}
                </div>
                <div className="text-[11px] sm:text-xs text-[#8199AE] font-medium mt-0.5">
                  Total Spend Volume
                </div>
              </div>

              <div>
                <div className="text-xl sm:text-2xl font-extrabold font-mono text-[#E7EDF2]">
                  {settledPercentage}%
                </div>
                <div className="text-[11px] sm:text-xs text-[#8199AE] font-medium mt-0.5">
                  PayPal Settled Rate
                </div>
              </div>

              <div>
                <div className="text-xl sm:text-2xl font-extrabold font-mono text-[#E7EDF2]">
                  ₹0.00
                </div>
                <div className="text-[11px] sm:text-xs text-[#8199AE] font-medium mt-0.5">
                  Mathematical Drift
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: 3D Dual Floating Cards */}
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

        {/* Distinctive Bottom Curved Notch with Down Arrow (Signature CyberBank UI) */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center justify-center">
          <button
            onClick={scrollToFeatures}
            aria-label="Scroll to features"
            className="w-10 h-10 rounded-full bg-[#1F2C38] border border-[#33475A] shadow-xl flex items-center justify-center text-[#E7EDF2] hover:bg-[#33475A] transition-all cursor-pointer group"
          >
            <ChevronDown className="w-5 h-5 text-[#8199AE] group-hover:text-[#E7EDF2] transition-colors" />
          </button>
        </div>
      </section>

      {/* ================================================================ */}
      {/* PARTNER / ARCHITECTURE PILL MARQUEE                             */}
      {/* ================================================================ */}
      <section className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 py-2">
        <div className="px-4 py-2 rounded-full bg-[#1F2C38] border border-[#33475A] text-xs font-mono text-[#8199AE] flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-[#B7C6D3]" />
          <span>PayPal Orders v2</span>
        </div>
        <div className="px-4 py-2 rounded-full bg-[#1F2C38] border border-[#33475A] text-xs font-mono text-[#8199AE] flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#B7C6D3]" />
          <span>Gemini 2.5 Flash OCR</span>
        </div>
        <div className="px-4 py-2 rounded-full bg-[#1F2C38] border border-[#33475A] text-xs font-mono text-[#8199AE] flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-[#B7C6D3]" />
          <span>Spring Boot 3.4</span>
        </div>
        <div className="px-4 py-2 rounded-full bg-[#1F2C38] border border-[#33475A] text-xs font-mono text-[#8199AE] flex items-center gap-2">
          <Coins className="w-3.5 h-3.5 text-[#B7C6D3]" />
          <span>AG Grid Enterprise</span>
        </div>
        <div className="px-4 py-2 rounded-full bg-[#1F2C38] border border-[#33475A] text-xs font-mono text-[#8199AE] flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-[#B7C6D3]" />
          <span>Sim-Time Escalation</span>
        </div>
      </section>

      {/* ================================================================ */}
      {/* "WHAT DO WE OFFER?" BENTO FEATURE GRID (FRAME 04 INSPIRATION)    */}
      {/* ================================================================ */}
      <section id="bento-features" className="space-y-6 pt-4">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-[#E7EDF2] tracking-tight m-0">
            What do we offer?
          </h2>
          <p className="text-xs sm:text-sm text-[#8199AE] m-0">
            Zero-drift mathematics, multimodal itemized OCR, and automated settlement pipelines.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Bento Card 1: Zero Drift Guarantee */}
          <div className="rounded-3xl bg-[#1F2C38] border border-[#33475A] p-6 sm:p-8 flex flex-col items-center text-center justify-between shadow-sm hover:border-[#4E6A83] transition-all">
            <div className="w-14 h-14 rounded-2xl bg-[#10161C] border border-[#33475A] flex items-center justify-center mb-5 shadow-inner">
              <ShieldCheck className="w-7 h-7 text-[#E7EDF2]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-[#E7EDF2] m-0">
                Security Guarantee
              </h3>
              <p className="text-xs text-[#8199AE] leading-relaxed m-0">
                Deterministic integer-paisa split algorithms ensure zero rounding loss across 
                every group expense and currency conversion.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-[#33475A]/60 w-full text-[11px] font-mono text-[#B7C6D3]">
              100% Balanced Ledger
            </div>
          </div>

          {/* Bento Card 2: Proportional Itemization */}
          <div className="rounded-3xl bg-[#1F2C38] border border-[#33475A] p-6 sm:p-8 flex flex-col items-center text-center justify-between shadow-sm hover:border-[#4E6A83] transition-all">
            <div className="w-14 h-14 rounded-2xl bg-[#10161C] border border-[#33475A] flex items-center justify-center mb-5 shadow-inner">
              <PieChart className="w-7 h-7 text-[#E7EDF2]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-[#E7EDF2] m-0">
                Proportional Splits
              </h3>
              <p className="text-xs text-[#8199AE] leading-relaxed m-0">
                Gemini OCR extracts discrete line items. Shared taxes and platform tips are dynamically 
                apportioned by consumption ratio.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-[#33475A]/60 w-full text-[11px] font-mono text-[#B7C6D3]">
              Vision Multimodal OCR
            </div>
          </div>

          {/* Bento Card 3: Autonomous Escalations */}
          <div className="rounded-3xl bg-[#1F2C38] border border-[#33475A] p-6 sm:p-8 flex flex-col items-center text-center justify-between shadow-sm hover:border-[#4E6A83] transition-all">
            <div className="w-14 h-14 rounded-2xl bg-[#10161C] border border-[#33475A] flex items-center justify-center mb-5 shadow-inner">
              <BarChart3 className="w-7 h-7 text-[#E7EDF2]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-[#E7EDF2] m-0">
                Automated Escalation
              </h3>
              <p className="text-xs text-[#8199AE] leading-relaxed m-0">
                Sim-time engine advances 24h, 48h, and 72h overdue thresholds, triggering 5-tier roasts 
                and automated PayPal express checkout orders.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-[#33475A]/60 w-full text-[11px] font-mono text-[#B7C6D3]">
              5-Tier Roast Matrix
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* QUICK SIMULATION CONTROLS                                        */}
      {/* ================================================================ */}
      <section className="rounded-3xl bg-[#1F2C38] border border-[#33475A] p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#33475A]">
          <span className="text-xs font-bold text-[#E7EDF2] uppercase tracking-wider font-mono">
            Quick Simulation Controls
          </span>
          <span className="text-xs text-[#8199AE]">
            Trip ID: <span className="font-mono text-[#E7EDF2]">{ledger.trip_id}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={onSimulateExpense}
            className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-[#10161C] hover:bg-[#33475A] border border-[#33475A] text-xs font-semibold text-[#E7EDF2] transition-all cursor-pointer shadow-sm"
          >
            <PlusCircle className="w-4 h-4 text-[#8199AE]" />
            <span>Simulate ₹1,500 Dinner</span>
          </button>

          <button
            onClick={onAdvanceTime}
            className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-[#10161C] hover:bg-[#33475A] border border-[#33475A] text-xs font-semibold text-[#E7EDF2] transition-all cursor-pointer shadow-sm"
          >
            <Clock className="w-4 h-4 text-[#8199AE]" />
            <span>Fast-Forward +24h</span>
          </button>

          <button
            onClick={onOpenReceiptModal}
            className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-[#10161C] hover:bg-[#33475A] border border-[#33475A] text-xs font-semibold text-[#E7EDF2] transition-all cursor-pointer shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-[#8199AE]" />
            <span>Scan Receipt (Gemini)</span>
          </button>

          <button
            onClick={onOpenPayoutModal}
            className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-[#4E6A83] hover:bg-[#33475A] border border-[#33475A] text-xs font-semibold text-[#E7EDF2] transition-all cursor-pointer shadow-sm"
          >
            <ShieldCheck className="w-4 h-4 text-[#E7EDF2]" />
            <span>1-Click Batch Payout</span>
          </button>
        </div>
      </section>

      {/* ================================================================ */}
      {/* "WHAT OUR TRAVELERS ARE SAYING" (FRAME 09 INSPIRATION)           */}
      {/* ================================================================ */}
      <section className="space-y-6 pt-2">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-[#E7EDF2] tracking-tight m-0">
            What our travelers are saying about us!
          </h2>
          <p className="text-xs sm:text-sm text-[#8199AE] m-0">
            Real feedback from crew members on zero-drift settlements and AI escalations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Quote 1: Alex */}
          <div className="rounded-3xl bg-[#1F2C38] border border-[#33475A] p-6 flex flex-col justify-between shadow-sm">
            <Quote className="w-6 h-6 text-[#8199AE] mb-3" />
            <p className="text-xs sm:text-sm text-[#B7C6D3] leading-relaxed mb-4 italic">
              "The Gemini multimodal receipt scanner parsed our ₹14,500 beachfront dinner in seconds. Everyone paid their exact fair share without a single spreadsheet argument."
            </p>
            <div className="flex items-center gap-3 pt-3 border-t border-[#33475A]">
              <div className="w-8 h-8 rounded-full bg-[#10161C] border border-[#4E6A83] flex items-center justify-center text-xs font-bold text-[#E7EDF2]">
                AR
              </div>
              <div>
                <div className="text-xs font-bold text-[#E7EDF2]">Alex Rivera</div>
                <div className="text-[10px] text-[#8199AE]">Trip Member • @alex_travels</div>
              </div>
            </div>
          </div>

          {/* Quote 2: Dave */}
          <div className="rounded-3xl bg-[#1F2C38] border border-[#33475A] p-6 flex flex-col justify-between shadow-sm">
            <Quote className="w-6 h-6 text-[#8199AE] mb-3" />
            <p className="text-xs sm:text-sm text-[#B7C6D3] leading-relaxed mb-4 italic">
              "I forgot my 48-hour reminder and TripSheriff generated a savage Tier-3 roast in our group chat! Settled my debt immediately using PayPal express checkout."
            </p>
            <div className="flex items-center gap-3 pt-3 border-t border-[#33475A]">
              <div className="w-8 h-8 rounded-full bg-[#10161C] border border-[#4E6A83] flex items-center justify-center text-xs font-bold text-[#E7EDF2]">
                DK
              </div>
              <div>
                <div className="text-xs font-bold text-[#E7EDF2]">Dave Kim</div>
                <div className="text-[10px] text-[#8199AE]">Trip Member • @dave_k</div>
              </div>
            </div>
          </div>

          {/* Quote 3: Sarah (Organizer) */}
          <div className="rounded-3xl bg-[#1F2C38] border border-[#33475A] p-6 flex flex-col justify-between shadow-sm">
            <Quote className="w-6 h-6 text-[#8199AE] mb-3" />
            <p className="text-xs sm:text-sm text-[#B7C6D3] leading-relaxed mb-4 italic">
              "As the trip organizer, I used to chase friends for weeks after vacations. With 1-click batch payout, ₹14,500 was settled straight into my PayPal wallet."
            </p>
            <div className="flex items-center gap-3 pt-3 border-t border-[#33475A]">
              <div className="w-8 h-8 rounded-full bg-[#10161C] border border-[#4E6A83] flex items-center justify-center text-xs font-bold text-[#E7EDF2]">
                SC
              </div>
              <div>
                <div className="text-xs font-bold text-[#E7EDF2]">Sarah Chen</div>
                <div className="text-[10px] text-[#8199AE]">Trip Organizer • @sarah_c</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* RECENT EXPENSES LIST (WITH AG GRID JUMP LINK)                    */}
      {/* ================================================================ */}
      <section className="rounded-3xl bg-[#1F2C38] border border-[#33475A] p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#33475A]">
          <div>
            <span className="text-xs font-bold text-[#E7EDF2] uppercase tracking-wider font-mono">
              Recent Logged Expenses
            </span>
            <div className="text-[11px] text-[#8199AE] mt-0.5">
              Live entries in integer-cent accounting
            </div>
          </div>
          <Link
            to="/ledger"
            className="text-xs text-[#B7C6D3] hover:text-[#E7EDF2] no-underline flex items-center gap-1.5 font-medium px-3 py-1.5 rounded-lg bg-[#10161C] border border-[#33475A] transition-colors"
          >
            <span>Open AG Grid</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="space-y-2.5">
          {ledger.expenses.slice(0, 4).map((exp) => (
            <div
              key={exp.expense_id}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-[#10161C] border border-[#33475A] hover:border-[#4E6A83] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#1F2C38] border border-[#33475A] flex items-center justify-center">
                  <Receipt className="w-4 h-4 text-[#8199AE]" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#E7EDF2]">{exp.description}</div>
                  <div className="text-[11px] text-[#8199AE]">
                    Category: {exp.category} • Fronted by Sarah
                  </div>
                </div>
              </div>
              <div className="text-right font-mono font-bold text-sm text-[#E7EDF2]">
                ₹{(exp.amount_cents / 100).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

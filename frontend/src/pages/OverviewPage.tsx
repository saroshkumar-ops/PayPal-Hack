import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, 
  Receipt, 
  ChevronRight,
  Layers,
  Sparkles,
  HelpCircle,
  CreditCard,
  ShieldCheck,
  Zap,
  Info,
  UserPlus
} from 'lucide-react';
import type { TripLedger } from '../types';
import { VirtualTripCard } from '../components/cards/VirtualTripCard';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { StatusPill } from '../components/ui/StatusPill';
import { getCurrencySymbol } from '../lib/currency';
import { getNotificationLabel } from '../lib/notifications';
import { formatPartyName } from '../lib/formatters';

interface OverviewPageProps {
  ledger: TripLedger;
  onAdvanceTime?: () => void;
  onOpenReceiptModal: () => void;
  onOpenPayoutModal: () => void;
  onOpenAddMemberModal?: () => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  ledger,
  onOpenReceiptModal,
  onOpenPayoutModal,
  onOpenAddMemberModal,
}) => {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<'topology' | 'ocr' | 'escrow'>('topology');

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

  // Simplified settlements directly from backend
  const settlements = ledger.simplified_settlements || [];

  const activeFocusMember = (selectedMemberId 
    ? ledger.members.find(m => m.user_id === selectedMemberId) 
    : organizer) || organizer;

  return (
    <div className="space-y-6 w-full max-w-[1560px] mx-auto py-2">
      {/* ================================================================ */}
      {/* INTERACTIVE VISUAL EXPLANATION & GUIDE (TOGGLE)                  */}
      {/* ================================================================ */}
      <AnimatePresence>
        {showGuide && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="rounded-3xl bg-[#0F1117] border border-[#C6FF3D]/30 p-6 shadow-[0_16px_48px_rgba(0,0,0,0.8)] space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/8 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#C6FF3D]/10 border border-[#C6FF3D]/30 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-[#C6FF3D]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-display font-bold text-[#EDEEF2] m-0">
                      How It Works
                    </h3>
                    <p className="text-xs text-[#8A8FA3] font-body m-0 mt-0.5">
                      Three simple steps to split and settle bills with friends
                    </p>
                  </div>
                </div>

                <div className="flex items-center p-1 rounded-xl bg-[#07080D] border border-white/8 text-xs font-mono">
                  <button
                    onClick={() => setActiveGuideTab('topology')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      activeGuideTab === 'topology'
                        ? 'bg-[#171A23] text-[#C6FF3D] font-bold border border-white/10'
                        : 'text-[#8A8FA3] hover:text-[#EDEEF2]'
                    }`}
                  >
                    1. Smart Split
                  </button>
                  <button
                    onClick={() => setActiveGuideTab('ocr')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      activeGuideTab === 'ocr'
                        ? 'bg-[#171A23] text-[#C6FF3D] font-bold border border-white/10'
                        : 'text-[#8A8FA3] hover:text-[#EDEEF2]'
                    }`}
                  >
                    2. Scan Bills
                  </button>
                  <button
                    onClick={() => setActiveGuideTab('escrow')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      activeGuideTab === 'escrow'
                        ? 'bg-[#171A23] text-[#C6FF3D] font-bold border border-white/10'
                        : 'text-[#8A8FA3] hover:text-[#EDEEF2]'
                    }`}
                  >
                    3. Instant Payout
                  </button>
                </div>
              </div>

              {/* Guide Content Panels */}
              {activeGuideTab === 'topology' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                  <div className="p-4 rounded-2xl bg-[#07080D] border border-white/6 space-y-2">
                    <div className="text-[#C6FF3D] font-bold flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      <span>Fewer Payments</span>
                    </div>
                    <p className="text-[#8A8FA3] font-body m-0 leading-relaxed">
                      Calculates the minimum number of payments so friends don't pass money back and forth.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#07080D] border border-white/6 space-y-2">
                    <div className="text-[#EDEEF2] font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#C6FF3D]" />
                      <span>Live Balances</span>
                    </div>
                    <p className="text-[#8A8FA3] font-body m-0 leading-relaxed">
                      Click any member below to see their balance. Green means they are owed money; red means they owe.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#07080D] border border-white/6 space-y-2">
                    <div className="text-[#FFC439] font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Exact Math</span>
                    </div>
                    <p className="text-[#8A8FA3] font-body m-0 leading-relaxed">
                      All amounts are calculated down to the exact cent with zero rounding error.
                    </p>
                  </div>
                </div>
              )}

              {activeGuideTab === 'ocr' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                  <div className="p-4 rounded-2xl bg-[#07080D] border border-white/6 space-y-2">
                    <div className="text-[#C6FF3D] font-bold flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Upload Bill</span>
                    </div>
                    <p className="text-[#8A8FA3] font-body m-0 leading-relaxed">
                      Drop any restaurant bill or receipt photo to read items automatically.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#07080D] border border-white/6 space-y-2">
                    <div className="text-[#EDEEF2] font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#C6FF3D]" />
                      <span>Item Breakdown</span>
                    </div>
                    <p className="text-[#8A8FA3] font-body m-0 leading-relaxed">
                      Extracts each dish, price, tax, and tip into separate line items automatically.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#07080D] border border-white/6 space-y-2">
                    <div className="text-[#FFC439] font-bold flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      <span>Assign to Friends</span>
                    </div>
                    <p className="text-[#8A8FA3] font-body m-0 leading-relaxed">
                      Tap friend names to assign who ate what. The app calculates their exact share.
                    </p>
                  </div>
                </div>
              )}

              {activeGuideTab === 'escrow' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                  <div className="p-4 rounded-2xl bg-[#07080D] border border-white/6 space-y-2">
                    <div className="text-[#FFC439] font-bold flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>1-Click Payment</span>
                    </div>
                    <p className="text-[#8A8FA3] font-body m-0 leading-relaxed">
                      Each person pays their exact share directly with PayPal in 1 click.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#07080D] border border-white/6 space-y-2">
                    <div className="text-[#C6FF3D] font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Safe & Protected</span>
                    </div>
                    <p className="text-[#8A8FA3] font-body m-0 leading-relaxed">
                      Payments pool safely until the organizer is ready to withdraw.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#07080D] border border-white/6 space-y-2">
                    <div className="text-[#EDEEF2] font-bold flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-[#C6FF3D]" />
                      <span>Instant Payout</span>
                    </div>
                    <p className="text-[#8A8FA3] font-body m-0 leading-relaxed">
                      The organizer clicks Payout to receive all collected funds in one go.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================================================================ */}
      {/* 3. PRIMARY COCKPIT (GRAPH / EXECUTION RAIL)                      */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Cockpit: The Cyber Treasury Graph & Cash-Flow Visualizer */}
        <section className="lg:col-span-8 rounded-3xl bg-[#0F1117] border border-white/8 p-6 sm:p-8 flex flex-col justify-between shadow-[0_16px_48px_rgba(0,0,0,0.8)] relative overflow-hidden">
          <div className="relative z-10 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#171A23] border border-white/10 text-[11px] font-mono text-[#C6FF3D] mb-3">
                  <span>{formatPartyName(ledger.trip_name || ledger.name, ledger.trip_id)}</span>
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-[#EDEEF2] tracking-tight leading-[1.08] m-0">
                  Trip Expenses
                </h1>
                <p className="text-xs sm:text-sm text-[#8A8FA3] mt-2 max-w-xl font-body leading-relaxed m-0">
                  Track expenses, see who owes what, and settle up.
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
                  Upload Bill
                </Button>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setShowGuide(!showGuide)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#171A23] hover:bg-white/8 border border-white/10 text-xs font-mono text-[#8A8FA3] hover:text-[#C6FF3D] transition-colors cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-[#C6FF3D]" />
                    <span>{showGuide ? 'Hide Guide' : 'How It Works'}</span>
                  </button>
                  <Link to="/simulator" className="no-underline">
                    <Button
                      variant="secondary"
                      size="md"
                      icon={<ArrowRight className="w-4 h-4" />}
                    >
                      Simulator
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Zero Expenses Onboarding Callout if brand new party */}
            {ledger.expenses.length === 0 && (
              <div className="p-4 rounded-2xl bg-[#171A23]/60 border border-[#C6FF3D]/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#C6FF3D]/15 flex items-center justify-center shrink-0">
                    <Info className="w-4 h-4 text-[#C6FF3D]" />
                  </div>
                  <div>
                    <div className="font-semibold text-[#EDEEF2] font-body">No expenses yet</div>
                    <div className="text-[11px] text-[#8A8FA3] font-body mt-0.5">
                      Upload a bill or add an expense in the Simulator to get started.
                    </div>
                  </div>
                </div>
                <button
                  onClick={onOpenReceiptModal}
                  className="px-3 py-1.5 rounded-xl bg-[#C6FF3D] hover:bg-[#b8f52f] text-[#07080D] font-mono font-bold text-xs transition-colors shrink-0 cursor-pointer"
                >
                  Upload Bill
                </button>
              </div>
            )}

            {/* Interactive Bipartite Cash-Flow Node Canvas */}
            <div className="rounded-2xl bg-[#07080D] border border-white/8 p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/6 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold text-[#EDEEF2]">
                    WHO OWES WHO
                  </span>
                  <span className="text-[10px] font-mono text-[#8A8FA3] bg-[#171A23] px-2 py-0.5 rounded">
                    {ledger.members.length} {ledger.members.length === 1 ? 'Member' : 'Members'}
                  </span>
                </div>
                {onOpenAddMemberModal && (
                  <button
                    onClick={onOpenAddMemberModal}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#171A23] hover:bg-[#C6FF3D]/10 border border-white/10 hover:border-[#C6FF3D]/30 text-xs font-mono text-[#C6FF3D] transition-colors cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Add Member</span>
                  </button>
                )}
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
                          ? 'bg-[#171A23] border-[#C6FF3D]'
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
                          {isCreditor ? `+${cur}${(netCents / 100).toFixed(2)}` : isDebtor ? `-${cur}${(Math.abs(netCents) / 100).toFixed(2)}` : `${cur}0.00`}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                {/* Add Member Card */}
                {onOpenAddMemberModal && (
                  <button
                    onClick={onOpenAddMemberModal}
                    className="p-3.5 rounded-xl border border-dashed border-white/12 hover:border-[#C6FF3D]/40 bg-[#0F1117]/50 hover:bg-[#171A23] transition-all cursor-pointer flex flex-col items-center justify-center gap-2 h-28 text-center group"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#171A23] group-hover:bg-[#C6FF3D]/10 border border-white/10 group-hover:border-[#C6FF3D]/30 flex items-center justify-center transition-colors">
                      <UserPlus className="w-4 h-4 text-[#8A8FA3] group-hover:text-[#C6FF3D]" />
                    </div>
                    <span className="text-xs font-mono text-[#8A8FA3] group-hover:text-[#EDEEF2] transition-colors">
                      + Add Member
                    </span>
                  </button>
                )}
              </div>

              {/* Settlement Vector Preview */}
              <div className="p-3.5 rounded-xl bg-[#0F1117] border border-white/6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2 text-[#8A8FA3]">
                  <Layers className="w-4 h-4 text-[#C6FF3D]" />
                  <span>SUGGESTED PAYMENTS:</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {settlements.length === 0 ? (
                    <span className="text-[#8A8FA3] text-xs">All debts settled. Zero pending payments.</span>
                  ) : (
                    settlements.map((s, idx) => {
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
                          <span className="text-[#8A8FA3] ml-1">{cur}{(s.amount_cents / 100).toFixed(2)}</span>
                        </span>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Telemetry Ticker (Volume, Settled, Outstanding) */}
          <div className="relative z-10 pt-6 mt-6 border-t border-white/8 grid grid-cols-3 gap-3 sm:gap-4 font-mono">
            <div className="p-3 rounded-xl bg-[#07080D] border border-white/6">
              <div className="text-[10px] text-[#8A8FA3] uppercase tracking-wider">TOTAL SPENT</div>
              <div className="text-lg sm:text-2xl font-bold text-[#EDEEF2] tabular-nums mt-0.5">
                {cur}{(totalSpendCents / 100).toFixed(2)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#07080D] border border-white/6">
              <div className="text-[10px] text-[#8A8FA3] uppercase tracking-wider">SETTLED</div>
              <div className="text-lg sm:text-2xl font-bold text-[#C6FF3D] tabular-nums mt-0.5">
                {settledPercentage}%
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#07080D] border border-white/6">
              <div className="text-[10px] text-[#8A8FA3] uppercase tracking-wider">PENDING</div>
              <div className="text-lg sm:text-2xl font-bold text-[#FF5C7A] tabular-nums mt-0.5">
                {cur}{(pendingCents / 100).toFixed(2)}
              </div>
            </div>
          </div>
        </section>

        {/* Right Cockpit: 3D Liquidity Card & Member Standings */}
        <section className="lg:col-span-4 flex flex-col justify-between gap-6">
          {/* Virtual Card */}
          <div className="rounded-3xl bg-[#0F1117] border border-white/8 p-5 sm:p-6 shadow-[0_16px_48px_rgba(0,0,0,0.8)]">
            <VirtualTripCard
              balanceCents={organizerOwedCents}
              tripName={formatPartyName(ledger.trip_name || ledger.name, ledger.trip_id)}
              organizerName={organizer.name}
              organizerEmail={organizer.paypal_email}
              currency={ledger.currency}
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
                <span>Balance:</span>
                <span className="font-bold text-[#EDEEF2] tabular-nums">
                  {cur}{((ledger.net_balances_cents[activeFocusMember.user_id] || 0) / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[#8A8FA3]">
                <span>Notifications:</span>
                <span className="text-[#C6FF3D] font-bold">{getNotificationLabel(activeFocusMember.roast_consent)}</span>
              </div>
              <div className="flex justify-between text-[#8A8FA3]">
                <span>PayPal:</span>
                <span className="text-[#EDEEF2] truncate max-w-[170px]">
                  {activeFocusMember.paypal_email || 'Not configured'}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <Link to="/simulator" className="no-underline block">
                <Button variant="secondary" size="sm" className="w-full justify-between">
                  <span>Open Simulator</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ReceiptText, 
  ArrowRight, 
  UserPlus, 
  Check, 
  ChevronRight,
  HelpCircle,
  X
} from 'lucide-react';
import type { TripLedger } from '../types';
import { VirtualTripCard } from '../components/cards/VirtualTripCard';
import { PaperReceipt } from '../components/bits/PaperReceipt';
import { Avatar, getMemberTagColor } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { StatusPill } from '../components/ui/StatusPill';
import { getCurrencySymbol } from '../lib/currency';
import { getNotificationLabel } from '../lib/notifications';
import { formatPartyName } from '../lib/formatters';

interface OverviewPageProps {
  ledger: TripLedger;
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
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [lastExpenseId, setLastExpenseId] = useState<string | null>(null);
  const [isSeparating, setIsSeparating] = useState(false);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Compute live financial totals from real ledger data (no placeholders)
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
    name: 'Trip Organizer',
    handle: '@organizer',
    role: 'organizer' as const,
    paypal_email: '',
    roast_consent: 'MILD' as const,
  };
  const organizerOwedCents = Math.max(0, ledger.net_balances_cents[organizer.user_id] || 0);

  // Direct settlement vector list from backend
  const settlements = ledger.simplified_settlements || [];

  const activeFocusMember = (selectedMemberId 
    ? ledger.members.find(m => m.user_id === selectedMemberId) 
    : organizer) || organizer;

  // Derive most recent expense for the signature physical receipt
  const latestExpense = ledger.expenses.length > 0 
    ? [...ledger.expenses].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
    : null;

  // Split result moment: animate each person's share separating from receipt and landing on avatar
  useEffect(() => {
    if (latestExpense?.expense_id) {
      if (lastExpenseId && lastExpenseId !== latestExpense.expense_id) {
        setIsSeparating(true);
        const timer = setTimeout(() => setIsSeparating(false), 2400);
        return () => clearTimeout(timer);
      }
      setLastExpenseId(latestExpense.expense_id);
    }
  }, [latestExpense?.expense_id, lastExpenseId]);

  const memberSplits = latestExpense 
    ? latestExpense.splits.map((s) => {
        const m = ledger.members.find((mem) => mem.user_id === s.user_id);
        return {
          user_id: s.user_id,
          name: m ? m.name : s.user_id,
          owes_cents: s.owes_cents,
        };
      })
    : [];

  const receiptItems = latestExpense 
    ? latestExpense.splits.map((s) => {
        const m = ledger.members.find(mem => mem.user_id === s.user_id);
        return {
          name: m ? `${m.name.split(' ')[0]}'s Share` : 'Member Share',
          priceCents: s.owes_cents,
          claimedByUserIds: [s.user_id],
        };
      })
    : [];

  return (
    <div className="space-y-6 w-full max-w-[1560px] mx-auto py-2">
      {/* ================================================================ */}
      {/* 1. ASYMMETRIC HEADER: DISTINCTIVE TRIP IDENTITY & ONE LIME CTA   */}
      {/* ================================================================ */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            {/* Active Trip Marker (Off-white pill, strictly no lime dot) */}
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[var(--surface-elevated)] border border-[var(--border)] text-xs font-mono text-[var(--text)]">
              <span className="w-1.5 h-1.5 bg-white/70 rounded-full" />
              <span className="font-semibold">{formatPartyName(ledger.trip_name || ledger.name, ledger.trip_id)}</span>
              <span className="text-[var(--muted)]">·</span>
              <span className="text-[var(--muted)]">{ledger.members.length} {ledger.members.length === 1 ? 'traveler' : 'travelers'}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-[var(--text)] tracking-tight leading-none m-0">
              Trip Ledger
            </h1>

            <p className="text-xs sm:text-sm text-[var(--muted)] font-body leading-relaxed m-0">
              Group spending, net traveler balances, and direct PayPal settlements.
            </p>
          </div>

          {/* Action Row: Exactly ONE Lime-filled primary button on screen */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setShowHowItWorks(!showHowItWorks)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--surface-elevated)] hover:bg-white/10 border border-[var(--border)] text-xs font-mono text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{showHowItWorks ? 'Close Info' : 'How Settlements Work'}</span>
            </button>

            <Link to="/simulator" className="no-underline">
              <Button variant="secondary" size="md">
                <span>Simulator</span>
              </Button>
            </Link>

            {/* The single primary lime button on this screen */}
            <Button
              variant="primary"
              size="md"
              onClick={onOpenReceiptModal}
              icon={<ReceiptText className="w-4 h-4" />}
            >
              Upload Bill
            </Button>
          </div>
        </div>

        {/* Informational drawer on settlements (clean prose, no 3-icon features) */}
        {showHowItWorks && (
          <div className="mt-6 pt-5 border-t border-[var(--border)] space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-[var(--muted)]">
              <span className="font-semibold text-[var(--text)] uppercase tracking-wider">Settlement Architecture</span>
              <button 
                onClick={() => setShowHowItWorks(false)}
                className="text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs font-body text-[var(--muted)] leading-relaxed max-w-3xl m-0">
              TripSheriff collects uploaded receipts, itemizes lines among selected friends, and solves a bipartite debt graph to minimize the total number of transactions needed. Travelers settle directly through PayPal, and collected shares pool in the organizer treasury for one-click payout.
            </p>
          </div>
        )}
      </section>

      {/* ================================================================ */}
      {/* 2. MAIN WORKSPACE: ROSTER + DIRECTIVES (LEFT) & RECEIPT (RIGHT)  */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (7 COLS): DIRECTIVES, ROSTER & METRICS */}
        <section className="lg:col-span-7 space-y-6">
          {/* Direct Settlement Directives */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--text)]">
                  Settlement Directives
                </span>
                <span className="text-[10px] font-mono text-[var(--muted)] bg-[var(--surface-elevated)] px-2 py-0.5 rounded">
                  {settlements.length} {settlements.length === 1 ? 'payment needed' : 'payments needed'}
                </span>
              </div>
            </div>

            {settlements.length === 0 ? (
              <div className="p-4 rounded-xl bg-[var(--canvas)] border border-[var(--border)] flex items-center gap-2.5 text-xs font-mono text-[var(--muted)]">
                <Check className="w-4 h-4 text-[var(--settled)]" />
                <span>All balances settled. Zero pending transfers.</span>
              </div>
            ) : (
              <div className="space-y-2 font-mono text-xs">
                {settlements.map((s, idx) => {
                  const fromMember = ledger.members.find(m => m.user_id === s.from_user_id);
                  const toMember = ledger.members.find(m => m.user_id === s.to_user_id);
                  const fromName = fromMember ? fromMember.name : s.from_user_id;
                  const toName = toMember ? toMember.name : s.to_user_id;

                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-[var(--canvas)] border border-[var(--border)] flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[var(--owes)]">{fromName}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-[var(--muted)]" />
                        <span className="font-semibold text-[var(--text)]">{toName}</span>
                      </div>
                      <div className="font-bold tabular-nums text-sm text-[var(--text)]">
                        {cur}{(s.amount_cents / 100).toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Traveler Roster */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--text)]">
                  Traveler Balances
                </span>
                <span className="text-[10px] font-mono text-[var(--muted)]">
                  Tap to inspect
                </span>
              </div>

              {onOpenAddMemberModal && (
                <button
                  type="button"
                  onClick={onOpenAddMemberModal}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--surface-elevated)] hover:bg-white/10 border border-[var(--border)] text-xs font-mono text-[var(--text)] transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3 h-3 text-[var(--muted)]" />
                  <span>Add Friend</span>
                </button>
              )}
            </div>

            {/* Asymmetric Member List */}
            <div className="divide-y divide-[var(--border)]">
              {ledger.members.map((member) => {
                const netCents = ledger.net_balances_cents[member.user_id] || 0;
                const isCreditor = netCents > 0;
                const isDebtor = netCents < 0;
                const isSelected = selectedMemberId === member.user_id;

                return (
                  <div
                    key={member.user_id}
                    onClick={() => setSelectedMemberId(member.user_id)}
                    className={`py-3 px-2 flex items-center justify-between gap-3 cursor-pointer rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-[var(--surface-elevated)] ring-1 ring-[var(--border)]'
                        : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <motion.div
                        animate={
                          isSeparating && !prefersReducedMotion && ((latestExpense?.splits.find((s) => s.user_id === member.user_id)?.owes_cents || 0) > 0)
                            ? { scale: [1, 1.15, 1] }
                            : {}
                        }
                        transition={{ duration: 0.45, ease: 'easeOut' }}
                      >
                        <Avatar
                          userId={member.user_id}
                          name={member.name}
                          size="md"
                          showStatus
                          status={isCreditor ? 'paid' : isDebtor ? 'owes' : 'pending'}
                        />
                      </motion.div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-body font-semibold text-[var(--text)] truncate">
                            {member.name}
                          </span>
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded border border-[var(--border)] text-[var(--muted)]">
                            {member.role}
                          </span>
                          <AnimatePresence>
                            {isSeparating && ((latestExpense?.splits.find((s) => s.user_id === member.user_id)?.owes_cents || 0) > 0) && (
                              <motion.span
                                initial={{ opacity: 0, x: 6 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0 }}
                                className="text-[9px] font-mono text-[var(--owes)] bg-[var(--owes)]/10 px-1.5 py-0.2 rounded border border-[var(--owes)]/20 font-bold"
                              >
                                Assigned
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </div>
                        <div className="text-[11px] font-mono text-[var(--muted)] truncate">
                          {member.handle}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 font-mono">
                      <div
                        className={`text-xs font-bold tabular-nums ${
                          isCreditor
                            ? 'text-[var(--settled)]'
                            : isDebtor
                            ? 'text-[var(--owes)]'
                            : 'text-[var(--muted)]'
                        }`}
                      >
                        {isCreditor
                          ? `+${cur}${(netCents / 100).toFixed(2)}`
                          : isDebtor
                          ? `-${cur}${(Math.abs(netCents) / 100).toFixed(2)}`
                          : `${cur}0.00`}
                      </div>
                      <div className="text-[10px] text-[var(--muted)]">
                        {isCreditor ? 'is owed' : isDebtor ? 'owes' : 'settled'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Horizontal Financial Tally Strip (No identical 3-card grid) */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 grid grid-cols-3 divide-x divide-[var(--border)] font-mono text-center">
            <div className="px-3 space-y-1">
              <div className="text-[10px] uppercase text-[var(--muted)] tracking-wider">Total Bills</div>
              <div className="text-xl sm:text-2xl font-display font-extrabold text-[var(--text)] tabular-nums">
                {cur}{(totalSpendCents / 100).toFixed(2)}
              </div>
              <div className="text-[10px] text-[var(--muted)]">{ledger.expenses.length} logged</div>
            </div>

            <div className="px-3 space-y-1">
              <div className="text-[10px] uppercase text-[var(--muted)] tracking-wider">Settled</div>
              <div className="text-xl sm:text-2xl font-display font-extrabold text-[var(--settled)] tabular-nums">
                {settledPercentage}%
              </div>
              <div className="text-[10px] text-[var(--muted)]">{cur}{(settledCents / 100).toFixed(2)} paid</div>
            </div>

            <div className="px-3 space-y-1">
              <div className="text-[10px] uppercase text-[var(--muted)] tracking-wider">Outstanding</div>
              <div className="text-xl sm:text-2xl font-display font-extrabold text-[var(--owes)] tabular-nums">
                {cur}{(pendingCents / 100).toFixed(2)}
              </div>
              <div className="text-[10px] text-[var(--muted)]">pending shares</div>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN (5 COLS): SIGNATURE PHYSICAL RECEIPT & PAYOUT */}
        <section className="lg:col-span-5 space-y-6">
          {/* THE SIGNATURE PHYSICAL PAPER RECEIPT */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-white/60 rounded-full" />
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--text)]">
                  Latest Scanned Bill
                </span>
              </div>
              <span className="text-[11px] font-mono text-[var(--muted)]">
                {latestExpense ? 'Physical Receipt' : 'No Bills Yet'}
              </span>
            </div>

            {/* Paper on Dark Stage */}
            <div className="p-4 sm:p-6 rounded-xl bg-[var(--canvas)] border border-[var(--border)] flex items-center justify-center min-h-[360px]">
              {latestExpense ? (
                <PaperReceipt
                  merchantName={latestExpense.description || 'Scanned Expense'}
                  receiptNumber={`#${latestExpense.expense_id.slice(-6).toUpperCase()}`}
                  date={new Date(latestExpense.timestamp).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                  currency={ledger.currency}
                  items={receiptItems}
                  totalCents={latestExpense.amount_cents}
                  members={ledger.members}
                  memberSplits={memberSplits}
                  splitType={latestExpense.split_type === 'EQUAL' ? 'EQUAL' : 'CUSTOM'}
                  rotateDeg={-0.8}
                  interactive={false}
                  animatingSplit={isSeparating}
                />
              ) : (
                <div 
                  onClick={onOpenReceiptModal}
                  className="w-full max-w-[320px] p-6 rounded-xl bg-[var(--receipt-paper)] text-[var(--receipt-ink)] font-mono text-center space-y-3 cursor-pointer shadow-[0_16px_32px_rgba(0,0,0,0.6)] rotate-[-0.75deg] hover:rotate-0 transition-transform"
                >
                  <div className="text-[10px] uppercase tracking-widest opacity-60">
                    --- {ledger.trip_name || ledger.name ? `${formatPartyName(ledger.trip_name || ledger.name).toUpperCase()} [SAMPLE PREVIEW]` : 'TRIP RECEIPT [SAMPLE PREVIEW]'} ---
                  </div>
                  <div className="font-display font-black text-sm uppercase text-[var(--receipt-ink)]">
                    No Bills Recorded
                  </div>
                  <p className="text-[11px] opacity-75 leading-relaxed m-0">
                    Tap here to upload a restaurant receipt, hotel bill, or cab receipt.
                  </p>
                  <div className="pt-2 border-t border-dashed border-[var(--receipt-ink)]/30 text-[10px] uppercase font-bold tracking-wider">
                    [ + Scan Paper Bill ]
                  </div>
                </div>
              )}
            </div>

            {/* If there is a recorded expense, display the traveler split roster explicitly */}
            {latestExpense && (
              <div className="p-4 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-white/60 rounded-full" />
                    <span className="text-[var(--text)] font-semibold uppercase tracking-wider">
                      {latestExpense.split_type === 'EQUAL' ? 'Equal Bill Allocation' : 'Custom Bill Allocation'}
                    </span>
                  </div>
                  <span className="text-xs font-bold tabular-nums text-[var(--text)] font-mono">
                    {cur}{(latestExpense.amount_cents / 100).toFixed(2)} Total
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {latestExpense.splits.map((s) => {
                    const m = ledger.members.find((mem) => mem.user_id === s.user_id);
                    const tag = getMemberTagColor(s.user_id);
                    const name = m?.name || s.user_id;

                    return (
                      <div
                        key={s.user_id}
                        className="px-2.5 py-1.5 rounded-lg bg-[var(--canvas)] border border-[var(--border)] flex items-center justify-between text-xs font-mono"
                      >
                        <div className="flex items-center gap-1.5 truncate min-w-0">
                          <span
                            style={{
                              backgroundColor: tag.bg,
                              color: tag.text,
                              borderColor: tag.border,
                            }}
                            className="w-4 h-4 rounded text-[9px] font-bold border flex items-center justify-center shrink-0"
                          >
                            {name.slice(0, 2).toUpperCase()}
                          </span>
                          <span className="truncate text-[var(--text)]">{name}</span>
                        </div>
                        <span className="font-bold tabular-nums text-[var(--text)] shrink-0 ml-2">
                          {cur}{(s.owes_cents / 100).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Organizer Payout Treasury Card */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
            <VirtualTripCard
              balanceCents={organizerOwedCents}
              tripName={formatPartyName(ledger.trip_name || ledger.name, ledger.trip_id)}
              organizerName={organizer.name}
              organizerEmail={organizer.paypal_email}
              currency={ledger.currency}
              onPayout={onOpenPayoutModal}
            />
          </div>

          {/* Focused Traveler Profile Card */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
              <div className="flex items-center gap-2">
                <Avatar userId={activeFocusMember.user_id} name={activeFocusMember.name} size="sm" />
                <div>
                  <div className="font-body font-semibold text-[var(--text)]">{activeFocusMember.name}</div>
                  <div className="text-[10px] text-[var(--muted)]">{activeFocusMember.handle}</div>
                </div>
              </div>
              <StatusPill
                status={(ledger.net_balances_cents[activeFocusMember.user_id] || 0) > 0 ? 'paid' : (ledger.net_balances_cents[activeFocusMember.user_id] || 0) < 0 ? 'owes' : 'pending'}
                label={(ledger.net_balances_cents[activeFocusMember.user_id] || 0) > 0 ? 'Creditor' : (ledger.net_balances_cents[activeFocusMember.user_id] || 0) < 0 ? 'Debtor' : 'Settled'}
              />
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between text-[var(--muted)]">
                <span>Net Balance:</span>
                <span className="font-bold text-[var(--text)] tabular-nums">
                  {cur}{((ledger.net_balances_cents[activeFocusMember.user_id] || 0) / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[var(--muted)]">
                <span>PayPal Account:</span>
                <span className="text-[var(--text)] truncate max-w-[180px]">
                  {activeFocusMember.paypal_email || 'Not configured'}
                </span>
              </div>
              <div className="flex justify-between text-[var(--muted)]">
                <span>Alerts:</span>
                <span className="text-[var(--text)]">{getNotificationLabel(activeFocusMember.roast_consent)}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--border)]">
              <Link to="/simulator" className="no-underline block">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--surface-elevated)] hover:bg-white/10 border border-[var(--border)] text-xs text-[var(--text)] transition-colors cursor-pointer"
                >
                  <span>Open Simulator to Chat</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[var(--muted)]" />
                </button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

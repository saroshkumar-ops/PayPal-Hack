import React, { useState } from 'react';
import { 
  Radio, 
  Wallet, 
  HelpCircle, 
  Copy, 
  Check, 
  ArrowUpRight,
  X,
  CreditCard
} from 'lucide-react';
import type { TripLedger, PayPalEventLog } from '../types';
import { Button } from '../components/ui/Button';
import { StatusPill } from '../components/ui/StatusPill';
import { getCurrencySymbol } from '../lib/currency';
import { formatPartyName, formatReferenceId } from '../lib/formatters';

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
  const [showGuide, setShowGuide] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
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

  let settledCents = 0;
  ledger.expenses.forEach((exp) => {
    exp.splits.forEach((split) => {
      if (split.paid_status === 'SETTLED') {
        settledCents += split.owes_cents;
      }
    });
  });

  const handleCopyEmail = () => {
    if (!organizer.paypal_email) return;
    navigator.clipboard.writeText(organizer.paypal_email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
    <div className="space-y-6 w-full max-w-[1560px] mx-auto py-2">
      {/* ================================================================ */}
      {/* 1. EDITORIAL HEADER & ACTION                                     */}
      {/* ================================================================ */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            {/* Header Eyebrow (No pulsing gold dot or fake escrow claim) */}
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[var(--surface-elevated)] border border-[var(--border)] text-xs font-mono text-[var(--text)]">
              <span className="w-1.5 h-1.5 bg-white/70 rounded-full" />
              <span className="font-semibold text-[var(--text)]">{formatPartyName(ledger.trip_name || ledger.name, ledger.trip_id)}</span>
              <span className="text-[var(--muted)]">·</span>
              <span className="font-semibold uppercase tracking-wider">PayPal Settlement</span>
              <span className="text-[var(--muted)]">·</span>
              <span className="text-[var(--muted)]">{paypalLogs.length} logged events</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-[var(--text)] tracking-tight leading-none m-0">
              Payouts & Activity
            </h1>

            <p className="text-xs sm:text-sm text-[var(--muted)] font-body leading-relaxed m-0">
              Collected member shares pooled for trip organizer withdrawal via PayPal.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--surface-elevated)] hover:bg-white/10 border border-[var(--border)] text-xs font-mono text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{showGuide ? 'Close Info' : 'How Payouts Work'}</span>
            </button>

            {/* Dedicated PayPal Gold Button */}
            <Button
              variant="paypal"
              size="md"
              onClick={onOpenPayoutModal}
              disabled={organizerOwedCents <= 0}
              icon={<ArrowUpRight className="w-4 h-4" />}
            >
              Send Payout
            </Button>
          </div>
        </div>

        {/* Informational Guide (Clean dry prose, no 4-card generic steps) */}
        {showGuide && (
          <div className="mt-6 pt-5 border-t border-[var(--border)] space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-[var(--muted)]">
              <span className="font-semibold text-[var(--text)] uppercase tracking-wider">
                Payout Workflow
              </span>
              <button 
                onClick={() => setShowGuide(false)}
                className="text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-[var(--canvas)] border border-[var(--border)] space-y-1">
                <span className="text-[10px] uppercase text-[var(--muted)]">1. Member Payment</span>
                <p className="font-body text-[var(--text)] m-0 leading-relaxed">
                  Travelers click their individualized PayPal order link to capture their owed share.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[var(--canvas)] border border-[var(--border)] space-y-1">
                <span className="text-[10px] uppercase text-[var(--muted)]">2. Ledger Settlement</span>
                <p className="font-body text-[var(--text)] m-0 leading-relaxed">
                  Payment confirmation marks the split settled and credits the organizer balance.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[var(--canvas)] border border-[var(--border)] space-y-1">
                <span className="text-[10px] uppercase text-[var(--muted)]">3. Instant Payout</span>
                <p className="font-body text-[var(--text)] m-0 leading-relaxed">
                  The organizer clicks Send Payout to dispatch batch payouts directly to their PayPal account.
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ================================================================ */}
      {/* 2. ASYMMETRIC WORKSPACE: BENEFICIARY & LIVE ACTIVITY             */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Beneficiary Details & PayPal Reveal (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-[var(--muted)]" />
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--text)]">
                Organizer Beneficiary
              </span>
            </div>
            <StatusPill 
              status={organizerOwedCents > 0 ? 'paid' : 'pending'} 
              label={organizerOwedCents > 0 ? 'Ready for Payout' : 'All Settled'} 
            />
          </div>

          {/* Balance Callout */}
          <div className="p-5 rounded-xl bg-[var(--canvas)] border border-[var(--border)] text-center space-y-1">
            <div className="text-[10px] uppercase font-mono tracking-wider text-[var(--muted)]">
              AVAILABLE TO PAYOUT
            </div>
            <div className="text-3xl sm:text-4xl font-display font-extrabold text-[var(--text)] tabular-nums font-mono">
              {cur}{(organizerOwedCents / 100).toFixed(2)}
            </div>
            <div className="text-[11px] text-[var(--muted)] font-mono">
              Total Settled: {cur}{(settledCents / 100).toFixed(2)}
            </div>
          </div>

          {/* Beneficiary Details with PayPal Reveal Micro-Interaction */}
          <div className="p-4 rounded-xl bg-[var(--canvas)] border border-[var(--border)] space-y-2.5 text-xs font-mono">
            <div className="flex justify-between items-center text-[var(--muted)]">
              <span>Organizer:</span>
              <span className="text-[var(--text)] font-body font-semibold">
                {organizer.name} ({organizer.handle})
              </span>
            </div>

            {/* The PayPal Reveal */}
            <div className="flex justify-between items-center text-[var(--muted)] pt-2 border-t border-[var(--border)]">
              <span>PayPal Account:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[var(--text)] font-semibold truncate max-w-[190px]">
                  {organizer.paypal_email || 'Not configured'}
                </span>
                {organizer.paypal_email && (
                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    title="Copy PayPal Email"
                    className="p-1 rounded bg-[var(--surface-elevated)] hover:bg-white/10 text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
                  >
                    {copiedEmail ? (
                      <Check className="w-3.5 h-3.5 text-[var(--settled)]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center text-[var(--muted)] pt-1 border-t border-[var(--border)]">
              <span>Payout Method:</span>
              <span className="text-[var(--text)]">Direct PayPal Balance</span>
            </div>
          </div>

          {/* Transfer Action Block */}
          <div className="pt-2">
            <Button
              variant="paypal"
              size="md"
              onClick={onOpenPayoutModal}
              disabled={organizerOwedCents <= 0}
              icon={<ArrowUpRight className="w-4 h-4" />}
              className="w-full font-body font-bold"
            >
              Send {cur}{(organizerOwedCents / 100).toFixed(2)} via PayPal
            </Button>
          </div>
        </div>

        {/* Right Column: Real-Time Activity Log (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-[var(--muted)]" />
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--text)]">
                Transaction Activity
              </span>
            </div>
            <span className="text-[10px] font-mono text-[var(--muted)] bg-[var(--surface-elevated)] px-2.5 py-0.5 rounded">
              {paypalLogs.length} Events
            </span>
          </div>

          {/* Activity Event Stream */}
          <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
            {paypalLogs.length === 0 ? (
              <div className="p-8 rounded-xl bg-[var(--canvas)] border border-[var(--border)] text-center space-y-2">
                <CreditCard className="w-6 h-6 text-[var(--muted)]/50 mx-auto" />
                <div className="text-xs font-mono text-[var(--text)] font-semibold">
                  No Transactions Recorded
                </div>
                <p className="text-xs text-[var(--muted)] font-body max-w-sm mx-auto m-0">
                  Completed member split payments and organizer payouts will appear here in real time.
                </p>
              </div>
            ) : (
              paypalLogs.map((log) => {
                const isPayout = log.event_type.includes('PAYOUT');
                const isSelected = selectedLogId === log.id;

                return (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLogId(isSelected ? null : log.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer font-mono text-xs ${
                      isSelected
                        ? 'bg-[var(--surface-elevated)] border-white/30'
                        : 'bg-[var(--canvas)] border-[var(--border)] hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isPayout
                            ? 'bg-[var(--paypal)]/15 text-[var(--paypal)] border border-[var(--paypal)]/30'
                            : 'bg-white/10 text-[var(--text)] border border-white/15'
                        }`}
                      >
                        {log.event_type}
                      </span>
                      <span className="text-[11px] text-[var(--muted)]">
                        {log.timestamp}
                      </span>
                    </div>

                    <div className="text-xs font-body text-[var(--text)] leading-relaxed mb-2">
                      {log.summary}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[var(--muted)] pt-2 border-t border-[var(--border)]">
                      <span className="truncate max-w-[220px]">
                        Ref: {formatReferenceId(log.reference_id || log.id)}
                      </span>
                      <span className="font-bold text-[var(--text)] tabular-nums">
                        {log.amount}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

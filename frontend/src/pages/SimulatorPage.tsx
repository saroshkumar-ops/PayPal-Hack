import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Send, 
  CreditCard, 
  Paperclip, 
  Sparkles, 
  Copy, 
  Check, 
  Receipt, 
  Layers,
  Bell,
  Clock
} from 'lucide-react';
import type { ChatMessage, TripLedger, EscalationTier } from '../types';
import { Button } from '../components/ui/Button';
import { getCurrencySymbol } from '../lib/currency';
import { getNotificationLabel } from '../lib/notifications';
import { getMemberTagColor } from '../components/ui/Avatar';
import { formatPartyName } from '../lib/formatters';

interface SimulatorPageProps {
  ledger: TripLedger;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onAdvanceTime: (hours: number) => void;
  onPayDebt: (userId: string, amountCents: number, expenseId?: string) => void;
  onOpenReceiptModal: () => void;
  isLoading: boolean;
}

export const SimulatorPage: React.FC<SimulatorPageProps> = ({
  ledger,
  messages,
  onSendMessage,
  onAdvanceTime,
  onPayDebt,
  onOpenReceiptModal,
  isLoading,
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize interactive items directly from real ledger expenses
  const [interactiveItems, setInteractiveItems] = useState(() => {
    if (ledger.expenses && ledger.expenses.length > 0) {
      return ledger.expenses.map((exp) => ({
        id: exp.expense_id,
        name: exp.description,
        priceCents: exp.amount_cents,
        claimedBy: exp.splits.map((s) => s.user_id),
      }));
    }
    return [];
  });

  // Sync when ledger expenses change
  useEffect(() => {
    if (ledger.expenses && ledger.expenses.length > 0) {
      setInteractiveItems(
        ledger.expenses.map((exp) => ({
          id: exp.expense_id,
          name: exp.description,
          priceCents: exp.amount_cents,
          claimedBy: exp.splits.map((s) => s.user_id),
        }))
      );
    }
  }, [ledger.expenses]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText);
    setInputText('');
  };

  // Toggle member claiming on an item
  const toggleClaimant = (itemId: string, userId: string) => {
    setInteractiveItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const exists = item.claimedBy.includes(userId);
        const nextClaimed = exists
          ? item.claimedBy.filter((id) => id !== userId)
          : [...item.claimedBy, userId];
        return { ...item, claimedBy: nextClaimed.length > 0 ? nextClaimed : [userId] };
      })
    );
  };

  // Calculate live item-based debt allocation per member
  const liveMemberTotals = useMemo(() => {
    return ledger.members.map((member) => {
      let totalCents = 0;
      interactiveItems.forEach((item) => {
        if (item.claimedBy.includes(member.user_id)) {
          totalCents += Math.round(item.priceCents / (item.claimedBy.length || 1));
        }
      });
      return {
        member,
        totalCents,
      };
    });
  }, [ledger.members, interactiveItems]);

  // Copy PayPal link interaction with feedback
  const handleCopyLink = (linkId: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(linkId);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  // Calculate current escalation tier (Neutral scale: --muted -> --text -> --owes only for final overdue tier)
  const getEscalationTier = (hours: number): { tier: EscalationTier; label: string; heat: number; tokenColor: string } => {
    if (hours < 24) return { tier: 'POLITE_CONCIERGE', label: 'Polite Concierge', heat: 20, tokenColor: 'var(--muted)' };
    if (hours < 48) return { tier: 'PASSIVE_AGGRESSIVE', label: 'Follow-Up Notice', heat: 45, tokenColor: 'var(--muted)' };
    if (hours < 72) return { tier: 'DISAPPOINTED_PARENT', label: 'Firm Reminder', heat: 68, tokenColor: 'var(--text)' };
    if (hours < 96) return { tier: 'PUBLIC_ROAST', label: 'Urgent Notice', heat: 88, tokenColor: 'var(--text)' };
    return { tier: 'ITINERARY_EMBARGO', label: 'Itinerary Embargo', heat: 100, tokenColor: 'var(--owes)' };
  };

  const currentTier = getEscalationTier(ledger.hours_elapsed);
  const cur = getCurrencySymbol(ledger.currency);
  const organizer = ledger.members.find((m) => m.role === 'organizer') || ledger.members[0];

  // Partner member for suggestion prompt
  const friendMember = ledger.members.find((m) => m.user_id !== organizer?.user_id) || ledger.members[0];
  const friendFirstName = friendMember ? friendMember.name.split(' ')[0] : 'traveler';

  // Determine delinquent debtor with lowest net balance
  const topDebtor = ledger.members
    .filter((m) => (ledger.net_balances_cents[m.user_id] || 0) < 0)
    .sort((a, b) => (ledger.net_balances_cents[a.user_id] || 0) - (ledger.net_balances_cents[b.user_id] || 0))[0];

  const topDebtorOwedCents = topDebtor ? Math.abs(ledger.net_balances_cents[topDebtor.user_id] || 0) : 0;

  return (
    <div className="space-y-6 w-full max-w-[1560px] mx-auto py-2">
      {/* ================================================================ */}
      {/* 1. OPERATIONS COCKPIT DECK                                       */}
      {/* ================================================================ */}
      <section className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-6 sm:p-8 space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[var(--surface-elevated)] border border-[var(--border)] text-xs font-mono text-[var(--text)]">
              <span className="w-1.5 h-1.5 bg-white/70 rounded-full" />
              <span className="font-semibold">{formatPartyName(ledger.trip_name || ledger.name, ledger.trip_id)}</span>
              <span className="text-[var(--muted)]">·</span>
              <span className="text-[var(--muted)] flex items-center gap-1">
                <Clock className="w-3 h-3 text-[var(--muted)]" />
                <span>T+{ledger.hours_elapsed}h Simulated</span>
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-[var(--text)] tracking-tight leading-none m-0">
              Operations Simulator
            </h1>

            <p className="text-xs sm:text-sm text-[var(--muted)] font-body leading-relaxed m-0">
              Simulate debt aging, test natural language expense parsing, and trigger automated reminders.
            </p>
          </div>

          {/* Action Row: Outline/secondary actions, plus real PayPal touchpoint */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenReceiptModal}
              className="px-3.5 py-2 rounded-xl bg-[var(--surface-elevated)] hover:bg-white/10 border border-[var(--border)] text-xs font-mono font-medium text-[var(--text)] flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Receipt className="w-3.5 h-3.5 text-[var(--muted)]" />
              <span>Scan Bill</span>
            </button>

            <button
              type="button"
              onClick={() => onAdvanceTime(24)}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl bg-[var(--surface-elevated)] hover:bg-white/10 border border-[var(--border)] text-xs font-mono font-medium text-[var(--text)] flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-40"
            >
              <Clock className="w-3.5 h-3.5 text-[var(--muted)]" />
              <span>Advance Time (+24h)</span>
            </button>

            {topDebtor ? (
              <Button
                variant="secondary"
                size="md"
                onClick={() => onPayDebt(topDebtor.user_id, topDebtorOwedCents)}
                disabled={isLoading}
                icon={<CreditCard className="w-4 h-4 text-[var(--muted)]" />}
              >
                <span>Settle {topDebtor.name.split(' ')[0]} ({cur}{(topDebtorOwedCents / 100).toFixed(2)})</span>
              </Button>
            ) : (
              <div className="px-3.5 py-2 rounded-xl bg-[var(--canvas)] border border-[var(--border)] text-xs font-mono text-[var(--settled)] flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>All Balances Settled</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 2. MAIN COCKPIT: CHAT (LEFT) & DISSECTION CANVAS (RIGHT)         */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (5 COLS): NATURAL CONVERSATIONAL ASSISTANT */}
        <section className="lg:col-span-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex flex-col justify-between shadow-sm overflow-hidden h-[540px] sm:h-[640px] lg:h-[760px]">
          {/* Header */}
          <div className="p-4 border-b border-[var(--border)] bg-[var(--surface-elevated)] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-white/70" />
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--text)]">
                Chat Assistant
              </span>
            </div>
            <span className="text-xs font-mono text-[var(--muted)]">
              {messages.length} {messages.length === 1 ? 'message' : 'messages'}
            </span>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 font-mono text-xs">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col justify-center space-y-4 p-2 text-xs font-mono text-center">
                <div className="space-y-1.5">
                  <div className="w-10 h-10 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center mx-auto text-[var(--text)]">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="text-sm font-display font-bold text-[var(--text)]">Conversational Bill Entry</div>
                  <p className="text-sm text-[var(--muted)] font-body max-w-xs mx-auto m-0 leading-relaxed">
                    Type expenses naturally. The assistant extracts payers, amounts, and splits.
                  </p>
                </div>

                {/* Example Quick Prompts */}
                <div className="space-y-2 pt-2 text-left">
                  <div className="text-xs sm:text-sm text-[var(--muted)] uppercase tracking-wider font-semibold">Tap to paste example:</div>
                  <button
                    type="button"
                    onClick={() => setInputText(`Paid 120 for dinner split with @${friendFirstName}`)}
                    className="w-full p-3 rounded-xl bg-[var(--canvas)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-left text-sm text-[var(--text)] transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <span>"Paid 120 for dinner split with @{friendFirstName}"</span>
                    <span className="text-[var(--muted)] text-sm font-mono font-medium">Use</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputText(`Fronted 60 for airport taxi split equally`)}
                    className="w-full p-3 rounded-xl bg-[var(--canvas)] hover:bg-[var(--surface-elevated)] border border-[var(--border)] text-left text-sm text-[var(--text)] transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <span>"Fronted 60 for airport taxi split equally"</span>
                    <span className="text-[var(--muted)] text-sm font-mono font-medium">Use</span>
                  </button>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isSheriff = msg.is_bot;

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex flex-col ${isSheriff ? 'items-start' : 'items-end'}`}
                  >
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-sm font-mono font-semibold text-[var(--muted)]">
                        {msg.sender_name}
                      </span>
                      <span className="text-xs sm:text-sm font-mono text-[var(--muted)]">
                        {msg.timestamp}
                      </span>
                    </div>

                    <div
                      className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed border ${
                        isSheriff
                          ? 'bg-[var(--surface-elevated)] border-[var(--border)] text-[var(--text)]'
                          : 'bg-[var(--canvas)] border-white/20 text-[var(--text)]'
                      }`}
                    >
                      {msg.badge && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs sm:text-sm font-mono font-semibold uppercase mb-2 bg-[var(--canvas)] text-[var(--text)] border border-[var(--border)]">
                          <span>{msg.badge}</span>
                        </div>
                      )}

                      <div className="whitespace-pre-line font-body text-sm leading-relaxed">{msg.text}</div>

                      {/* PayPal Settlement Actions (Real PayPal touchpoints) */}
                      {msg.buttons && msg.buttons.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-[var(--border)] space-y-2">
                          {msg.buttons.map((btn, bIdx) => {
                            const mockUrl = btn.url || `https://www.sandbox.paypal.com/checkoutnow?token=SIM_${btn.payload?.amountCents || 6000}`;
                            const isCopied = copiedLink === `${msg.id}_${bIdx}`;

                            return (
                              <div key={bIdx} className="flex items-center gap-2">
                                <Button
                                  variant="paypal"
                                  size="sm"
                                  onClick={() => {
                                    if (btn.payload) {
                                      onPayDebt(btn.payload.userId, btn.payload.amountCents, btn.payload.expenseId);
                                    } else if (topDebtor) {
                                      onPayDebt(topDebtor.user_id, topDebtorOwedCents);
                                    }
                                  }}
                                  icon={<CreditCard className="w-3.5 h-3.5" />}
                                  className="flex-1 text-xs"
                                >
                                  {btn.text}
                                </Button>

                                <button
                                  type="button"
                                  onClick={() => handleCopyLink(`${msg.id}_${bIdx}`, mockUrl)}
                                  title="Copy PayPal Link"
                                  className="p-2 rounded-xl bg-[var(--canvas)] hover:bg-white/5 border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
                                >
                                  {isCopied ? <Check className="w-3.5 h-3.5 text-[var(--settled)]" /> : <Copy className="w-3.5 h-3.5 text-[var(--muted)]" />}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Prompt Composer: Exactly ONE lime-filled button on screen */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-[var(--border)] bg-[var(--surface-elevated)] flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenReceiptModal}
              title="Upload Paper Bill"
              className="p-2.5 rounded-xl bg-[var(--canvas)] hover:bg-white/5 border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              type="text"
              placeholder="e.g. Paid 150 for groceries split with Alex and Sarah"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-[var(--canvas)] border border-[var(--border)] rounded-xl px-3.5 py-2 text-xs text-[var(--text)] placeholder-[var(--muted)] font-body focus:outline-none focus:border-white/30"
            />
            {/* The single primary lime button on this screen */}
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="shrink-0 px-3.5 py-2"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </section>

        {/* RIGHT COLUMN (7 COLS): BILL DISSECTION CANVAS & RECOVERY RADAR */}
        <section className="lg:col-span-7 space-y-6">
          {/* Bill Dissection Canvas */}
          <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div>
                <h3 className="text-sm font-display font-bold text-[var(--text)] m-0">
                  Bill Dissection Canvas
                </h3>
                <p className="text-xs text-[var(--muted)] font-body m-0 mt-0.5">
                  Assign line items across party members to update active debt balances.
                </p>
              </div>
              <span className="text-xs font-mono text-[var(--muted)] bg-[var(--surface-elevated)] px-2.5 py-1 rounded-md border border-[var(--border)]">
                {interactiveItems.length} {interactiveItems.length === 1 ? 'bill' : 'bills'}
              </span>
            </div>

            {/* Line Items List */}
            <div className="space-y-3">
              {interactiveItems.length === 0 ? (
                <div className="p-6 rounded-xl bg-[var(--canvas)] border border-[var(--border)] space-y-3 text-center">
                  <Layers className="w-6 h-6 text-[var(--muted)] mx-auto opacity-60" />
                  <div className="text-xs font-display font-bold text-[var(--text)]">No Bills Active</div>
                  <p className="text-xs text-[var(--muted)] font-body max-w-sm mx-auto m-0">
                    Upload a receipt or type an expense in the chat to dissect items among travelers.
                  </p>
                </div>
              ) : (
                interactiveItems.map((item) => {
                  const claimantsCount = item.claimedBy.length || 1;
                  const perPersonCents = Math.round(item.priceCents / claimantsCount);

                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl bg-[var(--canvas)] border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-[var(--text)] font-body truncate">
                          {item.name}
                        </div>
                        <div className="font-mono text-xs font-bold text-[var(--text)] mt-0.5 tabular-nums">
                          {cur}{(item.priceCents / 100).toFixed(2)}{' '}
                          <span className="text-xs text-[var(--muted)] font-normal">
                            ({cur}{(perPersonCents / 100).toFixed(2)} each · {claimantsCount} shares)
                          </span>
                        </div>
                      </div>

                      {/* Member Claim Toggles: cycles 6 tag tokens with initials */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {ledger.members.map((member) => {
                          const isClaimed = item.claimedBy.includes(member.user_id);
                          const tag = getMemberTagColor(member.user_id);

                          return (
                            <button
                              key={member.user_id}
                              type="button"
                              onClick={() => toggleClaimant(item.id, member.user_id)}
                              className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                                isClaimed
                                  ? 'bg-[var(--surface-elevated)] border border-white/30 text-[var(--text)]'
                                  : 'bg-transparent border border-dashed border-[var(--border)] text-[var(--muted)] opacity-50 hover:opacity-100'
                              }`}
                            >
                              <span
                                style={{
                                  backgroundColor: tag.bg,
                                  color: tag.text,
                                  borderColor: tag.border,
                                }}
                                className="w-5 h-5 rounded-md text-xs font-bold border flex items-center justify-center shrink-0"
                              >
                                {member.name.slice(0, 2).toUpperCase()}
                              </span>
                              <span className="truncate max-w-[70px]">{member.name.split(' ')[0]}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Calculated Member Totals */}
            <div className="pt-3 border-t border-[var(--border)] space-y-2">
              <div className="text-xs font-mono text-[var(--muted)] uppercase tracking-wider font-semibold">
                Simulated Traveler Totals:
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {liveMemberTotals.map(({ member, totalCents }) => {
                  const tag = getMemberTagColor(member.user_id);
                  return (
                    <div
                      key={member.user_id}
                      className="p-2.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] space-y-1"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          style={{
                            backgroundColor: tag.bg,
                            color: tag.text,
                            borderColor: tag.border,
                          }}
                          className="w-5 h-5 rounded-md text-xs font-bold border flex items-center justify-center shrink-0"
                        >
                          {member.name.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="text-xs text-[var(--text)] font-body truncate font-medium">
                          {member.name.split(' ')[0]}
                        </span>
                      </div>
                      <div className="text-sm font-mono font-bold text-[var(--text)] tabular-nums">
                        {cur}{(totalCents / 100).toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Automated Escalation Notice & Debt Aging Radar */}
          <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[var(--muted)]" />
                <h3 className="text-sm font-display font-bold text-[var(--text)] m-0">
                  Recovery Escalation Tier
                </h3>
              </div>
              <span
                className="text-xs font-mono px-2.5 py-0.5 rounded-md font-semibold border"
                style={{ 
                  color: currentTier.tokenColor, 
                  borderColor: currentTier.tokenColor,
                  backgroundColor: 'rgba(255, 255, 255, 0.04)' 
                }}
              >
                {currentTier.label}
              </span>
            </div>

            {/* Heat Progress Track */}
            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex justify-between text-[var(--muted)]">
                <span>Escalation Intensity</span>
                <span className="font-bold text-[var(--text)] tabular-nums">{currentTier.heat}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-[var(--canvas)] overflow-hidden border border-[var(--border)]">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${currentTier.heat}%`,
                    backgroundColor: currentTier.tokenColor,
                  }}
                />
              </div>
            </div>

            {/* Notice Preview Card */}
            <div className="p-4 rounded-xl bg-[var(--canvas)] border border-[var(--border)] space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[var(--muted)]">
                  Primary Debtor: <span className="text-[var(--text)] font-semibold">{topDebtor ? topDebtor.name : 'None'}</span>
                </span>
                {topDebtor && (
                  <span className="text-[var(--muted)] text-xs font-mono border border-[var(--border)] px-2 py-0.5 rounded">
                    {getNotificationLabel(topDebtor.roast_consent)}
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text)] font-body leading-relaxed m-0">
                {topDebtor ? (
                  ledger.hours_elapsed >= 72
                    ? `[Overdue Notice] ${topDebtor.name.split(' ')[0]}, balance of ${cur}${(topDebtorOwedCents / 100).toFixed(2)} is overdue by ${ledger.hours_elapsed}h. Settle with PayPal above.`
                    : `[Payment Reminder] ${topDebtor.name.split(' ')[0]} owes ${cur}${(topDebtorOwedCents / 100).toFixed(2)}. Settle via PayPal above.`
                ) : (
                  'All party members are currently settled. Automated reminders trigger when balances are overdue.'
                )}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

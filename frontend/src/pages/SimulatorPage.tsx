import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Send, 
  CreditCard, 
  Flame, 
  Paperclip, 
  Sparkles, 
  Copy, 
  Check, 
  Zap, 
  Receipt, 
  Layers,
  Bell
} from 'lucide-react';
import type { ChatMessage, TripLedger, EscalationTier } from '../types';
import { Button } from '../components/ui/Button';
import { getCurrencySymbol } from '../lib/currency';
import { getNotificationLabel } from '../lib/notifications';

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
  const liveMemberTotals = ledger.members.map((member) => {
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

  // Copy PayPal link interaction
  const handleCopyLink = (linkId: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(linkId);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  // Calculate current escalation tier
  const getEscalationTier = (hours: number): { tier: EscalationTier; label: string; heat: number; color: string } => {
    if (hours < 24) return { tier: 'POLITE_CONCIERGE', label: 'Friendly Nudge', heat: 20, color: '#C6FF3D' };
    if (hours < 48) return { tier: 'PASSIVE_AGGRESSIVE', label: 'Follow-Up', heat: 45, color: '#FFC439' };
    if (hours < 72) return { tier: 'DISAPPOINTED_PARENT', label: 'Firm Reminder', heat: 68, color: '#FF9B42' };
    if (hours < 96) return { tier: 'PUBLIC_ROAST', label: 'Urgent Reminder', heat: 88, color: '#FF5C7A' };
    return { tier: 'ITINERARY_EMBARGO', label: 'Final Notice', heat: 100, color: '#FF5C7A' };
  };

  const currentTier = getEscalationTier(ledger.hours_elapsed);
  const cur = getCurrencySymbol(ledger.currency);
  const organizer = ledger.members.find((m) => m.role === 'organizer') || ledger.members[0];

  // Partner member for suggestion prompt
  const friendMember = ledger.members.find((m) => m.user_id !== organizer?.user_id) || ledger.members[0];
  const friendFirstName = friendMember ? friendMember.name.split(' ')[0] : 'friend';

  // Dynamically determine the delinquent debtor with lowest net balance
  const topDebtor = ledger.members
    .filter((m) => (ledger.net_balances_cents[m.user_id] || 0) < 0)
    .sort((a, b) => (ledger.net_balances_cents[a.user_id] || 0) - (ledger.net_balances_cents[b.user_id] || 0))[0];

  const topDebtorOwedCents = topDebtor ? Math.abs(ledger.net_balances_cents[topDebtor.user_id] || 0) : 0;

  return (
    <div className="space-y-6 w-full max-w-[1560px] mx-auto py-2">
      {/* ================================================================ */}
      {/* TOP OPERATIONS CONTROL DECK                                      */}
      {/* ================================================================ */}
      <div className="rounded-2xl bg-[#0F1117] border border-white/8 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#171A23] border border-white/10 flex items-center justify-center">
            <Zap className="w-4 h-4 text-[#C6FF3D]" />
          </div>
          <div>
            <h2 className="text-sm font-display font-bold text-[#EDEEF2] m-0">
              Simulator
            </h2>
            <p className="text-[11px] text-[#8A8FA3] font-body m-0 mt-0.5">
              Simulate time, automated reminders, and natural chat splits
            </p>
          </div>
        </div>

        {/* Operational Action Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={onOpenReceiptModal}
            className="px-3 py-1.5 rounded-xl bg-[#171A23] hover:bg-white/8 border border-white/10 text-xs font-mono font-medium text-[#EDEEF2] flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Receipt className="w-3.5 h-3.5 text-[#C6FF3D]" />
            <span>Upload Bill</span>
          </button>

          <button
            onClick={() => onAdvanceTime(24)}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-xl bg-[#171A23] hover:bg-[#FF5C7A]/20 border border-white/10 hover:border-[#FF5C7A]/40 text-xs font-mono font-medium text-[#EDEEF2] flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Flame className="w-3.5 h-3.5 text-[#FF5C7A]" />
            <span>+24 Hours</span>
          </button>

          {topDebtor ? (
            <button
              onClick={() => onPayDebt(topDebtor.user_id, topDebtorOwedCents)}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-xl bg-[#FFC439] hover:bg-[#f5b828] text-[#07080D] text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Settle {topDebtor.name.split(' ')[0]} ({cur}{(topDebtorOwedCents / 100).toFixed(2)})</span>
            </button>
          ) : (
            <span className="px-3 py-1.5 rounded-xl bg-[#171A23] border border-white/8 text-xs font-mono text-[#C6FF3D]">
              All Settled
            </span>
          )}
        </div>
      </div>

      {/* ================================================================ */}
      {/* 2-COLUMN WAR ROOM LAYOUT                                         */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Natural Language Intent Interceptor */}
        <div className="lg:col-span-5 rounded-3xl bg-[#0F1117] border border-white/8 flex flex-col justify-between shadow-[0_16px_48px_rgba(0,0,0,0.8)] overflow-hidden h-[740px]">
          {/* Header */}
          <div className="p-4 border-b border-white/8 bg-[#07080D]/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C6FF3D] animate-pulse" />
              <span className="text-xs font-mono font-bold text-[#EDEEF2]">
                Chat Assistant
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#8A8FA3]">
              {messages.length} Messages
            </span>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-none">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col justify-center space-y-4 p-4 text-xs font-mono">
                <div className="text-center space-y-1 mb-2">
                  <div className="w-10 h-10 rounded-2xl bg-[#171A23] border border-white/10 flex items-center justify-center mx-auto text-[#C6FF3D]">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="text-sm font-display font-bold text-[#EDEEF2]">Add Expense via Chat</div>
                  <p className="text-[11px] text-[#8A8FA3] font-body m-0">
                    Type expenses naturally. The AI reads payers, amounts, and splits:
                  </p>
                </div>

                {/* Example Quick Prompts */}
                <div className="space-y-2">
                  <div className="text-[10px] text-[#8A8FA3] uppercase tracking-wider">Tap an example:</div>
                  <button
                    onClick={() => setInputText(`Paid 120 for dinner split with @${friendFirstName}`)}
                    className="w-full p-2.5 rounded-xl bg-[#07080D] hover:bg-[#171A23] border border-white/8 text-left text-[11px] text-[#EDEEF2] transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <span>"Paid 120 for dinner split with @{friendFirstName}"</span>
                    <span className="text-[#C6FF3D] text-[10px]">Use</span>
                  </button>
                  <button
                    onClick={() => setInputText(`Fronted 60 for airport taxi split equally`)}
                    className="w-full p-2.5 rounded-xl bg-[#07080D] hover:bg-[#171A23] border border-white/8 text-left text-[11px] text-[#EDEEF2] transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <span>"Fronted 60 for airport taxi split equally"</span>
                    <span className="text-[#C6FF3D] text-[10px]">Use</span>
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-[#171A23]/50 border border-white/6 text-[11px] text-[#8A8FA3] flex items-center gap-2">
                  <Paperclip className="w-3.5 h-3.5 text-[#C6FF3D] shrink-0" />
                  <span>Tip: Click the clip to upload a bill.</span>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isSheriff = msg.is_bot;

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex flex-col ${isSheriff ? 'items-start' : 'items-end'}`}
                  >
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-[11px] font-mono font-semibold text-[#8A8FA3]">
                        {msg.sender_name}
                      </span>
                      <span className="text-[10px] font-mono text-[#8A8FA3]/60">
                        {msg.timestamp}
                      </span>
                    </div>

                    <div
                      className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed border ${
                        isSheriff
                          ? 'bg-[#171A23] border-white/12 text-[#EDEEF2] shadow-md'
                          : 'bg-[#C6FF3D]/10 border-[#C6FF3D]/30 text-[#EDEEF2]'
                      }`}
                    >
                      {msg.badge && (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase mb-2 bg-[#07080D] text-[#C6FF3D] border border-white/10">
                          <Sparkles className="w-3 h-3 text-[#C6FF3D]" />
                          <span>{msg.badge}</span>
                        </div>
                      )}

                      <div className="whitespace-pre-line font-body">{msg.text}</div>

                      {/* PayPal Settlement Actions */}
                      {msg.buttons && msg.buttons.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-white/10 space-y-2">
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
                                  onClick={() => handleCopyLink(`${msg.id}_${bIdx}`, mockUrl)}
                                  title="Copy PayPal Link"
                                  className="p-2 rounded-xl bg-[#07080D] hover:bg-white/8 border border-white/10 text-[#8A8FA3] hover:text-[#EDEEF2] transition-colors cursor-pointer"
                                >
                                  {isCopied ? <Check className="w-3.5 h-3.5 text-[#C6FF3D]" /> : <Copy className="w-3.5 h-3.5 text-[#8A8FA3]" />}
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

          {/* Prompt Composer */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-white/8 bg-[#07080D]/80 flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenReceiptModal}
              title="Upload Paper Bill"
              className="p-2.5 rounded-xl bg-[#171A23] hover:bg-white/8 border border-white/10 text-[#8A8FA3] hover:text-[#C6FF3D] transition-colors cursor-pointer"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-[#0F1117] border border-white/8 rounded-xl px-3.5 py-2.5 text-xs text-[#EDEEF2] placeholder-[#8A8FA3] font-body focus:outline-none focus:border-[#C6FF3D]"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="p-2.5 rounded-xl bg-[#C6FF3D] hover:bg-[#b8f52f] text-[#07080D] transition-all disabled:opacity-30 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Right Column: Live Expense Breakdown & Delinquency Radar */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-6">
          {/* Top Panel: Interactive Bill Dissection Canvas */}
          <div className="rounded-3xl bg-[#0F1117] border border-white/8 p-6 shadow-[0_16px_48px_rgba(0,0,0,0.8)] space-y-5">
            <div className="flex items-center justify-between border-b border-white/8 pb-3">
              <div>
                <h3 className="text-base font-display font-bold text-[#EDEEF2] m-0">
                  Bill Dissection Canvas
                </h3>
                <p className="text-xs text-[#8A8FA3] font-body m-0 mt-0.5">
                  Select members for each item to divide costs.
                </p>
              </div>
              <span className="text-[11px] font-mono text-[#C6FF3D] bg-[#C6FF3D]/10 px-2.5 py-1 rounded-full border border-[#C6FF3D]/30">
                {interactiveItems.length} Expenses
              </span>
            </div>

            {/* Bill Line Items with Claimant Chips */}
            <div className="space-y-3">
              {interactiveItems.length === 0 ? (
                <div className="p-6 rounded-2xl bg-[#07080D] border border-white/6 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#C6FF3D]/15 flex items-center justify-center shrink-0">
                      <Layers className="w-4 h-4 text-[#C6FF3D]" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[#EDEEF2] font-body">Sample Item Split</div>
                      <div className="text-[11px] text-[#8A8FA3] font-body mt-0.5">
                        Upload a bill to split items here, or tap below to test:
                      </div>
                    </div>
                  </div>

                  {/* Interactive Sample Bill Item */}
                  <div className="p-3.5 rounded-xl bg-[#171A23] border border-white/8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-semibold text-[#EDEEF2] font-body">Sample Bill Item (e.g. Group Dinner Platter)</div>
                      <div className="font-mono text-xs font-bold text-[#C6FF3D] mt-0.5">
                        {cur}60.00 <span className="text-[10px] text-[#8A8FA3] font-normal">(Shared equally by selected chips)</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {ledger.members.slice(0, 3).map((m) => (
                        <span
                          key={m.user_id}
                          className="px-2 py-0.5 rounded-lg bg-[#07080D] border border-[#C6FF3D]/40 text-[#C6FF3D] font-mono text-[11px]"
                        >
                          {m.name.split(' ')[0]}: {cur}{(60 / Math.min(3, ledger.members.length)).toFixed(2)}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] font-mono text-[#8A8FA3]">Ready to parse real bills:</span>
                    <button
                      onClick={onOpenReceiptModal}
                      className="px-3 py-1.5 rounded-xl bg-[#C6FF3D] hover:bg-[#b8f52f] text-[#07080D] font-mono font-bold text-xs transition-colors cursor-pointer"
                    >
                      Upload Bill
                    </button>
                  </div>
                </div>
              ) : (
                interactiveItems.map((item) => {
                  const claimantsCount = item.claimedBy.length || 1;
                  const perPersonCents = Math.round(item.priceCents / claimantsCount);

                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl bg-[#07080D] border border-white/6 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-xs font-semibold text-[#EDEEF2] font-body">
                          {item.name}
                        </div>
                        <div className="text-sm font-mono font-bold text-[#EDEEF2] mt-0.5">
                          {cur}{(item.priceCents / 100).toFixed(2)}{' '}
                          <span className="text-[11px] text-[#8A8FA3] font-normal">
                            ({cur}{(perPersonCents / 100).toFixed(2)} each)
                          </span>
                        </div>
                      </div>

                      {/* Member Claim Toggles */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {ledger.members.map((member) => {
                          const isClaimed = item.claimedBy.includes(member.user_id);
                          return (
                            <button
                              key={member.user_id}
                              onClick={() => toggleClaimant(item.id, member.user_id)}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                                isClaimed
                                  ? 'bg-[#171A23] border border-[#C6FF3D]/60 text-[#C6FF3D]'
                                  : 'bg-transparent border border-white/8 text-[#8A8FA3] hover:text-[#EDEEF2] opacity-50'
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              <span>{member.name.split(' ')[0]}</span>
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
            <div className="pt-2 border-t border-white/8">
              <div className="text-xs font-mono text-[#8A8FA3] mb-2 uppercase">
                MEMBER TOTALS:
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {liveMemberTotals.map(({ member, totalCents }) => (
                  <div
                    key={member.user_id}
                    className="p-2.5 rounded-xl bg-[#171A23] border border-white/8 flex flex-col"
                  >
                    <span className="text-[11px] text-[#8A8FA3] font-body truncate">
                      {member.name.split(' ')[0]}
                    </span>
                    <span className="text-sm font-mono font-bold text-[#EDEEF2] tabular-nums mt-0.5">
                      {cur}{(totalCents / 100).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Panel: Dynamic Escalation Heat Radar & Automated Payment Notice */}
          <div className="rounded-3xl bg-[#0F1117] border border-white/8 p-6 shadow-[0_16px_48px_rgba(0,0,0,0.8)] space-y-4">
            <div className="flex items-center justify-between border-b border-white/8 pb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#FF5C7A]" />
                <h3 className="text-sm font-display font-bold text-[#EDEEF2] m-0">
                  Payment Reminders
                </h3>
              </div>
              <span
                className="text-[11px] font-mono px-2.5 py-0.5 rounded-full font-bold border"
                style={{ color: currentTier.color, borderColor: `${currentTier.color}40`, backgroundColor: `${currentTier.color}15` }}
              >
                {currentTier.label}
              </span>
            </div>

            {/* Heat Progress Track */}
            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex justify-between text-[#8A8FA3]">
                <span>Time elapsed: +{ledger.hours_elapsed}h</span>
                <span className="font-bold text-[#EDEEF2]">Level: {currentTier.heat}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-[#07080D] overflow-hidden p-0.5 border border-white/8">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${currentTier.heat}%`,
                    backgroundColor: currentTier.color,
                    
                  }}
                />
              </div>
            </div>

            {/* Automated Notice Preview Card */}
            <div className="p-4 rounded-2xl bg-[#07080D] border border-white/8 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#8A8FA3]">
                  TARGET: {topDebtor ? topDebtor.name.toUpperCase() : 'NONE'}
                </span>
                {topDebtor && (
                  <span className="text-[#C6FF3D] font-bold">NOTIFICATIONS: {getNotificationLabel(topDebtor.roast_consent)}</span>
                )}
              </div>
              <p className="text-xs text-[#EDEEF2] font-body leading-relaxed m-0">
                {topDebtor ? (
                  ledger.hours_elapsed >= 72
                    ? `[Urgent] ${topDebtor.name.split(' ')[0]}, balance of ${cur}${(topDebtorOwedCents / 100).toFixed(2)} is overdue (+${ledger.hours_elapsed}h). Settle with PayPal above.`
                    : `[Reminder] ${topDebtor.name.split(' ')[0]} owes ${cur}${(topDebtorOwedCents / 100).toFixed(2)}. Settle with PayPal above.`
                ) : (
                  'All members are settled. When balances age past 24h, automated reminders appear here.'
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

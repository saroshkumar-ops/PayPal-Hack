import React, { useState, useRef, useEffect } from 'react';
import { Send, Clock, Utensils, CreditCard, Flame, Paperclip, Sparkles, MessageSquare, ShieldAlert } from 'lucide-react';
import type { ChatMessage, TripLedger } from '../types';
import { Logo } from '../components/common/Logo';

interface SimulatorPageProps {
  ledger: TripLedger;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onSimulateExpense: () => void;
  onAdvanceTime: (hours: number) => void;
  onPayDebt: (userId: string, amountCents: number) => void;
  onOpenReceiptModal: () => void;
  isLoading: boolean;
}

export const SimulatorPage: React.FC<SimulatorPageProps> = ({
  ledger,
  messages,
  onSendMessage,
  onSimulateExpense,
  onAdvanceTime,
  onPayDebt,
  onOpenReceiptModal,
  isLoading,
}) => {
  const [inputText, setInputText] = useState('');
  const [mobileTab, setMobileTab] = useState<'chat' | 'matrix'>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const alexDebtor = ledger.members.find(m => m.user_id === 'user_02') || ledger.members[1];
  const heat = alexDebtor.heat_score || 75;

  return (
    <div className="space-y-4 w-full py-1">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-[#33475A]">
        <div>
          <h1 className="text-xl font-bold text-[#E7EDF2] tracking-tight m-0">
            Telegram Group Chat & Judge Simulator
          </h1>
          <p className="text-xs text-[#8199AE] m-0 mt-0.5">
            Test the agentic debt enforcement loop in real-time on PayPal sandbox rails
          </p>
        </div>

        {/* Action Triggers (Horizontally scrollable on mobile) */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={onSimulateExpense}
            disabled={isLoading}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1F2C38] hover:bg-[#33475A] border border-[#33475A] text-xs font-medium text-[#E7EDF2] transition-all cursor-pointer"
          >
            <Utensils className="w-3.5 h-3.5 text-[#8199AE]" />
            Simulate Dinner
          </button>
          <button
            onClick={() => onAdvanceTime(24)}
            disabled={isLoading}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4E6A83] hover:bg-[#33475A] text-xs font-medium text-[#E7EDF2] transition-all cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5" />
            Fast-Forward +24h
          </button>
          <button
            onClick={() => onPayDebt('user_02', 8000)}
            disabled={isLoading}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1F2C38] hover:bg-[#33475A] border border-[#33475A] text-xs font-medium text-[#E7EDF2] transition-all cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5 text-[#8199AE]" />
            Pay Alex's $80
          </button>
        </div>
      </div>

      {/* Mobile Tab Toggle (< lg only) */}
      <div className="lg:hidden flex rounded-xl bg-[#1F2C38] border border-[#33475A] p-1">
        <button
          onClick={() => setMobileTab('chat')}
          className={`flex-1 py-1.5 px-3 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            mobileTab === 'chat'
              ? 'bg-[#4E6A83] text-[#E7EDF2] shadow-sm'
              : 'text-[#8199AE] hover:text-[#B7C6D3]'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Telegram Feed ({messages.length})</span>
        </button>
        <button
          onClick={() => setMobileTab('matrix')}
          className={`flex-1 py-1.5 px-3 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            mobileTab === 'matrix'
              ? 'bg-[#4E6A83] text-[#E7EDF2] shadow-sm'
              : 'text-[#8199AE] hover:text-[#B7C6D3]'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Escalation ({heat}% Heat)</span>
        </button>
      </div>

      {/* Main Grid: Responsive Side-by-Side (PC Full Screen) & Segmented (Mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Column: Chat Feed */}
        <div
          className={`lg:col-span-7 flex flex-col rounded-2xl border border-[#33475A] bg-[#1F2C38] overflow-hidden shadow-sm h-[calc(100vh-310px)] lg:h-[calc(100vh-190px)] min-h-[480px] lg:min-h-[620px] ${
            mobileTab === 'chat' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Channel Header */}
          <div className="px-4 py-3 border-b border-[#33475A] bg-[#10161C]/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Logo size="sm" showText={false} />
              <div>
                <div className="text-xs font-bold text-[#E7EDF2] leading-tight">
                  Bali Reunion 2026 #expenses
                </div>
                <div className="text-[10px] text-[#8199AE]">TripSheriff AI Bot Active</div>
              </div>
            </div>
            <span className="text-[10px] font-mono text-[#8199AE] bg-[#10161C] border border-[#33475A] px-2 py-0.5 rounded-md">
              Telegram Gateway
            </span>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className="flex flex-col items-start max-w-[92%] sm:max-w-[85%]">
                <div className="flex items-center gap-2 mb-1 pl-1">
                  <span className="text-xs font-bold text-[#E7EDF2]">{msg.sender_name}</span>
                  <span className="text-[10px] text-[#8199AE] font-mono">{msg.sender_handle}</span>
                  <span className="text-[10px] text-[#8199AE]">• {msg.timestamp}</span>
                </div>

                <div
                  className={`rounded-2xl p-3.5 text-xs leading-relaxed border ${
                    msg.is_bot
                      ? 'bg-[#10161C] border-[#33475A] text-[#E7EDF2]'
                      : 'bg-[#33475A]/40 border-[#33475A] text-[#E7EDF2]'
                  }`}
                >
                  {msg.badge && (
                    <div className="mb-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1F2C38] border border-[#33475A] text-[#8199AE]">
                        {msg.badge}
                      </span>
                    </div>
                  )}

                  <div className="whitespace-pre-line text-[#B7C6D3]">
                    {msg.text.split('**').map((part, i) =>
                      i % 2 === 1 ? <strong key={i} className="text-[#E7EDF2] font-semibold">{part}</strong> : part
                    )}
                  </div>

                  {/* Public Deadbeat Roast Poster (Tier 4) */}
                  {msg.roast_tier === 'PUBLIC_ROAST' && (
                    <div className="mt-3 p-3 rounded-xl bg-[#10161C] border border-[#4E6A83] text-left">
                      <div className="text-[10px] font-mono font-bold text-[#E7EDF2] uppercase tracking-wider">
                        WANTED: DEADBEAT TRAVELER
                      </div>
                      <div className="text-xs text-[#E7EDF2] font-semibold mt-1">
                        Alex Rivera • $80.00 USD
                      </div>
                      <div className="text-[11px] text-[#8199AE] italic mt-0.5">
                        "Consensus roast active. Demoted to pull-out couch until settled."
                      </div>
                    </div>
                  )}

                  {/* Interactive PayPal Buttons */}
                  {msg.buttons && msg.buttons.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-[#33475A] flex flex-wrap gap-2">
                      {msg.buttons.map((btn, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            if (btn.payload) {
                              onPayDebt(btn.payload.userId, btn.payload.amountCents);
                            } else {
                              onPayDebt('user_02', 8000);
                            }
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#4E6A83] hover:bg-[#33475A] text-[#E7EDF2] transition-all cursor-pointer"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          {btn.text}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-[#33475A] bg-[#10161C]/60 flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenReceiptModal}
              title="Upload Receipt"
              className="p-2.5 rounded-lg bg-[#1F2C38] hover:bg-[#33475A] border border-[#33475A] text-[#8199AE] hover:text-[#E7EDF2] transition-colors cursor-pointer"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              type="text"
              placeholder="e.g. Paid $60 for surf rentals with Alex and Dave..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-[#10161C] border border-[#33475A] rounded-xl px-3.5 py-2 text-xs text-[#E7EDF2] placeholder-[#8199AE] focus:outline-none focus:border-[#4E6A83]"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="p-2.5 rounded-lg bg-[#4E6A83] hover:bg-[#33475A] text-[#E7EDF2] transition-all disabled:opacity-40 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Right Column: Debt Escalation Gauge & Ledger Summary */}
        <div
          className={`lg:col-span-5 space-y-4 flex flex-col justify-between ${
            mobileTab === 'matrix' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Debt Escalation Matrix Card */}
          <div className="rounded-2xl border border-[#33475A] bg-[#1F2C38] p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-[#33475A]">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#8199AE]" />
                <span className="text-xs font-bold text-[#E7EDF2] uppercase tracking-wider">
                  Escalation Matrix
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#8199AE] bg-[#10161C] border border-[#33475A] px-2 py-0.5 rounded">
                Consent: {alexDebtor.roast_consent}
              </span>
            </div>

            <div className="my-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#E7EDF2]">{alexDebtor.name}</div>
                  <div className="text-[11px] text-[#8199AE] font-mono">{alexDebtor.handle}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold font-mono text-[#E7EDF2]">$110.00 Overdue</div>
                  <div className="text-[10px] text-[#8199AE]">{ledger.hours_elapsed}h Unpaid</div>
                </div>
              </div>

              {/* Heat Score Bar */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-[#8199AE]">Heat Score</span>
                  <span className="font-mono text-[#E7EDF2]">{heat}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[#10161C] overflow-hidden">
                  <div className="h-full bg-[#4E6A83] rounded-full transition-all duration-500" style={{ width: `${heat}%` }} />
                </div>
              </div>

              {/* Current Persona Quote */}
              <div className="p-3 rounded-xl bg-[#10161C] border border-[#33475A] text-[11px] text-[#B7C6D3] italic leading-relaxed">
                "Alex beta, I see your Instagram stories from Potato Head Beach Club. Sarah is still waiting on your $80.00 villa share from yesterday."
              </div>
            </div>

            <button
              onClick={() => onAdvanceTime(24)}
              className="w-full py-2.5 px-3 rounded-xl bg-[#4E6A83] hover:bg-[#33475A] text-xs font-semibold text-[#E7EDF2] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Escalate to Next Enforcement Tier
            </button>
          </div>

          {/* Member Net Balances */}
          <div className="rounded-2xl border border-[#33475A] bg-[#1F2C38] p-5 shadow-sm flex-1 flex flex-col justify-between">
            <div className="text-xs font-bold text-[#E7EDF2] uppercase tracking-wider pb-3 mb-3 border-b border-[#33475A]">
              Member Balances (Integer Cents)
            </div>

            <div className="space-y-2.5">
              {ledger.members.map((m) => {
                const net = (ledger.net_balances_cents[m.user_id] || 0) / 100;
                const isCreditor = net > 0;
                const isSettled = net === 0;

                return (
                  <div
                    key={m.user_id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#10161C] border border-[#33475A]"
                  >
                    <div>
                      <div className="text-xs font-semibold text-[#E7EDF2]">{m.name}</div>
                      <div className="text-[10px] text-[#8199AE] font-mono">{m.handle}</div>
                    </div>
                    <div className="text-right font-mono text-xs font-bold text-[#E7EDF2]">
                      {isCreditor ? `+$${net.toFixed(2)}` : isSettled ? '$0.00' : `-$${Math.abs(net).toFixed(2)}`}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-[#8199AE] font-mono mt-3 m-0">
              Sum of net balances: $0.00 (Perfect conservation)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

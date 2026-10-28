import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Send, 
  Sparkles, 
  Clock, 
  Utensils, 
  CreditCard, 
  Paperclip, 
  Flame,
  Shield,
  AlertTriangle 
} from 'lucide-react';
import type { ChatMessage, EscalationTier } from '../../types';
import { BadgePill } from '../bits/BadgePill';

interface ChatSimulatorProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onSimulateExpense: () => void;
  onAdvanceTime: (hours: number) => void;
  onPayDebt: (userId: string, amountCents: number) => void;
  onOpenReceiptModal: () => void;
  isLoading: boolean;
}

export const ChatSimulator: React.FC<ChatSimulatorProps> = ({
  messages,
  onSendMessage,
  onSimulateExpense,
  onAdvanceTime,
  onPayDebt,
  onOpenReceiptModal,
  isLoading,
}) => {
  const [inputText, setInputText] = useState('');
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

  const getTierMetadata = (tier?: EscalationTier) => {
    switch (tier) {
      case 'POLITE_CONCIERGE':
        return { label: 'Tier 1: Polite Concierge', color: 'border-blue-500/30 text-blue-300 bg-blue-500/10' };
      case 'PASSIVE_AGGRESSIVE':
        return { label: 'Tier 2: Passive-Aggressive', color: 'border-amber-500/30 text-amber-300 bg-amber-500/10' };
      case 'DISAPPOINTED_PARENT':
        return { label: 'Tier 3: Disappointed Parent', color: 'border-purple-500/30 text-purple-300 bg-purple-500/10' };
      case 'PUBLIC_ROAST':
        return { label: 'Tier 4: Public Deadbeat Roast', color: 'border-rose-500/30 text-rose-300 bg-rose-500/10' };
      case 'ITINERARY_EMBARGO':
        return { label: 'Tier 5: Itinerary Embargo', color: 'border-red-600/40 text-red-300 bg-red-600/20' };
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-[780px] rounded-3xl border border-white/[0.08] bg-[#0C0F17]/90 backdrop-blur-2xl overflow-hidden shadow-2xl">
      {/* Telegram Chat Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07] bg-[#111420]/70">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-md shadow-blue-500/25">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-[#0C0F17]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white m-0">Bali Reunion 2026</h3>
              <BadgePill status="INFO" label="Telegram Bot" />
            </div>
            <p className="text-xs text-zinc-400 m-0">3 active travelers • Auto-monitoring debts</p>
          </div>
        </div>

        <div className="text-right hidden sm:block">
          <div className="text-[11px] text-zinc-500 font-mono">Channel: #group-expenses</div>
          <div className="text-[11px] text-emerald-400 font-medium">● Bot Active (Webhook verified)</div>
        </div>
      </div>

      {/* Quick Judge Action Dock */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-zinc-950/60 border-b border-white/[0.05]">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 mr-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Judge Quick Actions:</span>
        </div>

        <button
          onClick={onSimulateExpense}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-medium text-zinc-200 transition-all active:scale-95"
        >
          <Utensils className="w-3.5 h-3.5 text-blue-400" />
          Simulate $150 Dinner
        </button>

        <button
          onClick={() => onAdvanceTime(24)}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/[0.08] hover:bg-amber-500/[0.14] border border-amber-500/20 text-xs font-medium text-amber-300 transition-all active:scale-95"
        >
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          Fast-Forward +24h
        </button>

        <button
          onClick={() => onPayDebt('user_02', 8000)}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/[0.08] hover:bg-emerald-500/[0.14] border border-emerald-500/20 text-xs font-medium text-emerald-300 transition-all active:scale-95"
        >
          <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
          Pay Alex's $80 Share
        </button>
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((msg) => {
          const tierMeta = getTierMetadata(msg.roast_tier);

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex flex-col ${msg.is_bot ? 'items-start' : 'items-start'} max-w-[90%] sm:max-w-[85%]`}
            >
              {/* Header Meta */}
              <div className="flex items-center gap-2 mb-1 pl-1">
                <span className="text-xs font-semibold text-zinc-300">{msg.sender_name}</span>
                <span className="text-[11px] text-zinc-500 font-mono">{msg.sender_handle}</span>
                <span className="text-[10px] text-zinc-600">• {msg.timestamp}</span>
                {msg.badge && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-amber-300 border border-white/10 font-medium">
                    {msg.badge}
                  </span>
                )}
              </div>

              {/* Chat Bubble Card */}
              <div
                className={`relative rounded-3xl p-4 text-sm leading-relaxed shadow-lg ${
                  msg.is_bot
                    ? 'bg-[#131724]/90 border border-white/[0.09] text-zinc-100 rounded-tl-sm'
                    : 'bg-gradient-to-br from-blue-950/40 to-indigo-950/40 border border-blue-500/20 text-zinc-100 rounded-tl-sm'
                }`}
              >
                {/* Escalation Tier Tag */}
                {tierMeta && (
                  <div className="mb-2.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide border ${tierMeta.color}`}>
                      <Flame className="w-3 h-3 text-current" />
                      {tierMeta.label}
                    </span>
                  </div>
                )}

                {/* Body Text */}
                <div className="whitespace-pre-line text-zinc-200">
                  {msg.text.split('**').map((part, i) =>
                    i % 2 === 1 ? <strong key={i} className="text-white font-semibold">{part}</strong> : part
                  )}
                </div>

                {/* Deadbeat Roast Poster (Tier 4 Showcase) */}
                {msg.roast_tier === 'PUBLIC_ROAST' && (
                  <div className="mt-3.5 p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/40 to-rose-950/40 border border-amber-500/30 flex items-center gap-3.5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 border border-amber-500/30 shrink-0">
                      <AlertTriangle className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                        Consensus Roast Mode: Active
                      </div>
                      <div className="text-xs text-white font-semibold">
                        Alex Rivera • $80.00 Outstanding
                      </div>
                      <div className="text-[11px] text-zinc-400 italic mt-0.5">
                        "Fronted villa debts do not settle themselves."
                      </div>
                    </div>
                  </div>
                )}

                {/* Interactive PayPal Buttons */}
                {msg.buttons && msg.buttons.length > 0 && (
                  <div className="mt-3.5 pt-3 border-t border-white/[0.08] flex flex-wrap gap-2">
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
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#0070E0] to-[#003087] hover:from-[#005ea6] hover:to-[#002566] shadow-md shadow-blue-500/25 transition-all active:scale-95 cursor-pointer"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        {btn.text}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Message Bar */}
      <form onSubmit={handleSubmit} className="p-3 bg-[#111420]/80 border-t border-white/[0.07] flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenReceiptModal}
          title="Scan Receipt with Gemini Vision"
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-400 hover:text-white transition-colors"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type like Sarah: e.g. 'Paid $90 for surf lessons split with Alex'..."
          className="flex-1 bg-zinc-950/80 border border-white/10 rounded-2xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500/70 transition-all"
        />

        <button
          type="submit"
          disabled={!inputText.trim() || isLoading}
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white shadow-lg shadow-blue-500/25 transition-all disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

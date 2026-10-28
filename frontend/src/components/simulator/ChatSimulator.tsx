import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Clock, Utensils, CreditCard } from 'lucide-react';
import type { ChatMessage, EscalationTier } from '../../types';

interface ChatSimulatorProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onSimulateExpense: () => void;
  onAdvanceTime: (hours: number) => void;
  onPayDebt: (userId: string, amountCents: number) => void;
  isLoading: boolean;
}

export const ChatSimulator: React.FC<ChatSimulatorProps> = ({
  messages,
  onSendMessage,
  onSimulateExpense,
  onAdvanceTime,
  onPayDebt,
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

  const renderTierBadge = (tier?: EscalationTier) => {
    switch (tier) {
      case 'POLITE_CONCIERGE':
        return <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-medium">Tier 1: Polite Concierge</span>;
      case 'PASSIVE_AGGRESSIVE':
        return <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium">Tier 2: Passive-Aggressive</span>;
      case 'DISAPPOINTED_PARENT':
        return <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-medium">Tier 3: Disappointed Parent</span>;
      case 'PUBLIC_ROAST':
        return <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full font-medium animate-pulse">Tier 4: Public Roast Card</span>;
      case 'ITINERARY_EMBARGO':
        return <span className="text-[10px] bg-red-600/30 text-red-300 border border-red-500/40 px-2 py-0.5 rounded-full font-medium">Tier 5: Itinerary Embargo</span>;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-[750px] bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Chat Header */}
      <div className="bg-gray-900/90 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center font-bold text-white shadow-md">
              🤠
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-gray-900" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 m-0">
              TripSheriff Telegram Bot
              <span className="px-1.5 py-0.2 text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded">
                Simulated Group Chat
              </span>
            </h3>
            <p className="text-[11px] text-gray-400 m-0">
              Bali Reunion 2026 • 3 Members (Sarah, Alex, Dave)
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] text-gray-400 font-mono">Channel: #bali-expenses</span>
        </div>
      </div>

      {/* Judge Quick Action Controls */}
      <div className="bg-gray-900/50 border-b border-gray-800 px-3 py-2 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold text-gray-400 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" /> Judge Triggers:
        </span>
        <button
          onClick={onSimulateExpense}
          disabled={isLoading}
          className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors"
        >
          <Utensils className="w-3 h-3 text-blue-400" />
          Simulate $150 Dinner
        </button>
        <button
          onClick={() => onAdvanceTime(24)}
          disabled={isLoading}
          className="text-xs bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-800/60 px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors"
        >
          <Clock className="w-3 h-3 text-amber-400" />
          Fast-Forward +24h
        </button>
        <button
          onClick={() => onPayDebt('user_02', 8000)}
          disabled={isLoading}
          className="text-xs bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-800/60 px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors"
        >
          <CreditCard className="w-3 h-3 text-emerald-400" />
          Test Pay Alex's $80 Share
        </button>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.is_bot ? 'items-start' : 'items-start'} max-w-[88%]`}
          >
            {/* Sender Meta */}
            <div className="flex items-center gap-2 mb-1 pl-1">
              <span className="text-xs font-semibold text-gray-300">{msg.sender_name}</span>
              <span className="text-[10px] text-gray-500 font-mono">{msg.sender_handle}</span>
              <span className="text-[10px] text-gray-600">• {msg.timestamp}</span>
              {msg.badge && (
                <span className="text-[9px] bg-gray-800 text-amber-400 px-1.5 py-0.5 rounded border border-gray-700 font-medium">
                  {msg.badge}
                </span>
              )}
            </div>

            {/* Bubble */}
            <div
              className={`rounded-2xl px-4 py-3 text-sm shadow-md transition-all ${
                msg.is_bot
                  ? 'bg-gradient-to-br from-gray-900 via-gray-900 to-gray-850 border border-amber-500/20 text-gray-100 rounded-tl-sm'
                  : 'bg-indigo-950/40 border border-indigo-800/40 text-gray-100 rounded-tl-sm'
              }`}
            >
              {msg.roast_tier && (
                <div className="mb-2">
                  {renderTierBadge(msg.roast_tier)}
                </div>
              )}

              {/* Message Content */}
              <div className="whitespace-pre-line leading-relaxed">
                {msg.text.split('**').map((part, i) =>
                  i % 2 === 1 ? <strong key={i} className="text-white font-semibold">{part}</strong> : part
                )}
              </div>

              {/* Deadbeat Roast Card (Tier 4 Meme Card) */}
              {msg.roast_tier === 'PUBLIC_ROAST' && (
                <div className="mt-3 p-3 bg-amber-950/30 border border-amber-600/40 rounded-xl flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl">
                    🏜️
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider m-0">
                      WANTED: DEADBEAT TRAVELER
                    </h4>
                    <p className="text-[11px] text-gray-300 m-0">
                      Target: <strong>Alex Rivera</strong> | Share: $80.00 USD
                    </p>
                    <p className="text-[10px] text-amber-300/80 m-0 italic">
                      "Spotted ordering mango mojitos on fronted villa credit"
                    </p>
                  </div>
                </div>
              )}

              {/* Interactive PayPal Buttons */}
              {msg.buttons && msg.buttons.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-gray-800/80">
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
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20 transition-all transform active:scale-95"
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
      <form onSubmit={handleSubmit} className="bg-gray-900 border-t border-gray-800 p-3 flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type like Sarah e.g. 'Paid $90 for scuba diving split with Alex'..."
          className="flex-1 bg-gray-950 border border-gray-700/80 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isLoading}
          className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-medium p-2.5 rounded-xl shadow-md transition-all disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

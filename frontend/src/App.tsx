import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Navbar } from './components/common/Navbar';
import { ChatSimulator } from './components/simulator/ChatSimulator';
import { LedgerPreview } from './components/simulator/LedgerPreview';
import { OrganizerDashboard } from './components/dashboard/OrganizerDashboard';
import { PayoutModal } from './components/settlement/PayoutModal';
import { apiClient } from './api/client';
import type { TripLedger, ChatMessage, PayPalEventLog } from './types';
import { INITIAL_LEDGER } from './api/mockData';
import { Sparkles } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'dashboard'>('simulator');
  const [ledger, setLedger] = useState<TripLedger>(INITIAL_LEDGER);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [paypalLogs, setPaypalLogs] = useState<PayPalEventLog[]>([]);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);

  // Initial data loading
  useEffect(() => {
    loadData();
    checkBackend();
    const interval = setInterval(checkBackend, 10000);
    return () => clearInterval(interval);
  }, []);

  const checkBackend = async () => {
    const isLive = await apiClient.checkBackendHealth();
    setIsBackendConnected(isLive);
  };

  const loadData = async () => {
    const [currLedger, currMessages, currLogs] = await Promise.all([
      apiClient.getTripLedger('trip_bali_2026'),
      apiClient.getChatMessages(),
      apiClient.getPayPalLogs(),
    ]);
    setLedger(currLedger);
    setMessages(currMessages);
    setPaypalLogs(currLogs);
  };

  const triggerCelebrationConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6'],
    });
  };

  // User sends custom message in chat
  const handleSendMessage = async (text: string) => {
    setIsLoading(true);
    try {
      await apiClient.postChatMessage('trip_bali_2026', text, 'user_01');
      await loadData();
    } finally {
      setIsLoading(false);
    }
  };

  // Judge simulator button: Simulate $150 Seafood dinner
  const handleSimulateExpense = async () => {
    setIsLoading(true);
    try {
      await apiClient.postChatMessage(
        'trip_bali_2026',
        'Paid $150 for seafood dinner split with @alex_travels and @dave_k',
        'user_01'
      );
      await loadData();
    } finally {
      setIsLoading(false);
    }
  };

  // Judge simulator button: Advance simulated time by +24h
  const handleAdvanceTime = async (hours: number = 24) => {
    setIsLoading(true);
    try {
      await apiClient.advanceSimulatedTime('trip_bali_2026', hours);
      await loadData();
    } finally {
      setIsLoading(false);
    }
  };

  // Settle Alex or Dave's debt via simulated PayPal checkout capture
  const handlePayDebt = async (userId: string, amountCents: number) => {
    setIsLoading(true);
    try {
      await apiClient.simulatePayPalCapture('trip_bali_2026', userId, amountCents);
      triggerCelebrationConfetti();
      await loadData();
    } finally {
      setIsLoading(false);
    }
  };

  // Organizer triggers batch payout
  const handleConfirmPayout = async () => {
    setIsLoading(true);
    try {
      await apiClient.confirmBatchPayout('trip_bali_2026');
      setIsPayoutModalOpen(false);
      triggerCelebrationConfetti();
      await loadData();
    } finally {
      setIsLoading(false);
    }
  };

  const organizer = ledger.members.find((m) => m.role === 'organizer') || ledger.members[0];
  const organizerOwedCents = Math.max(0, ledger.net_balances_cents[organizer.user_id] || 0);

  return (
    <div className="min-h-screen bg-[#090d16] text-gray-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hoursElapsed={ledger.hours_elapsed}
        isBackendConnected={isBackendConnected}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8">
        {/* Hackathon Judge Callout Banner */}
        <div className="mb-6 bg-gradient-to-r from-blue-950/40 via-indigo-950/40 to-purple-950/40 border border-blue-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white m-0">
                PayPal AI Hackathon 2026 Judge Simulator & AG Grid Portal
              </h2>
              <p className="text-xs text-gray-300 m-0 leading-normal">
                Test the complete agentic debt-collection loop in your browser without configuring Telegram. Zero floating-point rounding drift with integer cents.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/50 border border-cyan-800/60 px-2.5 py-1 rounded-lg">
              Sandbox Client: Ready
            </span>
          </div>
        </div>

        {/* Tab 1: Hosted Judge Web Simulator */}
        {activeTab === 'simulator' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Cols: Telegram Group Chat Simulator */}
            <div className="lg:col-span-7">
              <ChatSimulator
                messages={messages}
                onSendMessage={handleSendMessage}
                onSimulateExpense={handleSimulateExpense}
                onAdvanceTime={handleAdvanceTime}
                onPayDebt={handlePayDebt}
                isLoading={isLoading}
              />
            </div>

            {/* Right 5 Cols: Live Ledger & PayPal Event Stream */}
            <div className="lg:col-span-5">
              <LedgerPreview
                ledger={ledger}
                paypalLogs={paypalLogs}
                onTriggerPayout={() => setIsPayoutModalOpen(true)}
              />
            </div>
          </div>
        )}

        {/* Tab 2: AG Grid Organizer Portal */}
        {activeTab === 'dashboard' && (
          <OrganizerDashboard
            ledger={ledger}
            onTriggerPayout={() => setIsPayoutModalOpen(true)}
          />
        )}
      </main>

      {/* Payout Confirmation Modal (Task D Human-in-the-Loop) */}
      <PayoutModal
        isOpen={isPayoutModalOpen}
        onClose={() => setIsPayoutModalOpen(false)}
        onConfirm={handleConfirmPayout}
        organizer={organizer}
        amountCents={organizerOwedCents}
        isLoading={isLoading}
      />

      {/* Footer */}
      <footer className="border-t border-gray-800/80 bg-gray-950/80 px-4 py-4 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>🤠 <strong>TripSheriff AI</strong> — Built with PayPal Developer Platform & AG Grid</span>
          <span>Targeting: 1st Place Grand Prize, Agentic Commerce & AG Grid Sponsor Prize</span>
        </div>
      </footer>
    </div>
  );
}

export default App;

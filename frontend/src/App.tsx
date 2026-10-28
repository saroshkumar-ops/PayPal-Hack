import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Navbar } from './components/common/Navbar';
import { ChatSimulator } from './components/simulator/ChatSimulator';
import { LedgerPreview } from './components/simulator/LedgerPreview';
import { OrganizerDashboard } from './components/dashboard/OrganizerDashboard';
import { PayoutModal } from './components/settlement/PayoutModal';
import { ReceiptDropModal } from './components/bits/ReceiptDropModal';
import { 
  ledgerService, 
  chatService, 
  simulatorService, 
  paymentService, 
  checkHealth 
} from './api/services';
import type { TripLedger, ChatMessage, PayPalEventLog } from './types';
import { INITIAL_LEDGER } from './api/mockData';
import { Sparkles } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('simulator');
  const [ledger, setLedger] = useState<TripLedger>(INITIAL_LEDGER);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [paypalLogs, setPaypalLogs] = useState<PayPalEventLog[]>([]);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Initial data loading
  useEffect(() => {
    loadData();
    checkBackend();
    const interval = setInterval(checkBackend, 10000);
    return () => clearInterval(interval);
  }, []);

  const checkBackend = async () => {
    const isLive = await checkHealth();
    setIsBackendConnected(isLive);
  };

  const loadData = async () => {
    const [currLedger, currMessages, currLogs] = await Promise.all([
      ledgerService.getLedger('trip_bali_2026'),
      chatService.getMessages('trip_bali_2026'),
      paymentService.getLogs(),
    ]);
    setLedger(currLedger);
    setMessages(currMessages);
    setPaypalLogs(currLogs);
  };

  const triggerCelebrationConfetti = () => {
    confetti({
      particleCount: 110,
      spread: 75,
      origin: { y: 0.6 },
      colors: ['#0070E0', '#10B981', '#F59E0B', '#8B5CF6'],
    });
  };

  // User sends custom message in chat
  const handleSendMessage = async (text: string) => {
    setIsLoading(true);
    try {
      await chatService.sendMessage('trip_bali_2026', text, 'user_01');
      await loadData();
    } finally {
      setIsLoading(false);
    }
  };

  // Judge simulator button: Simulate $150 Seafood dinner
  const handleSimulateExpense = async () => {
    setIsLoading(true);
    try {
      await chatService.sendMessage(
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
      await simulatorService.advanceTime('trip_bali_2026', hours);
      await loadData();
    } finally {
      setIsLoading(false);
    }
  };

  // Settle Alex or Dave's debt via simulated PayPal checkout capture
  const handlePayDebt = async (userId: string, amountCents: number) => {
    setIsLoading(true);
    try {
      await paymentService.captureOrder('trip_bali_2026', userId, amountCents);
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
      await paymentService.confirmBatchPayout('trip_bali_2026');
      setIsPayoutModalOpen(false);
      triggerCelebrationConfetti();
      await loadData();
    } finally {
      setIsLoading(false);
    }
  };

  // Extracted receipt confirmed from modal
  const handleConfirmScannedExpense = async (description: string, amountCents: number) => {
    setIsLoading(true);
    try {
      await ledgerService.addExpense('trip_bali_2026', {
        description,
        amount_cents: amountCents,
        paid_by: 'user_01',
        category: 'FOOD',
      });
      await loadData();
    } finally {
      setIsLoading(false);
    }
  };

  const organizer = ledger.members.find((m) => m.role === 'organizer') || ledger.members[0];
  const organizerOwedCents = Math.max(0, ledger.net_balances_cents[organizer.user_id] || 0);

  return (
    <div className="min-h-screen bg-[#08090D] text-zinc-100 flex flex-col font-sans selection:bg-blue-500/30 selection:text-white relative overflow-x-hidden">
      {/* Ambient Dribbble-style Radial Glows */}
      <div className="pointer-events-none fixed -top-40 left-1/2 -translate-x-1/2 h-[450px] w-[900px] rounded-full bg-gradient-to-b from-blue-600/10 via-indigo-600/5 to-transparent blur-[140px]" />
      <div className="pointer-events-none fixed top-[40%] -right-40 h-[350px] w-[400px] rounded-full bg-purple-600/5 blur-[120px]" />

      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hoursElapsed={ledger.hours_elapsed}
        isBackendConnected={isBackendConnected}
        onOpenReceiptModal={() => setIsReceiptModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 relative z-10">
        {/* Judge Welcome Callout Pill */}
        <div className="mb-6 p-4 rounded-3xl bg-gradient-to-r from-[#0E1322]/80 via-[#121626]/80 to-[#161226]/80 border border-white/[0.08] backdrop-blur-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600/20 to-purple-600/20 text-blue-400 border border-blue-500/30 shrink-0">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white m-0">
                PayPal AI Hackathon 2026 Judge Simulator & Treasury Portal
              </h2>
              <p className="text-xs text-zinc-400 m-0 leading-normal">
                Autonomous debt collection loop on PayPal sandbox rails. Evaluated with integer-cent ledger precision.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsReceiptModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-xs font-semibold text-zinc-200 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              Upload Receipt
            </button>
            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 px-2.5 py-1.5 rounded-xl">
              Sandbox: Active
            </span>
          </div>
        </div>

        {/* Tab Content with Spring Fade Transition */}
        <AnimatePresence mode="wait">
          {activeTab === 'simulator' && (
            <motion.div
              key="simulator-tab"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              {/* Left 7 Cols: Telegram Group Chat Simulator */}
              <div className="lg:col-span-7">
                <ChatSimulator
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  onSimulateExpense={handleSimulateExpense}
                  onAdvanceTime={handleAdvanceTime}
                  onPayDebt={handlePayDebt}
                  onOpenReceiptModal={() => setIsReceiptModalOpen(true)}
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
            </motion.div>
          )}

          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard-tab"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              <OrganizerDashboard
                ledger={ledger}
                onTriggerPayout={() => setIsPayoutModalOpen(true)}
              />
            </motion.div>
          )}
        </AnimatePresence>
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

      {/* Multimodal Gemini Receipt Modal (Task G) */}
      <ReceiptDropModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        onConfirmExpense={handleConfirmScannedExpense}
      />

      {/* Minimalist Footer */}
      <footer className="border-t border-white/[0.06] bg-[#07080C] px-6 py-4 text-xs text-zinc-500 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <span>🤠 <strong>TripSheriff AI</strong> — Autonomous Group Travel Treasury</span>
          <span className="font-mono text-[11px] text-zinc-600">Built for PayPal AI Hackathon 2026 & AG Grid Sponsor Prize</span>
        </div>
      </footer>
    </div>
  );
}

export default App;

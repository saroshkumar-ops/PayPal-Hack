import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { VirtualTripCard } from './components/cards/VirtualTripCard';
import { TreasuryMetrics } from './components/cards/TreasuryMetrics';
import { EscalationGauge } from './components/cards/EscalationGauge';
import { ChatSimulator } from './components/simulator/ChatSimulator';
import { LedgerPreview } from './components/simulator/LedgerPreview';
import { OrganizerDashboard } from './components/dashboard/OrganizerDashboard';
import { PayoutModal } from './components/settlement/PayoutModal';
import { ReceiptDropModal } from './components/bits/ReceiptDropModal';
import { PayPalCheckoutDrawer } from './components/checkout/PayPalCheckoutDrawer';

import { 
  ledgerService, 
  chatService, 
  simulatorService, 
  paymentService, 
  checkHealth 
} from './api/services';
import type { TripLedger, ChatMessage, PayPalEventLog } from './types';
import { INITIAL_LEDGER } from './api/mockData';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('simulator');
  const [ledger, setLedger] = useState<TripLedger>(INITIAL_LEDGER);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [paypalLogs, setPaypalLogs] = useState<PayPalEventLog[]>([]);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Modals state
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [checkoutDrawer, setCheckoutDrawer] = useState<{
    isOpen: boolean;
    debtorName: string;
    debtorHandle: string;
    creditorName: string;
    description: string;
    amountCents: number;
    userId: string;
  }>({
    isOpen: false,
    debtorName: 'Alex Rivera',
    debtorHandle: '@alex_travels',
    creditorName: 'Sarah Chen',
    description: 'Sunset Villa Deposit Share',
    amountCents: 8000,
    userId: 'user_02',
  });

  // Load data on startup
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
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#0070E0', '#10B981', '#F59E0B', '#8B5CF6'],
    });
  };

  // Chat message send
  const handleSendMessage = async (text: string) => {
    setIsLoading(true);
    try {
      await chatService.sendMessage('trip_bali_2026', text, 'user_01');
      await loadData();
    } finally {
      setIsLoading(false);
    }
  };

  // Simulate $150 dinner
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

  // Advance time +24h
  const handleAdvanceTime = async (hours: number = 24) => {
    setIsLoading(true);
    try {
      await simulatorService.advanceTime('trip_bali_2026', hours);
      await loadData();
    } finally {
      setIsLoading(false);
    }
  };

  // Open the interactive PayPal Express Checkout Sheet
  const handleOpenCheckout = (userId: string, amountCents: number) => {
    const debtor = ledger.members.find(m => m.user_id === userId) || ledger.members[1];
    const creditor = ledger.members.find(m => m.user_id === 'user_01') || ledger.members[0];

    setCheckoutDrawer({
      isOpen: true,
      debtorName: debtor.name,
      debtorHandle: debtor.handle,
      creditorName: creditor.name,
      description: 'Sunset Villa Deposit Share',
      amountCents,
      userId,
    });
  };

  // Confirm payment in PayPal Drawer
  const handleExecutePayment = async () => {
    await paymentService.captureOrder('trip_bali_2026', checkoutDrawer.userId, checkoutDrawer.amountCents);
    triggerCelebrationConfetti();
    await loadData();
  };

  // Batch Payout confirmation
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

  // Scanned receipt confirmed from modal
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

  // Metrics computation
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
  const organizer = ledger.members.find((m) => m.role === 'organizer') || ledger.members[0];
  const alexDebtor = ledger.members.find((m) => m.user_id === 'user_02') || ledger.members[1];
  const organizerOwedCents = Math.max(0, ledger.net_balances_cents[organizer.user_id] || 0);

  return (
    <div className="min-h-screen bg-[#08090D] text-zinc-100 flex flex-row font-sans selection:bg-blue-500/30 selection:text-white relative overflow-x-hidden">
      {/* Ambient Dribbble-style Radial Glows */}
      <div className="pointer-events-none fixed -top-40 left-1/3 -translate-x-1/2 h-[450px] w-[800px] rounded-full bg-gradient-to-b from-blue-600/10 via-indigo-600/5 to-transparent blur-[140px]" />
      <div className="pointer-events-none fixed top-1/2 -right-40 h-[350px] w-[400px] rounded-full bg-purple-600/5 blur-[120px]" />

      {/* Left Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        organizer={organizer}
        onOpenReceiptModal={() => setIsReceiptModalOpen(true)}
        onFastForward={() => handleAdvanceTime(24)}
        onPayout={() => setIsPayoutModalOpen(true)}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          tripName={ledger.trip_name}
          hoursElapsed={ledger.hours_elapsed}
          isBackendConnected={isBackendConnected}
          onOpenReceiptModal={() => setIsReceiptModalOpen(true)}
          onFastForward={() => handleAdvanceTime(24)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Top Bento Row: Virtual Card + Treasury Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* 3D Virtual Card (5 cols) */}
            <div className="lg:col-span-5">
              <VirtualTripCard
                balanceCents={organizerOwedCents}
                tripName={ledger.trip_name}
                organizerName={organizer.name}
                onPayout={() => setIsPayoutModalOpen(true)}
              />
            </div>

            {/* Treasury Metrics Overview (7 cols) */}
            <div className="lg:col-span-7">
              <TreasuryMetrics
                totalSpend={(totalSpendCents / 100).toFixed(2)}
                settledAmount={(settledCents / 100).toFixed(2)}
                pendingAmount={(pendingCents / 100).toFixed(2)}
                settledPercentage={settledPercentage}
                memberCount={ledger.members.length}
                onAddExpense={handleSimulateExpense}
                onFastForward={() => handleAdvanceTime(24)}
                onScanReceipt={() => setIsReceiptModalOpen(true)}
              />
            </div>
          </div>

          {/* Core Workspace Switcher */}
          <AnimatePresence mode="wait">
            {activeTab === 'simulator' && (
              <motion.div
                key="simulator-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6"
              >
                {/* Left 7 Cols: Telegram Chat Simulator with 1-Click PayPal buttons */}
                <div className="lg:col-span-7">
                  <ChatSimulator
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    onSimulateExpense={handleSimulateExpense}
                    onAdvanceTime={handleAdvanceTime}
                    onPayDebt={handleOpenCheckout}
                    onOpenReceiptModal={() => setIsReceiptModalOpen(true)}
                    isLoading={isLoading}
                  />
                </div>

                {/* Right 5 Cols: Debt Heat Gauge & Live PayPal Webhook Ledger */}
                <div className="lg:col-span-5 space-y-5">
                  <EscalationGauge
                    debtor={alexDebtor}
                    amountCents={8000}
                    hoursOverdue={ledger.hours_elapsed}
                    currentTier={alexDebtor.tier}
                    onAdvanceTier={() => handleAdvanceTime(24)}
                  />

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
                key="dashboard-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
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

        {/* Minimalist Footer */}
        <footer className="border-t border-white/[0.06] bg-[#07080C] px-6 py-4 text-xs text-zinc-500">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
            <span>🤠 <strong>TripSheriff AI</strong> — Autonomous Group Travel Treasury</span>
            <span className="font-mono text-[11px] text-zinc-500">
              PayPal AI Hackathon 2026 • AG Grid Sponsor Candidate
            </span>
          </div>
        </footer>
      </div>

      {/* Modals & Drawers */}
      <PayPalCheckoutDrawer
        isOpen={checkoutDrawer.isOpen}
        onClose={() => setCheckoutDrawer(prev => ({ ...prev, isOpen: false }))}
        debtorName={checkoutDrawer.debtorName}
        debtorHandle={checkoutDrawer.debtorHandle}
        creditorName={checkoutDrawer.creditorName}
        description={checkoutDrawer.description}
        amountCents={checkoutDrawer.amountCents}
        onConfirmPayment={handleExecutePayment}
      />

      <PayoutModal
        isOpen={isPayoutModalOpen}
        onClose={() => setIsPayoutModalOpen(false)}
        onConfirm={handleConfirmPayout}
        organizer={organizer}
        amountCents={organizerOwedCents}
        isLoading={isLoading}
      />

      <ReceiptDropModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        onConfirmExpense={handleConfirmScannedExpense}
      />
    </div>
  );
}

export default App;

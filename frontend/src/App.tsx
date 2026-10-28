import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import confetti from 'canvas-confetti';

import { Navbar } from './components/layout/Navbar';
import { OverviewPage } from './pages/OverviewPage';
import { SimulatorPage } from './pages/SimulatorPage';
import { LedgerPage } from './pages/LedgerPage';
import { PayoutsPage } from './pages/PayoutsPage';

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
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#4E6A83', '#8199AE', '#B7C6D3', '#E7EDF2'],
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

  const organizer = ledger.members.find((m) => m.role === 'organizer') || ledger.members[0];
  const organizerOwedCents = Math.max(0, ledger.net_balances_cents[organizer.user_id] || 0);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#10161C] text-[#B7C6D3] flex flex-col font-sans selection:bg-[#4E6A83]/40 selection:text-[#E7EDF2]">
        {/* Minimalist Top Navbar */}
        <Navbar
          hoursElapsed={ledger.hours_elapsed}
          isBackendConnected={isBackendConnected}
          onOpenReceiptModal={() => setIsReceiptModalOpen(true)}
        />

        {/* Multi-Page Routes */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Routes>
            <Route
              path="/"
              element={
                <OverviewPage
                  ledger={ledger}
                  onSimulateExpense={handleSimulateExpense}
                  onAdvanceTime={() => handleAdvanceTime(24)}
                  onOpenReceiptModal={() => setIsReceiptModalOpen(true)}
                  onOpenPayoutModal={() => setIsPayoutModalOpen(true)}
                />
              }
            />
            <Route
              path="/simulator"
              element={
                <SimulatorPage
                  ledger={ledger}
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  onSimulateExpense={handleSimulateExpense}
                  onAdvanceTime={handleAdvanceTime}
                  onPayDebt={handleOpenCheckout}
                  onOpenReceiptModal={() => setIsReceiptModalOpen(true)}
                  isLoading={isLoading}
                />
              }
            />
            <Route
              path="/ledger"
              element={<LedgerPage ledger={ledger} />}
            />
            <Route
              path="/payouts"
              element={
                <PayoutsPage
                  ledger={ledger}
                  paypalLogs={paypalLogs}
                  onOpenPayoutModal={() => setIsPayoutModalOpen(true)}
                />
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* Minimalist Footer */}
        <footer className="border-t border-[#33475A] bg-[#10161C] px-6 py-4 text-xs text-[#8199AE]">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
            <span>TripSheriff AI — Group Travel Treasury & Debt Enforcement Agent</span>
            <span className="font-mono text-[11px] text-[#8199AE]">
              PayPal AI Hackathon 2026 • Integer Cents Math Core
            </span>
          </div>
        </footer>

        {/* Drawers & Modals */}
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
    </BrowserRouter>
  );
}

export default App;

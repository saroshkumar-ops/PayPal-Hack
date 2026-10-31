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
  expenseService,
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
    expenseId?: string;
  }>({
    isOpen: false,
    debtorName: 'Alex Rivera',
    debtorHandle: '@alex_travels',
    creditorName: 'Sarah Chen',
    description: 'Sunset Villa Deposit Share',
    amountCents: 8000,
    userId: 'user_02',
    expenseId: 'exp_8821',
  });

  // Load data on startup
  useEffect(() => {
    loadData();
    checkBackend();
    const interval = setInterval(checkBackend, 10000);
    return () => clearInterval(interval);
  }, []);

  const checkBackend = async () => {
    const health = await checkHealth();
    setIsBackendConnected(health.backend);
  };

  const loadData = async () => {
    // Attempt auto-seeding if backend is active
    await ledgerService.autoBootstrapTrip('trip_bali_2026');

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

  // Chat message send (uses Python AI Intent Decider & Java backend)
  const handleSendMessage = async (text: string) => {
    setIsLoading(true);
    try {
      await chatService.sendMessage('trip_bali_2026', text, 'user_01');
      await loadData();
    } finally {
      setIsLoading(false);
    }
  };

  // Simulate $150 Jimbaran Seafood Dinner
  const handleSimulateExpense = async () => {
    setIsLoading(true);
    try {
      await expenseService.createExpense('trip_bali_2026', {
        paid_by: 'user_01',
        amount_cents: 15000,
        description: 'Jimbaran Seafood Beach Dinner',
        category: 'FOOD',
        split_type: 'EQUAL',
      });
      await loadData();
    } finally {
      setIsLoading(false);
    }
  };

  // Advance virtual time +24h (Task C Sim-Time & Task F AI Escalation Roast)
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
  const handleOpenCheckout = (userId: string, amountCents: number, expenseId?: string) => {
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
      expenseId: expenseId || 'exp_8821',
    });
  };

  // Confirm payment in PayPal Drawer (Executes Orders API v2 & Capture Flow)
  const handleExecutePayment = async () => {
    await paymentService.captureDebtorSplit(
      'trip_bali_2026', 
      checkoutDrawer.userId, 
      checkoutDrawer.amountCents, 
      checkoutDrawer.expenseId || 'exp_8821'
    );
    triggerCelebrationConfetti();
    await loadData();
  };

  // Batch Payout confirmation (Task D)
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

  // Scanned receipt confirmed from modal (Gemini Vision OCR line items)
  const handleConfirmScannedExpense = async (
    description: string, 
    amountCents: number,
    items?: { name: string; priceCents: number; claimedBy?: string }[]
  ) => {
    setIsLoading(true);
    try {
      const itemClaims = items?.map(item => ({
        name: item.name,
        price_cents: item.priceCents,
        claimed_by_user_ids: [item.claimedBy === 'Alex' ? 'user_02' : item.claimedBy === 'Dave' ? 'user_03' : 'user_01'],
      }));

      await expenseService.createExpense('trip_bali_2026', {
        paid_by: 'user_01',
        amount_cents: amountCents,
        description,
        category: 'FOOD',
        split_type: itemClaims && itemClaims.length > 0 ? 'ITEMIZED' : 'EQUAL',
        items: itemClaims,
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
        <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-4 sm:py-6 pb-24 md:pb-8 flex flex-col">
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
        <footer className="border-t border-[#33475A] bg-[#10161C] px-4 sm:px-6 lg:px-8 xl:px-10 py-4 text-xs text-[#8199AE]">
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
            <span>TripSheriff AI — Group Travel Treasury & Debt Enforcement Agent</span>
            <span className="font-mono text-[11px] text-[#8199AE]">
              PayPal AI Hackathon 2026 • Java Core Port 8080 • Python AI Port 8001
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

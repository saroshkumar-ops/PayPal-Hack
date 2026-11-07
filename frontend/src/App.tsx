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
import { CyberBackground } from './components/common/CyberBackground';
import { LenisProvider } from './components/common/LenisProvider';

import { 
  ledgerService, 
  expenseService,
  chatService, 
  simulatorService, 
  paymentService, 
  demoService,
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
    debtorName: 'Alex Hunter',
    debtorHandle: '@alex_travels',
    creditorName: 'Sarah Connor',
    description: 'Sunset Cliffside Villa Deposit Share',
    amountCents: 6000,
    userId: 'user_alex',
    expenseId: 'exp_villa_demo_01',
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
    try {
      await ledgerService.autoBootstrapTrip('trip_bali_2026');

      const [currLedger, currMessages, currLogs] = await Promise.all([
        ledgerService.getLedger('trip_bali_2026'),
        chatService.getMessages('trip_bali_2026'),
        paymentService.getLogs(),
      ]);
      setLedger(currLedger);
      setMessages(currMessages);
      setPaypalLogs(currLogs);
    } catch (err) {
      console.warn('Initial data load falling back to local state:', err);
    }
  };

  const triggerCelebrationConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#C6FF3D', '#38E1FF', '#FFC439', '#EDEEF2'],
    });
  };

  // Seed showcase demo trip (Sarah, Alex, Dave, Priya)
  const handleSeedDemo = async () => {
    setIsLoading(true);
    try {
      const res = await demoService.seedDemo();
      if (res && res.ledger) {
        setLedger(res.ledger);
      } else {
        await loadData();
      }
      triggerCelebrationConfetti();
    } catch (err) {
      console.error('Failed to trigger demo seed:', err);
      await loadData();
    } finally {
      setIsLoading(false);
    }
  };

  // Chat message send
  const handleSendMessage = async (text: string) => {
    setIsLoading(true);
    try {
      await chatService.sendMessage('trip_bali_2026', text, 'user_sarah');
      await loadData();
    } finally {
      setIsLoading(false);
    }
  };

  // Advance virtual time +24h
  const handleAdvanceTime = async (hours: number = 24) => {
    setIsLoading(true);
    try {
      const res = await simulatorService.advanceTime('trip_bali_2026', hours);
      await loadData();
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  // Open Checkout Drawer
  const handleOpenCheckout = (userId: string, amountCents: number, expenseId?: string) => {
    const debtor = ledger.members.find((m) => m.user_id === userId);
    const creditor = ledger.members.find((m) => m.role === 'organizer') || ledger.members[0];

    setCheckoutDrawer({
      isOpen: true,
      debtorName: debtor ? debtor.name : 'Alex Hunter',
      debtorHandle: debtor ? debtor.handle : '@alex_travels',
      creditorName: creditor ? creditor.name : 'Sarah Connor',
      description: 'Trip Settlement via PayPal Escrow',
      amountCents: amountCents,
      userId: userId,
      expenseId: expenseId || 'exp_villa_demo_01',
    });
  };

  // Execute payment settlement
  const handleExecutePayment = async () => {
    setIsLoading(true);
    try {
      await paymentService.captureDebtorSplit(
        'trip_bali_2026',
        checkoutDrawer.userId,
        checkoutDrawer.amountCents,
        checkoutDrawer.expenseId
      );
      await loadData();
      setCheckoutDrawer((prev) => ({ ...prev, isOpen: false }));
      triggerCelebrationConfetti();
    } finally {
      setIsLoading(false);
    }
  };

  // Confirm Scanned Expense
  const handleConfirmScannedExpense = async (
    description: string,
    amountCents: number,
    items?: { name: string; priceCents: number; claimedBy?: string }[]
  ) => {
    setIsLoading(true);
    try {
      await expenseService.createExpense('trip_bali_2026', {
        paid_by: 'user_sarah',
        amount_cents: amountCents,
        description: description,
        category: 'FOOD',
        split_type: items && items.length > 0 ? 'ITEMIZED' : 'EQUAL',
      });
      await loadData();
      setIsReceiptModalOpen(false);
      triggerCelebrationConfetti();
    } finally {
      setIsLoading(false);
    }
  };

  // Confirm Payout
  const handleConfirmPayout = async () => {
    setIsLoading(true);
    try {
      await paymentService.confirmBatchPayout('trip_bali_2026');
      await loadData();
      setIsPayoutModalOpen(false);
      triggerCelebrationConfetti();
    } finally {
      setIsLoading(false);
    }
  };

  const organizer = ledger.members.find((m) => m.role === 'organizer') || ledger.members[0];
  const organizerOwedCents = Math.max(0, ledger.net_balances_cents[organizer.user_id] || 0);

  return (
    <LenisProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-[#07080D] text-[#EDEEF2] flex flex-col font-body selection:bg-[#C6FF3D]/20 selection:text-[#C6FF3D] relative">
          {/* Subtle Cyber Grid & Grain Background Layer */}
          <CyberBackground />

          {/* Top Cyber Ledger Navbar */}
          <Navbar
            hoursElapsed={ledger.hours_elapsed}
            isBackendConnected={isBackendConnected}
            onOpenReceiptModal={() => setIsReceiptModalOpen(true)}
            onSeedDemo={handleSeedDemo}
          />

          {/* Multi-Page Routes */}
          <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-5 pb-24 md:pb-10 flex flex-col z-10">
            <Routes>
              <Route
                path="/"
                element={
                  <OverviewPage
                    ledger={ledger}
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

          {/* Minimalist Cyber Ledger Footer */}
          <footer className="border-t border-white/8 bg-[#07080D]/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-4 text-xs text-[#8A8FA3] z-10">
            <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
              <span className="font-display font-medium text-[#EDEEF2]">
                TripSheriff <span className="text-[#C6FF3D] font-mono text-[10px]">CYBER LEDGER</span>
              </span>
              <span className="font-mono text-[11px] text-[#8A8FA3]">
                PayPal AI Hackathon 2026 • Deterministic Zero-Drift Treasury • Spring Boot & Gemini
              </span>
            </div>
          </footer>

          {/* Drawers & Modals */}
          <PayPalCheckoutDrawer
            isOpen={checkoutDrawer.isOpen}
            onClose={() => setCheckoutDrawer((prev) => ({ ...prev, isOpen: false }))}
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
            members={ledger.members}
            onConfirmExpense={handleConfirmScannedExpense}
          />
        </div>
      </BrowserRouter>
    </LenisProvider>
  );
}

export default App;

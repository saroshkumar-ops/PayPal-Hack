import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import confetti from 'canvas-confetti';

import { Navbar } from './components/layout/Navbar';
import { OverviewPage } from './pages/OverviewPage';
import { SimulatorPage } from './pages/SimulatorPage';
import { LedgerPage } from './pages/LedgerPage';
import { PayoutsPage } from './pages/PayoutsPage';
import { PartyOnboarding } from './components/party/PartyOnboarding';
import { LandingIntro } from './components/landing/LandingIntro';

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
  checkHealth 
} from './api/services';
import type { TripLedger, ChatMessage, PayPalEventLog } from './types';
import { EMPTY_LEDGER } from './api/mockData';

export function App() {
  const [activeTripId, setActiveTripId] = useState<string | null>(() => {
    return localStorage.getItem('active_trip_id');
  });
  const [landingMode, setLandingMode] = useState<'intro' | 'create'>('intro');

  const [ledger, setLedger] = useState<TripLedger>(EMPTY_LEDGER);
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
    debtorName: '',
    debtorHandle: '',
    creditorName: '',
    description: '',
    amountCents: 0,
    userId: '',
    expenseId: undefined,
  });

  const triggerCelebrationConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#C6FF3D', '#38E1FF', '#FFC439', '#EDEEF2'],
    });
  };

  const checkBackend = async () => {
    const health = await checkHealth();
    setIsBackendConnected(health.backend);
  };

  const loadData = useCallback(async (tripIdToLoad?: string) => {
    const targetTripId = tripIdToLoad || activeTripId;
    if (!targetTripId) return;

    try {
      const [currLedger, currMessages, currLogs] = await Promise.all([
        ledgerService.getLedger(targetTripId),
        chatService.getMessages(targetTripId),
        paymentService.getLogs(),
      ]);

      if (currLedger && currLedger.members && currLedger.members.length > 0) {
        setLedger(currLedger);
        setMessages(currMessages);
        setPaypalLogs(currLogs);
      } else {
        // Trip does not exist or has no members
        setLedger(EMPTY_LEDGER);
      }
    } catch (err) {
      console.warn('Data load error:', err);
    }
  }, [activeTripId]);

  // Check health and load initial trip if exists
  useEffect(() => {
    checkBackend();
    const interval = setInterval(checkBackend, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTripId) {
      loadData(activeTripId);
    }
  }, [activeTripId, loadData]);

  // Handle new party creation from onboarding
  const handlePartyCreated = (newLedger: TripLedger, newTripId: string) => {
    localStorage.setItem('active_trip_id', newTripId);
    setActiveTripId(newTripId);
    setLedger(newLedger);
    triggerCelebrationConfetti();
  };

  // Reset/switch to new party
  const handleCreateNewParty = () => {
    localStorage.removeItem('active_trip_id');
    setActiveTripId(null);
    setLedger(EMPTY_LEDGER);
    setMessages([]);
    setLandingMode('create');
  };

  const currentTripId = ledger.trip_id || activeTripId || '';
  const organizer = ledger.members.find((m) => m.role === 'organizer') || ledger.members[0];
  const organizerId = organizer?.user_id || 'organizer';
  const organizerOwedCents = organizer ? Math.max(0, ledger.net_balances_cents[organizer.user_id] || 0) : 0;

  // Chat message send
  const handleSendMessage = async (text: string) => {
    if (!currentTripId) return;
    setIsLoading(true);
    try {
      await chatService.sendMessage(currentTripId, text, organizerId);
      await loadData();
    } finally {
      setIsLoading(false);
    }
  };

  // Advance virtual time +24h
  const handleAdvanceTime = async (hours: number = 24) => {
    if (!currentTripId) return;
    setIsLoading(true);
    try {
      const res = await simulatorService.advanceTime(currentTripId, hours);
      await loadData();
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  // Open Checkout Drawer
  const handleOpenCheckout = (userId: string, amountCents: number, expenseId?: string) => {
    const debtor = ledger.members.find((m) => m.user_id === userId);
    const creditor = organizer;

    setCheckoutDrawer({
      isOpen: true,
      debtorName: debtor ? debtor.name : 'Party Member',
      debtorHandle: debtor ? debtor.handle : '@member',
      creditorName: creditor ? creditor.name : 'Organizer',
      description: 'Trip Settlement via PayPal Escrow',
      amountCents: amountCents,
      userId: userId,
      expenseId: expenseId,
    });
  };

  // Execute payment settlement
  const handleExecutePayment = async () => {
    if (!currentTripId) return;
    setIsLoading(true);
    try {
      await paymentService.captureDebtorSplit(
        currentTripId,
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
    if (!currentTripId) return;
    setIsLoading(true);
    try {
      await expenseService.createExpense(currentTripId, {
        paid_by: organizerId,
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
    if (!currentTripId) return;
    setIsLoading(true);
    try {
      await paymentService.confirmBatchPayout(currentTripId);
      await loadData();
      setIsPayoutModalOpen(false);
      triggerCelebrationConfetti();
    } finally {
      setIsLoading(false);
    }
  };

  // If no party has been created yet, show Landing Intro or Party Onboarding
  if (!activeTripId || !ledger.trip_id || ledger.members.length === 0) {
    return (
      <LenisProvider>
        <div className="min-h-screen bg-[#07080D] text-[#EDEEF2] flex flex-col font-body selection:bg-[#C6FF3D]/20 selection:text-[#C6FF3D] relative justify-center">
          <CyberBackground />
          <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col justify-center items-center z-10">
            {landingMode === 'intro' ? (
              <LandingIntro
                onCreateParty={() => setLandingMode('create')}
              />
            ) : (
              <PartyOnboarding
                onPartyCreated={handlePartyCreated}
                onBackToIntro={() => setLandingMode('intro')}
              />
            )}
          </main>
        </div>
      </LenisProvider>
    );
  }

  return (
    <LenisProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-[#07080D] text-[#EDEEF2] flex flex-col font-body selection:bg-[#C6FF3D]/20 selection:text-[#C6FF3D] relative">
          {/* Subtle Cyber Grid & Grain Background Layer */}
          <CyberBackground />

          {/* Top Cyber Ledger Navbar */}
          <Navbar
            tripName={ledger.trip_name || ledger.name}
            hoursElapsed={ledger.hours_elapsed}
            isBackendConnected={isBackendConnected}
            onOpenReceiptModal={() => setIsReceiptModalOpen(true)}
            onNewParty={handleCreateNewParty}
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
              <div className="flex items-center gap-3 font-mono text-[11px]">
                <button
                  onClick={handleCreateNewParty}
                  className="text-[#8A8FA3] hover:text-[#C6FF3D] transition-colors cursor-pointer"
                >
                  Create New Party
                </button>
                <span>•</span>
                <span>Active Party: {ledger.trip_name || ledger.name}</span>
              </div>
            </div>
          </footer>

          {/* Checkout & Settlement Drawers */}
          <PayPalCheckoutDrawer
            isOpen={checkoutDrawer.isOpen}
            onClose={() => setCheckoutDrawer((prev) => ({ ...prev, isOpen: false }))}
            debtorName={checkoutDrawer.debtorName}
            debtorHandle={checkoutDrawer.debtorHandle}
            creditorName={checkoutDrawer.creditorName}
            description={checkoutDrawer.description}
            amountCents={checkoutDrawer.amountCents}
            currency={ledger.currency}
            onConfirmPayment={handleExecutePayment}
          />

          {organizer && (
            <PayoutModal
              isOpen={isPayoutModalOpen}
              onClose={() => setIsPayoutModalOpen(false)}
              onConfirm={handleConfirmPayout}
              organizer={organizer}
              amountCents={organizerOwedCents}
              currency={ledger.currency}
              isLoading={isLoading}
            />
          )}

          <ReceiptDropModal
            isOpen={isReceiptModalOpen}
            onClose={() => setIsReceiptModalOpen(false)}
            currency={ledger.currency}
            members={ledger.members}
            onConfirmExpense={handleConfirmScannedExpense}
          />
        </div>
      </BrowserRouter>
    </LenisProvider>
  );
}

export default App;

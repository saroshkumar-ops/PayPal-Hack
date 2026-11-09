import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import confetti from 'canvas-confetti';

import { Navbar } from './components/layout/Navbar';
import { OverviewPage } from './pages/OverviewPage';
import { SimulatorPage } from './pages/SimulatorPage';
import { LedgerPage } from './pages/LedgerPage';
import { PayoutsPage } from './pages/PayoutsPage';
import { LoginPage } from './pages/LoginPage';

import { PayoutModal } from './components/settlement/PayoutModal';
import { ReceiptDropModal } from './components/bits/ReceiptDropModal';
import { CreatePartyModal } from './components/bits/CreatePartyModal';
import { PayPalCheckoutDrawer } from './components/checkout/PayPalCheckoutDrawer';
import { LenisProvider } from './components/common/LenisProvider';

import { 
  ledgerService, 
  expenseService,
  chatService, 
  simulatorService, 
  paymentService, 
  authService,
  tripService,
  memberService
} from './api/services';
import type { TripLedger, ChatMessage, PayPalEventLog, ItemClaimDto, AuthResponseDto } from './types';
import { EMPTY_LEDGER } from './api/mockData';

export function App() {
  // Authentication state
  const [currentUser, setCurrentUser] = useState<AuthResponseDto | null>(() => {
    return authService.getCurrentUser();
  });
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  const [activeTripId, setActiveTripId] = useState<string | null>(() => {
    return localStorage.getItem('active_trip_id');
  });

  const [ledger, setLedger] = useState<TripLedger>(EMPTY_LEDGER);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [paypalLogs, setPaypalLogs] = useState<PayPalEventLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modals state
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isCreatePartyModalOpen, setIsCreatePartyModalOpen] = useState(false);
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
        setLedger(EMPTY_LEDGER);
      }
    } catch (err) {
      console.warn('Data load error:', err);
    }
  }, [activeTripId]);

  // Ensure an active party exists for the logged in user
  const ensureUserParty = useCallback(async (user: AuthResponseDto) => {
    try {
      const savedTripId = localStorage.getItem('active_trip_id');
      if (savedTripId) {
        try {
          const l = await ledgerService.getLedger(savedTripId);
          if (l && l.trip_id && l.members && l.members.length > 0) {
            setActiveTripId(savedTripId);
            setLedger(l);
            return;
          }
        } catch {}
      }

      // Check existing trips from backend
      const trips = await tripService.getAllTrips();
      if (trips && trips.length > 0) {
        const lastTrip = trips[trips.length - 1];
        localStorage.setItem('active_trip_id', lastTrip.trip_id);
        setActiveTripId(lastTrip.trip_id);
        const l = await ledgerService.getLedger(lastTrip.trip_id);
        setLedger(l);
        return;
      }

      // If no trips exist in backend, create initial party for the user
      const safeSlug = (user.name || 'User').toLowerCase().replace(/[^a-z0-9]/g, '_');
      const newTripId = `party_${safeSlug}_${Date.now().toString(36).slice(-4)}`;
      const tripName = `${user.name || 'User'}'s Party`;
      await tripService.createTrip({
        trip_id: newTripId,
        name: tripName,
        currency: 'INR',
      });
      await memberService.addMember(newTripId, {
        user_id: user.user_id,
        name: user.name,
        handle: user.handle || `@${safeSlug}`,
        paypal_email: user.paypal_email || user.email,
        role: 'ORGANIZER',
        roast_consent: 'SPICY',
      });
      localStorage.setItem('active_trip_id', newTripId);
      setActiveTripId(newTripId);
      const l = await ledgerService.getLedger(newTripId);
      setLedger(l);
    } catch (err) {
      console.warn('ensureUserParty error:', err);
    }
  }, []);

  // Verify auth on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setCurrentUser(null);
      setIsAuthChecking(false);
      return;
    }
    authService.getProfile()
      .then((profile) => {
        if (profile) {
          setCurrentUser(profile);
          ensureUserParty(profile);
        } else {
          setCurrentUser(null);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
        }
      })
      .catch(() => {
        const cached = authService.getCurrentUser();
        if (cached) {
          setCurrentUser(cached);
          ensureUserParty(cached);
        } else {
          setCurrentUser(null);
        }
      })
      .finally(() => {
        setIsAuthChecking(false);
      });
  }, [ensureUserParty]);

  useEffect(() => {
    if (activeTripId) {
      loadData(activeTripId);
    }
  }, [activeTripId, loadData]);

  const handleLoginSuccess = async (user: AuthResponseDto) => {
    setCurrentUser(user);
    triggerCelebrationConfetti();
    await ensureUserParty(user);
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    localStorage.removeItem('active_trip_id');
    setActiveTripId(null);
    setLedger(EMPTY_LEDGER);
    setMessages([]);
  };

  const handleCreateNewParty = async (name: string, currency: 'USD' | 'INR') => {
    if (!currentUser) return;
    const safeSlug = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const newTripId = `party_${safeSlug}_${Date.now().toString(36).slice(-4)}`;

    await tripService.createTrip({
      trip_id: newTripId,
      name: name,
      currency: currency,
    });

    await memberService.addMember(newTripId, {
      user_id: currentUser.user_id,
      name: currentUser.name,
      handle: currentUser.handle || `@${safeSlug}`,
      paypal_email: currentUser.paypal_email || currentUser.email,
      role: 'ORGANIZER',
      roast_consent: 'SPICY',
    });

    localStorage.setItem('active_trip_id', newTripId);
    setActiveTripId(newTripId);
    await loadData(newTripId);
    triggerCelebrationConfetti();
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
      await chatService.sendMessage(currentTripId, text, organizerId, ledger.members);
      await loadData(currentTripId);
    } catch (err) {
      console.error('Failed to send message:', err);
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
      await loadData(currentTripId);
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
      await loadData(currentTripId);
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
    items?: { name: string; priceCents: number; claimedBy?: string }[],
    taxCents?: number,
    tipCents?: number
  ) => {
    if (!currentTripId) return;
    setIsLoading(true);
    try {
      let formattedItems: ItemClaimDto[] | undefined = undefined;
      if (items && items.length > 0) {
        formattedItems = items.map((it) => {
          const matched = ledger.members.find(
            (m) => m.name.toLowerCase() === it.claimedBy?.toLowerCase() || m.user_id === it.claimedBy
          );
          const userId = matched ? matched.user_id : organizerId;
          return {
            name: it.name,
            price_cents: it.priceCents,
            claimed_by_user_ids: [userId],
          };
        });
      }

      const allMemberIds = ledger.members && ledger.members.length > 0 
        ? ledger.members.map(m => m.user_id) 
        : [organizerId];

      if (formattedItems && formattedItems.length > 0) {
        try {
          await expenseService.createExpense(currentTripId, {
            paid_by: organizerId,
            amount_cents: amountCents,
            description: description,
            category: 'FOOD',
            split_type: 'ITEMIZED',
            items: formattedItems,
            tax_cents: taxCents || 0,
            tip_cents: tipCents || 0,
          });
        } catch (itemErr) {
          console.warn('Itemized split rejected, falling back to equal split:', itemErr);
          await expenseService.createExpense(currentTripId, {
            paid_by: organizerId,
            amount_cents: amountCents,
            description: description,
            category: 'FOOD',
            split_type: 'EQUAL',
            split_with_user_ids: allMemberIds,
          });
        }
      } else {
        await expenseService.createExpense(currentTripId, {
          paid_by: organizerId,
          amount_cents: amountCents,
          description: description,
          category: 'FOOD',
          split_type: 'EQUAL',
          split_with_user_ids: allMemberIds,
        });
      }

      await loadData(currentTripId);
      setIsReceiptModalOpen(false);
      triggerCelebrationConfetti();
    } catch (err) {
      console.error('Failed to commit scanned expense:', err);
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
      await loadData(currentTripId);
      setIsPayoutModalOpen(false);
      triggerCelebrationConfetti();
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Loading screen while validating initial JWT session
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#07080D] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#C6FF3D] border-t-transparent animate-spin" />
      </div>
    );
  }

  // 2. Unauthenticated: Show ONLY the Login / Register screen
  if (!currentUser) {
    return (
      <LenisProvider>
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      </LenisProvider>
    );
  }

  // 3. Authenticated: If connecting to party ledger
  if (!ledger.trip_id || ledger.members.length === 0) {
    return (
      <LenisProvider>
        <div className="min-h-screen bg-[#07080D] flex flex-col items-center justify-center relative font-body text-[#EDEEF2]">
          <div className="z-10 flex flex-col items-center space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-[#171A23] border border-white/10 flex items-center justify-center">
              <div className="w-5 h-5 rounded-full border-2 border-white/40 border-t-transparent animate-spin" />
            </div>
            <div className="text-xs font-mono text-[#8A8FA3]">Loading trip...</div>
          </div>
        </div>
      </LenisProvider>
    );
  }

  // 4. Authenticated & Connected: Render Master Treasury Cockpit
  return (
    <LenisProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-[#07080D] text-[#EDEEF2] flex flex-col font-body selection:bg-white/20 selection:text-white relative">
          {/* Top Navbar */}
          <Navbar
            tripName={ledger.trip_name || ledger.name}
            onOpenReceiptModal={() => setIsReceiptModalOpen(true)}
            onNewParty={() => setIsCreatePartyModalOpen(true)}
            currentUser={currentUser}
            onLogout={handleLogout}
          />

          {/* Multi-Page Routes */}
          <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-5 pb-24 md:pb-10 flex flex-col z-10">
            <Routes>
              <Route
                path="/"
                element={
                  <OverviewPage
                    ledger={ledger}
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
                element={
                  <LedgerPage
                    ledger={ledger}
                  />
                }
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

          {/* Bottom Footer */}
          <footer className="w-full border-t border-white/8 bg-[#07080D]/90 backdrop-blur-md px-4 sm:px-8 py-2.5 flex items-center justify-between text-[11px] font-mono text-[#8A8FA3] z-20">
            <div className="flex items-center gap-3">
              <span>TripSheriff</span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-[#8A8FA3]">
              User: <span className="text-[#C6FF3D]">{currentUser.handle || currentUser.name}</span>
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

          <CreatePartyModal
            isOpen={isCreatePartyModalOpen}
            onClose={() => setIsCreatePartyModalOpen(false)}
            onCreateParty={handleCreateNewParty}
          />
        </div>
      </BrowserRouter>
    </LenisProvider>
  );
}

export default App;

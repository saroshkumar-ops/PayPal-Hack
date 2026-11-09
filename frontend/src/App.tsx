import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { LayoutDashboard, Terminal, CreditCard, ReceiptText } from 'lucide-react';
import confetti from 'canvas-confetti';

import { Navbar } from './components/layout/Navbar';
import { OverviewPage } from './pages/OverviewPage';
import { SimulatorPage } from './pages/SimulatorPage';
import { LedgerPage } from './pages/LedgerPage';
import { PayoutsPage } from './pages/PayoutsPage';
import { LoginPage } from './pages/LoginPage';

import { PayoutModal } from './components/settlement/PayoutModal';
import { ReceiptDropModal, type ExtractedItemDraft } from './components/bits/ReceiptDropModal';
import { CreatePartyModal, type PartyMemberDraft } from './components/bits/CreatePartyModal';
import { AddMemberModal } from './components/bits/AddMemberModal';
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
import type { TripLedger, ChatMessage, PayPalEventLog, ItemClaimDto, CustomSplitDto, AuthResponseDto } from './types';
import { EMPTY_LEDGER } from './api/mockData';
import { formatPartyName } from './lib/formatters';

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
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
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

  const handleCreateNewParty = async (
    name: string, 
    currency: 'USD' | 'INR',
    additionalMembers?: PartyMemberDraft[]
  ) => {
    if (!currentUser) return;
    const safeSlug = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const newTripId = `party_${safeSlug}_${Date.now().toString(36).slice(-4)}`;

    await tripService.createTrip({
      trip_id: newTripId,
      name: name,
      currency: currency,
    });

    // 1. Add current user as organizer
    await memberService.addMember(newTripId, {
      user_id: currentUser.user_id,
      name: currentUser.name,
      handle: currentUser.handle || `@${safeSlug}`,
      paypal_email: currentUser.paypal_email || currentUser.email,
      role: 'ORGANIZER',
      roast_consent: 'SPICY',
    });

    // 2. Add invited friends
    if (additionalMembers && additionalMembers.length > 0) {
      for (const m of additionalMembers) {
        const memberSlug = m.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        await memberService.addMember(newTripId, {
          user_id: `usr_${memberSlug}_${Date.now().toString(36).slice(-3)}`,
          name: m.name,
          handle: m.handle?.startsWith('@') ? m.handle : (m.handle ? `@${m.handle}` : `@${memberSlug}`),
          paypal_email: m.paypal_email || `${memberSlug}@personal.example.com`,
          role: 'MEMBER',
          roast_consent: 'MILD',
        });
      }
    }

    localStorage.setItem('active_trip_id', newTripId);
    setActiveTripId(newTripId);
    await loadData(newTripId);
    triggerCelebrationConfetti();
  };

  // Add a new member to the active trip
  const handleAddMemberToCurrentParty = async (
    name: string,
    handle?: string,
    paypalEmail?: string
  ) => {
    if (!currentTripId) return;
    setIsLoading(true);
    try {
      const memberSlug = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      await memberService.addMember(currentTripId, {
        user_id: `usr_${memberSlug}_${Date.now().toString(36).slice(-3)}`,
        name: name.trim(),
        handle: handle?.startsWith('@') ? handle : (handle ? `@${handle.trim()}` : `@${memberSlug}`),
        paypal_email: paypalEmail?.trim() || `${memberSlug}@personal.example.com`,
        role: 'MEMBER',
        roast_consent: 'MILD',
      });
      await loadData(currentTripId);
      setIsAddMemberModalOpen(false);
      triggerCelebrationConfetti();
    } catch (err) {
      console.error('Failed to add member to party:', err);
    } finally {
      setIsLoading(false);
    }
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
      const result = await chatService.sendMessage(currentTripId, text, organizerId, ledger.members);
      if (result?.userMessage) {
        setMessages((prev) => [
          ...prev, 
          result.userMessage, 
          ...(result.botReply ? [result.botReply] : [])
        ]);
      }
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
    splitType: 'EQUAL' | 'ITEMIZED' = 'EQUAL',
    items?: ExtractedItemDraft[],
    taxCents?: number,
    tipCents?: number,
    paidByUserId?: string,
    customSplits?: Array<{ user_id: string; owes_cents: number }>
  ): Promise<void> => {
    if (!currentTripId) return;
    setIsLoading(true);
    try {
      const payerId = paidByUserId || organizerId;
      const allMemberIds = ledger.members && ledger.members.length > 0 
        ? ledger.members.map(m => m.user_id) 
        : [payerId];

      if (splitType === 'ITEMIZED') {
        // Derive exact splits from customSplits passed by modal
        let exactSplits: CustomSplitDto[] = [];
        if (customSplits && customSplits.length > 0) {
          exactSplits = customSplits;
        } else if (items && items.length > 0) {
          const shares: Record<string, number> = {};
          allMemberIds.forEach((id) => { shares[id] = 0; });
          let sub = 0;
          items.forEach((it) => {
            sub += it.priceCents;
            const c = it.claimedByUserIds?.length ? it.claimedByUserIds : allMemberIds;
            const base = Math.floor(it.priceCents / c.length);
            const rem = it.priceCents % c.length;
            c.forEach((uid, i) => { shares[uid] = (shares[uid] || 0) + base + (i < rem ? 1 : 0); });
          });
          const diff = amountCents - sub;
          if (diff !== 0 && sub > 0) {
            let dist = 0;
            allMemberIds.forEach((uid, idx) => {
              if (idx === allMemberIds.length - 1) {
                shares[uid] = Math.max(0, (shares[uid] || 0) + (diff - dist));
              } else {
                const extra = Math.round(((shares[uid] || 0) * diff) / sub);
                shares[uid] = Math.max(0, (shares[uid] || 0) + extra);
                dist += extra;
              }
            });
          }
          exactSplits = allMemberIds.map((uid) => ({ user_id: uid, owes_cents: shares[uid] || 0 }));
        } else {
          const count = Math.max(1, allMemberIds.length);
          const base = Math.floor(amountCents / count);
          const rem = amountCents % count;
          exactSplits = allMemberIds.map((uid, idx) => ({
            user_id: uid,
            owes_cents: base + (idx < rem ? 1 : 0),
          }));
        }

        // Before sending, verify the sum equals amountCents and throw a clear error if not:
        const sumSplits = exactSplits.reduce((acc, s) => acc + s.owes_cents, 0);
        if (sumSplits !== amountCents) {
          throw new Error(
            `Split sum (${(sumSplits / 100).toFixed(2)}) does not match bill total (${(amountCents / 100).toFixed(2)})`
          );
        }

        const formattedItems: ItemClaimDto[] | undefined = items && items.length > 0
          ? items.map((it) => ({
              name: it.name,
              price_cents: it.priceCents,
              claimed_by_user_ids: it.claimedByUserIds && it.claimedByUserIds.length > 0 
                ? it.claimedByUserIds 
                : allMemberIds,
            }))
          : undefined;

        // Send split_type "EXACT" with custom_splits
        await expenseService.createExpense(currentTripId, {
          paid_by: payerId,
          amount_cents: amountCents,
          description: description,
          category: 'FOOD',
          split_type: 'EXACT',
          custom_splits: exactSplits,
          items: formattedItems,
          tax_cents: taxCents || 0,
          tip_cents: tipCents || 0,
        });
      } else {
        // Equal split across all party members
        await expenseService.createExpense(currentTripId, {
          paid_by: payerId,
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
      throw err;
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

  // Delete an expense
  const handleDeleteExpense = async (expenseId: string) => {
    if (!currentTripId) return;
    setIsLoading(true);
    try {
      await expenseService.deleteExpense(currentTripId, expenseId);
      await loadData(currentTripId);
    } catch (err) {
      console.error('Failed to delete expense:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Loading screen while validating initial JWT session
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[var(--canvas)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-white/60 border-t-transparent animate-spin" />
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
        <div className="min-h-screen bg-[var(--canvas)] flex flex-col items-center justify-center relative font-body text-[var(--text)]">
          <div className="z-10 flex flex-col items-center space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center">
              <div className="w-5 h-5 rounded-full border-2 border-white/40 border-t-transparent animate-spin" />
            </div>
            <div className="text-xs font-mono text-[var(--muted)]">Loading trip...</div>
          </div>
        </div>
      </LenisProvider>
    );
  }

  // 4. Authenticated & Connected: Render Master Treasury Cockpit
  return (
    <LenisProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-[var(--canvas)] text-[var(--text)] flex flex-col font-body selection:bg-white/20 selection:text-white relative">
          {/* Top Navbar */}
          <Navbar
            tripName={formatPartyName(ledger.trip_name || ledger.name, ledger.trip_id)}
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
                    onOpenAddMemberModal={() => setIsAddMemberModalOpen(true)}
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
                    onDeleteExpense={handleDeleteExpense}
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

          {/* Bottom Footer (Desktop) */}
          <footer className="hidden md:flex w-full border-t border-[var(--border)] bg-[var(--canvas)] px-4 sm:px-8 py-2.5 items-center justify-between text-xs font-mono text-[var(--muted)] z-20">
            <div className="flex items-center gap-3">
              <span>TripSheriff</span>
            </div>
            <div className="text-xs text-[var(--muted)]">
              Traveler: <span className="text-[var(--text)] font-medium">{currentUser.handle || currentUser.name}</span>
            </div>
          </footer>

          {/* Mobile Bottom Navigation Dock */}
          <nav aria-label="Mobile Navigation" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--canvas)]/95 backdrop-blur-md border-t border-[var(--border)] px-2 py-1.5 flex items-center justify-around">
            {[
              { to: '/', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
              { to: '/simulator', label: 'Simulator', icon: <Terminal className="w-4 h-4" /> },
              { to: '/ledger', label: 'Expenses', icon: <CreditCard className="w-4 h-4" /> },
              { to: '/payouts', label: 'Payouts', icon: <ReceiptText className="w-4 h-4" /> },
            ].map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-lg text-xs font-medium transition-colors no-underline ${
                    isActive
                      ? 'text-[var(--text)] font-bold bg-[var(--surface-elevated)] border border-[var(--border)]'
                      : 'text-[var(--muted)] hover:text-[var(--text)]'
                  }`
                }
              >
                {link.icon}
                <span>{link.label}</span>
              </NavLink>
            ))}
          </nav>

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
            currentUserId={currentUser?.user_id}
            onConfirmExpense={handleConfirmScannedExpense}
          />

          <CreatePartyModal
            isOpen={isCreatePartyModalOpen}
            onClose={() => setIsCreatePartyModalOpen(false)}
            organizerName={currentUser?.name}
            onCreateParty={handleCreateNewParty}
          />

          <AddMemberModal
            isOpen={isAddMemberModalOpen}
            onClose={() => setIsAddMemberModalOpen(false)}
            tripName={formatPartyName(ledger.trip_name || ledger.name, ledger.trip_id)}
            onAddMember={handleAddMemberToCurrentParty}
          />
        </div>
      </BrowserRouter>
    </LenisProvider>
  );
}

export default App;

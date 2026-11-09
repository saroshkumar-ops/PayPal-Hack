import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Upload, 
  Users, 
  ListFilter, 
  Check, 
  User, 
  RotateCcw,
  Receipt as ReceiptIcon,
  AlertCircle
} from 'lucide-react';
import { aiService } from '../../api/services';
import { Button } from '../ui/Button';
import { getCurrencySymbol } from '../../lib/currency';
import { getMemberTagColor } from '../ui/Avatar';
import { PaperReceipt } from './PaperReceipt';

export interface ExtractedItemDraft {
  name: string;
  priceCents: number;
  claimedByUserIds: string[];
}

interface ReceiptDropModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency?: string;
  members?: Array<{ user_id: string; name: string }>;
  currentUserId?: string;
  onConfirmExpense: (
    description: string, 
    amountCents: number, 
    splitType: 'EQUAL' | 'ITEMIZED',
    items?: ExtractedItemDraft[],
    taxCents?: number,
    tipCents?: number,
    paidByUserId?: string,
    customSplits?: Array<{ user_id: string; owes_cents: number }>
  ) => void;
}

export const ReceiptDropModal: React.FC<ReceiptDropModalProps> = ({
  isOpen,
  onClose,
  currency = 'INR',
  members = [],
  currentUserId,
  onConfirmExpense,
}) => {
  const activeMembers = members && members.length > 0 ? members : [];
  const allUserIds = activeMembers.map((m) => m.user_id);

  const [isScanning, setIsScanning] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [splitMode, setSplitMode] = useState<'EQUAL' | 'ITEMIZED'>('EQUAL');
  const [paidByUserId, setPaidByUserId] = useState<string>(() => {
    return currentUserId || activeMembers[0]?.user_id || '';
  });

  // Explicit user-typed custom amounts per traveler
  const [customSharesCents, setCustomSharesCents] = useState<Record<string, number>>({});
  const [shareInputStrings, setShareInputStrings] = useState<Record<string, string>>({});
  const [isCustomManual, setIsCustomManual] = useState<boolean>(false);

  const [extractedReceipt, setExtractedReceipt] = useState<null | {
    merchant: string;
    currency: string;
    currencySymbol: string;
    totalCents: number;
    taxCents: number;
    tipCents: number;
    items: ExtractedItemDraft[];
  }>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Compute shares based on item claims or equal distribution
  const computeItemizedShares = (): Record<string, number> => {
    if (!extractedReceipt) return {};
    const shares: Record<string, number> = {};
    activeMembers.forEach((m) => { shares[m.user_id] = 0; });

    // If receipt has line items, compute from item claims
    if (extractedReceipt.items && extractedReceipt.items.length > 0) {
      let itemsSubtotal = 0;
      extractedReceipt.items.forEach((item) => {
        itemsSubtotal += item.priceCents;
        const claimants = item.claimedByUserIds && item.claimedByUserIds.length > 0 
          ? item.claimedByUserIds 
          : allUserIds;
        const claimCount = Math.max(1, claimants.length);
        const baseShare = Math.floor(item.priceCents / claimCount);
        const rem = item.priceCents % claimCount;
        claimants.forEach((uid, i) => {
          const itemShare = baseShare + (i < rem ? 1 : 0);
          shares[uid] = (shares[uid] || 0) + itemShare;
        });
      });

      // Proportionally distribute taxes, tips, or unallocated difference to match totalCents exactly
      const unallocatedCents = extractedReceipt.totalCents - itemsSubtotal;
      if (unallocatedCents !== 0 && itemsSubtotal > 0) {
        let distributedExtra = 0;
        activeMembers.forEach((m, idx) => {
          if (idx === activeMembers.length - 1) {
            shares[m.user_id] = Math.max(0, (shares[m.user_id] || 0) + (unallocatedCents - distributedExtra));
          } else {
            const userDirect = shares[m.user_id] || 0;
            const extra = Math.round((userDirect * unallocatedCents) / itemsSubtotal);
            shares[m.user_id] = Math.max(0, userDirect + extra);
            distributedExtra += extra;
          }
        });
      }
      return shares;
    }

    // Default even split if no items
    const count = Math.max(1, activeMembers.length);
    const base = Math.floor(extractedReceipt.totalCents / count);
    const rem = extractedReceipt.totalCents % count;
    activeMembers.forEach((m, idx) => {
      shares[m.user_id] = base + (idx < rem ? 1 : 0);
    });

    return shares;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setErrorMsg(null);
    setIsCustomManual(false);
    setCustomSharesCents({});
    setShareInputStrings({});
    try {
      const res = await aiService.uploadReceipt(file, currency);
      const symbol = res.currency_symbol || getCurrencySymbol(currency);
      
      const parsed = {
        merchant: res.merchant || 'Scanned Bill',
        currency: res.currency || currency,
        currencySymbol: symbol,
        totalCents: res.total_cents || 10000,
        taxCents: res.tax_cents || 0,
        tipCents: res.tip_cents || 0,
        items: (res.items || []).map((item) => ({
          name: item.name,
          priceCents: item.price_cents,
          claimedByUserIds: [...allUserIds],
        })),
      };

      setExtractedReceipt(parsed);

      // Prepopulate default shares
      const initialShares: Record<string, number> = {};
      const initialStrings: Record<string, string> = {};
      const base = Math.floor(parsed.totalCents / Math.max(1, activeMembers.length));
      const rem = parsed.totalCents % Math.max(1, activeMembers.length);
      activeMembers.forEach((m, i) => {
        const cents = base + (i < rem ? 1 : 0);
        initialShares[m.user_id] = cents;
        initialStrings[m.user_id] = (cents / 100).toFixed(2);
      });
      setCustomSharesCents(initialShares);
      setShareInputStrings(initialStrings);

      if (!paidByUserId && activeMembers.length > 0) {
        setPaidByUserId(currentUserId || activeMembers[0].user_id);
      }
    } catch (err) {
      console.error('Receipt parse failed:', err);
      setErrorMsg('Could not parse receipt image. Please verify image clarity and try again.');
    } finally {
      setIsScanning(false);
    }
  };

  // Toggle a member in or out of an item split
  const toggleItemMember = (itemIdx: number, userId: string) => {
    if (!extractedReceipt) return;
    setIsCustomManual(false); // item claim drives the split
    setShareInputStrings({});
    setExtractedReceipt((prev) => {
      if (!prev) return prev;
      const nextItems = [...prev.items];
      const currentClaimed = nextItems[itemIdx].claimedByUserIds;
      const alreadyClaimed = currentClaimed.includes(userId);

      let updatedClaimed: string[];
      if (alreadyClaimed) {
        updatedClaimed = currentClaimed.filter((id) => id !== userId);
        if (updatedClaimed.length === 0) {
          updatedClaimed = [userId]; // maintain at least one claimant
        }
      } else {
        updatedClaimed = [...currentClaimed, userId];
      }

      nextItems[itemIdx] = {
        ...nextItems[itemIdx],
        claimedByUserIds: updatedClaimed,
      };

      return { ...prev, items: nextItems };
    });
  };

  // Split all items with everyone
  const splitAllWithEveryone = () => {
    if (!extractedReceipt) return;
    setIsCustomManual(false);
    setShareInputStrings({});
    setExtractedReceipt((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((it) => ({
          ...it,
          claimedByUserIds: [...allUserIds],
        })),
      };
    });
  };

  // Direct manual custom share amount input handler (fluid typing)
  const handleCustomShareInputChange = (userId: string, rawValue: string) => {
    setIsCustomManual(true);
    setShareInputStrings((prev) => ({
      ...prev,
      [userId]: rawValue,
    }));

    const parsedAmount = parseFloat(rawValue);
    const cents = isNaN(parsedAmount) ? 0 : Math.max(0, Math.round(parsedAmount * 100));

    setCustomSharesCents((prev) => {
      const baseShares = isCustomManual ? { ...prev } : computeItemizedShares();
      return {
        ...baseShares,
        [userId]: cents,
      };
    });
  };

  // Format input string on blur
  const handleCustomShareInputBlur = (userId: string) => {
    const currentCents = isCustomManual 
      ? (customSharesCents[userId] || 0) 
      : (computeItemizedShares()[userId] || 0);
    setShareInputStrings((prev) => ({
      ...prev,
      [userId]: (currentCents / 100).toFixed(2),
    }));
  };

  // Exclude or zero out a traveler
  const handleZeroOutTraveler = (userId: string) => {
    setIsCustomManual(true);
    setShareInputStrings((prev) => ({ ...prev, [userId]: '0.00' }));
    setCustomSharesCents((prev) => {
      const baseShares = isCustomManual ? { ...prev } : computeItemizedShares();
      return { ...baseShares, [userId]: 0 };
    });
  };

  // Assign remaining discrepancy directly to a specific traveler
  const handleAssignRemainderToTraveler = (userId: string) => {
    if (!extractedReceipt) return;
    const currentShares = isCustomManual ? { ...customSharesCents } : computeItemizedShares();
    const allocated = Object.values(currentShares).reduce((acc, c) => acc + c, 0);
    const remaining = extractedReceipt.totalCents - allocated;

    const currentVal = currentShares[userId] || 0;
    const updatedVal = Math.max(0, currentVal + remaining);

    const updatedShares = { ...currentShares, [userId]: updatedVal };
    setCustomSharesCents(updatedShares);
    setIsCustomManual(true);

    const updatedStrings: Record<string, string> = {};
    activeMembers.forEach((m) => {
      updatedStrings[m.user_id] = ((updatedShares[m.user_id] || 0) / 100).toFixed(2);
    });
    setShareInputStrings(updatedStrings);
  };

  // Auto-balance remaining cents across other participating travelers
  const handleAutoBalanceRemainder = () => {
    if (!extractedReceipt) return;
    const currentShares = isCustomManual ? { ...customSharesCents } : computeItemizedShares();
    const allocated = Object.values(currentShares).reduce((acc, c) => acc + c, 0);
    const remaining = extractedReceipt.totalCents - allocated;

    if (remaining === 0) return;

    // Distribute remaining among travelers with non-zero shares (or all travelers)
    const eligible = activeMembers.filter((m) => (currentShares[m.user_id] || 0) > 0);
    const targets = eligible.length > 0 ? eligible : activeMembers;
    const count = targets.length;
    const baseExtra = Math.floor(remaining / count);
    const rem = remaining % count;

    targets.forEach((m, idx) => {
      const extra = baseExtra + (idx < rem ? 1 : 0);
      currentShares[m.user_id] = Math.max(0, (currentShares[m.user_id] || 0) + extra);
    });

    setCustomSharesCents(currentShares);
    setIsCustomManual(true);

    const updatedStrings: Record<string, string> = {};
    activeMembers.forEach((m) => {
      updatedStrings[m.user_id] = ((currentShares[m.user_id] || 0) / 100).toFixed(2);
    });
    setShareInputStrings(updatedStrings);
  };

  // Reset custom shares to equal
  const handleResetCustomToEqual = () => {
    if (!extractedReceipt) return;
    setIsCustomManual(false);
    setShareInputStrings({});
    if (extractedReceipt.items.length > 0) {
      splitAllWithEveryone();
    } else {
      const initialShares: Record<string, number> = {};
      const base = Math.floor(extractedReceipt.totalCents / Math.max(1, activeMembers.length));
      const rem = extractedReceipt.totalCents % Math.max(1, activeMembers.length);
      activeMembers.forEach((m, i) => {
        initialShares[m.user_id] = base + (i < rem ? 1 : 0);
      });
      setCustomSharesCents(initialShares);
    }
  };

  // Derive active live shares
  const activeShares: Record<string, number> = useMemo(() => {
    if (isCustomManual && Object.keys(customSharesCents).length > 0) {
      return customSharesCents;
    }
    return computeItemizedShares();
  }, [isCustomManual, customSharesCents, extractedReceipt]);

  const totalAllocatedCents = Object.values(activeShares).reduce((a, b) => a + b, 0);
  const totalDueCents = extractedReceipt?.totalCents || 0;
  const discrepancyCents = totalDueCents - totalAllocatedCents;

  const handleConfirm = () => {
    if (!extractedReceipt) return;
    const selectedPayer = paidByUserId || currentUserId || activeMembers[0]?.user_id;

    // Absorb any tiny integer rounding discrepancy (if manual) into highest share
    const finalShares = { ...activeShares };
    if (discrepancyCents !== 0) {
      const sorted = [...activeMembers].sort((a, b) => (finalShares[b.user_id] || 0) - (finalShares[a.user_id] || 0));
      const primaryTarget = sorted[0]?.user_id || selectedPayer;
      finalShares[primaryTarget] = Math.max(0, (finalShares[primaryTarget] || 0) + discrepancyCents);
    }

    const customSplits = activeMembers.map((m) => ({
      user_id: m.user_id,
      owes_cents: finalShares[m.user_id] || 0,
    }));

    onConfirmExpense(
      extractedReceipt.merchant,
      extractedReceipt.totalCents,
      splitMode,
      splitMode === 'ITEMIZED' && extractedReceipt.items.length > 0 && !isCustomManual 
        ? extractedReceipt.items 
        : undefined,
      extractedReceipt.taxCents,
      extractedReceipt.tipCents,
      selectedPayer,
      splitMode === 'ITEMIZED' ? customSplits : undefined
    );
    onClose();
  };

  if (!isOpen) return null;

  const memberCount = Math.max(1, activeMembers.length);
  const curSymbol = extractedReceipt?.currencySymbol || getCurrencySymbol(currency);
  const perPersonEqualCents = extractedReceipt 
    ? Math.round(extractedReceipt.totalCents / memberCount) 
    : 0;

  return (
    <AnimatePresence>
      <div 
        data-modal-open="true"
        data-lenis-prevent="true"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 overflow-hidden select-none"
      >
        <motion.div
          data-modal-open="true"
          data-lenis-prevent="true"
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between p-4 sm:p-5 border-b border-[var(--border)] bg-[var(--surface-elevated)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--canvas)] border border-[var(--border)] flex items-center justify-center">
                <ReceiptIcon className="w-4 h-4 text-[var(--text)]" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-display font-bold text-[var(--text)] m-0">
                  {extractedReceipt ? 'Review & Split Scanned Bill' : 'Upload Receipt'}
                </h3>
                <p className="text-[11px] text-[var(--muted)] font-mono m-0 mt-0.5">
                  {extractedReceipt 
                    ? `${activeMembers.length} party members · Custom split configuration` 
                    : 'Auto-scan paper bills, extract line items, and assign shares'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Body: strict scroll containment with no leaking to window */}
          <div 
            data-lenis-prevent="true"
            onWheel={(e) => e.stopPropagation()}
            className="p-4 sm:p-6 flex-1 min-h-0 overflow-y-auto overscroll-contain"
            style={{ overscrollBehavior: 'contain' }}
          >
            {!extractedReceipt ? (
              /* State 1: Dropzone & Scan State */
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file && fileInputRef.current) {
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(file);
                    fileInputRef.current.files = dataTransfer.files;
                    handleFileUpload({ target: fileInputRef.current } as any);
                  }
                }}
                onClick={() => !isScanning && fileInputRef.current?.click()}
                className={`relative rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-all overflow-hidden ${
                  dragOver
                    ? 'border-white/50 bg-[var(--surface-elevated)]'
                    : 'border-[var(--border)] hover:border-white/25 bg-[var(--canvas)] cursor-pointer'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isScanning}
                />

                {isScanning ? (
                  /* Optical Scan Animation with Moving Laser Bar */
                  <div className="py-6 flex flex-col items-center justify-center space-y-6">
                    <div className="relative w-48 sm:w-56 p-4 rounded-xl bg-[var(--receipt-paper)] text-[var(--receipt-ink)] font-mono text-[10px] shadow-2xl overflow-hidden select-none">
                      {/* Scanning Laser Beam (respects prefers-reduced-motion) */}
                      <motion.div
                        className="absolute left-0 right-0 h-[2px] bg-[var(--settled)] shadow-[0_0_8px_#C6FF3D]"
                        animate={prefersReducedMotion ? { top: '50%' } : { top: ['0%', '100%', '0%'] }}
                        transition={prefersReducedMotion ? { duration: 0 } : { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                      />

                      <div className="text-center font-bold tracking-widest uppercase border-b border-[var(--receipt-ink)]/20 pb-1 mb-2 opacity-75">
                        SCANNING TICKET
                      </div>
                      <div className="space-y-1 opacity-80 text-left">
                        <div className="flex justify-between py-0.5">
                          <span>Item 01</span>
                          <span>240.00</span>
                        </div>
                        <div className="flex justify-between py-0.5">
                          <span>Item 02</span>
                          <span>490.00</span>
                        </div>
                        <div className="flex justify-between py-0.5">
                          <span>GST Tax</span>
                          <span>120.00</span>
                        </div>
                        <div className="border-t border-[var(--receipt-ink)] pt-1 flex justify-between font-bold">
                          <span>TOTAL</span>
                          <span>850.00</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-center">
                      <div className="text-sm font-display font-bold text-[var(--text)]">
                        Analyzing Bill & Extracting Items...
                      </div>
                      <p className="text-xs text-[var(--muted)] font-mono max-w-sm mx-auto m-0">
                        Scanning merchant header, line items, and totals in {currency}.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Tactile Upload Brief */
                  <div className="flex flex-col items-center justify-center space-y-3 py-4">
                    <div className="w-12 h-12 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center">
                      <Upload className="w-5 h-5 text-[var(--text)]" />
                    </div>

                    <div className="space-y-1">
                      <div className="text-sm font-display font-semibold text-[var(--text)]">
                        Drop receipt image here or click to browse
                      </div>
                      <p className="text-xs text-[var(--muted)] font-body max-w-sm mx-auto m-0">
                        Supports PNG, JPG, or PDF captures of dining, lodging, or travel expenses.
                      </p>
                    </div>

                    <div className="text-[11px] font-mono text-[var(--muted)] pt-2">
                      Target Currency: <span className="text-[var(--text)] font-semibold">{currency}</span>
                    </div>

                    {errorMsg && (
                      <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--owes)] bg-[var(--owes)]/10 px-3 py-1.5 rounded-lg border border-[var(--owes)]/20 mt-3">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{errorMsg}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* State 2: Parsed Receipt Review & Asymmetric Split Cockpit */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left: The Signature Physical Paper Receipt (live real-time update) */}
                <div className="lg:col-span-5 flex justify-center py-1">
                  <PaperReceipt
                    merchantName={extractedReceipt.merchant}
                    receiptNumber="#SCAN-LIVE"
                    date={new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    currency={extractedReceipt.currency}
                    items={extractedReceipt.items}
                    taxCents={extractedReceipt.taxCents}
                    tipCents={extractedReceipt.tipCents}
                    totalCents={extractedReceipt.totalCents}
                    members={activeMembers}
                    memberSplits={activeMembers.map((m) => ({
                      user_id: m.user_id,
                      name: m.name,
                      owes_cents: splitMode === 'EQUAL' 
                        ? perPersonEqualCents 
                        : (activeShares[m.user_id] || 0),
                    }))}
                    splitType={splitMode === 'EQUAL' ? 'EQUAL' : 'CUSTOM'}
                    rotateDeg={-0.6}
                    interactive={false}
                  />
                </div>

                {/* Right: Bill Settlement & Traveler Assignment Cockpit */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Who Paid Section */}
                  <div className="p-4 rounded-xl bg-[var(--canvas)] border border-[var(--border)] space-y-2">
                    <div className="text-[11px] font-mono text-[var(--muted)] uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[var(--text)]" />
                      <span>Who Paid The Bill?</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {activeMembers.map((m) => {
                        const isSelected = paidByUserId === m.user_id;
                        const isSelf = m.user_id === currentUserId;
                        const tag = getMemberTagColor(m.user_id);
                        return (
                          <button
                            key={m.user_id}
                            type="button"
                            onClick={() => setPaidByUserId(m.user_id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer ${
                              isSelected
                                ? 'bg-[var(--surface-elevated)] border border-white/30 text-[var(--text)] font-semibold shadow-sm'
                                : 'bg-[var(--canvas)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
                            }`}
                          >
                            <span
                              style={{
                                backgroundColor: tag.bg,
                                color: tag.text,
                                borderColor: tag.border,
                              }}
                              className="w-4 h-4 rounded text-[9px] font-bold border flex items-center justify-center shrink-0"
                            >
                              {m.name.slice(0, 2).toUpperCase()}
                            </span>
                            <span className="truncate max-w-[120px]">{m.name}</span>
                            {isSelf && <span className="text-[10px] text-[var(--muted)] font-normal">(You)</span>}
                            {isSelected && <Check className="w-3 h-3 text-[var(--text)] shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Split Method Toggle */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-mono text-[var(--muted)] uppercase tracking-wider">
                      Split Method
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSplitMode('EQUAL');
                          setIsCustomManual(false);
                          setShareInputStrings({});
                        }}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-mono font-medium transition-colors cursor-pointer ${
                          splitMode === 'EQUAL'
                            ? 'bg-[var(--surface-elevated)] border-white/30 text-[var(--text)] shadow-sm'
                            : 'bg-[var(--canvas)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
                        }`}
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Split Equally ({activeMembers.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSplitMode('ITEMIZED');
                          if (Object.keys(shareInputStrings).length === 0) {
                            const newStrings: Record<string, string> = {};
                            activeMembers.forEach((m) => {
                              newStrings[m.user_id] = ((activeShares[m.user_id] || perPersonEqualCents) / 100).toFixed(2);
                            });
                            setShareInputStrings(newStrings);
                          }
                        }}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-mono font-medium transition-colors cursor-pointer ${
                          splitMode === 'ITEMIZED'
                            ? 'bg-[var(--surface-elevated)] border-white/30 text-[var(--text)] shadow-sm'
                            : 'bg-[var(--canvas)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
                        }`}
                      >
                        <ListFilter className="w-3.5 h-3.5" />
                        <span>Custom Split</span>
                      </button>
                    </div>
                  </div>

                  {/* Mode Content */}
                  {splitMode === 'EQUAL' ? (
                    /* Equal Split Breakdown */
                    <div className="p-4 rounded-xl bg-[var(--canvas)] border border-[var(--border)] space-y-3">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-[var(--muted)]">PER TRAVELER SHARE:</span>
                        <span className="text-base font-bold text-[var(--text)] tabular-nums">
                          {curSymbol}{(perPersonEqualCents / 100).toFixed(2)}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-[var(--border)] space-y-1.5">
                        <div className="text-[11px] text-[var(--muted)] font-body">
                          Even split between all {activeMembers.length} travelers:
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {activeMembers.map((m) => {
                            const tag = getMemberTagColor(m.user_id);
                            return (
                              <div
                                key={m.user_id}
                                className="px-2.5 py-1.5 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border)] text-xs font-mono text-[var(--text)] flex items-center justify-between"
                              >
                                <div className="flex items-center gap-1.5">
                                  <span
                                    style={{
                                      backgroundColor: tag.bg,
                                      color: tag.text,
                                      borderColor: tag.border,
                                    }}
                                    className="w-4 h-4 rounded text-[9px] font-bold border flex items-center justify-center"
                                  >
                                    {m.name.slice(0, 2).toUpperCase()}
                                  </span>
                                  <span className="truncate max-w-[90px]">{m.name}</span>
                                </div>
                                <span className="tabular-nums font-semibold">
                                  {curSymbol}{(perPersonEqualCents / 100).toFixed(2)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Custom Split: Interactive Traveler Shares with Fluid Number Inputs */
                    <div className="space-y-3">
                      <div className="p-3.5 rounded-xl bg-[var(--canvas)] border border-[var(--border)] space-y-2.5">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[var(--muted)] font-semibold uppercase tracking-wider">
                              Custom Traveler Shares:
                            </span>
                            <span className="text-[10px] text-[var(--muted)]">
                              (Type exact amounts below)
                            </span>
                          </div>
                          <div className="text-xs font-bold text-[var(--text)] tabular-nums font-mono">
                            {curSymbol}{(extractedReceipt.totalCents / 100).toFixed(2)} Total
                          </div>
                        </div>

                        {/* Interactive Traveler Shares Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {activeMembers.map((m) => {
                            const tag = getMemberTagColor(m.user_id);
                            const userShareCents = activeShares[m.user_id] || 0;
                            const inputVal = shareInputStrings[m.user_id] ?? ((userShareCents / 100).toFixed(2));

                            return (
                              <div
                                key={m.user_id}
                                className="px-3 py-2 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] text-xs font-mono text-[var(--text)] flex items-center justify-between gap-2"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    style={{
                                      backgroundColor: tag.bg,
                                      color: tag.text,
                                      borderColor: tag.border,
                                    }}
                                    className="w-5 h-5 rounded text-[10px] font-bold border flex items-center justify-center shrink-0"
                                  >
                                    {m.name.slice(0, 2).toUpperCase()}
                                  </span>
                                  <div className="min-w-0">
                                    <div className="truncate max-w-[85px] font-body text-xs font-semibold">{m.name}</div>
                                    <div className="flex items-center gap-1.5 pt-0.5">
                                      <button
                                        type="button"
                                        onClick={() => handleZeroOutTraveler(m.user_id)}
                                        className="text-[9px] font-mono text-[var(--muted)] hover:text-[var(--owes)] cursor-pointer underline"
                                      >
                                        Zero
                                      </button>
                                      {discrepancyCents > 0 && (
                                        <button
                                          type="button"
                                          onClick={() => handleAssignRemainderToTraveler(m.user_id)}
                                          className="text-[9px] font-mono text-[var(--settled)] hover:underline cursor-pointer"
                                        >
                                          +Rem
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="text-[11px] text-[var(--muted)] font-mono">{curSymbol}</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={inputVal}
                                    onChange={(e) => handleCustomShareInputChange(m.user_id, e.target.value)}
                                    onBlur={() => handleCustomShareInputBlur(m.user_id)}
                                    className="w-20 px-2 py-1 rounded bg-[var(--canvas)] border border-[var(--border)] text-xs font-mono text-right text-[var(--text)] tabular-nums font-bold focus:border-white/40 focus:outline-none"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Allocation Math Status Bar */}
                        <div className="pt-2 border-t border-[var(--border)] flex flex-wrap items-center justify-between text-[11px] font-mono gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[var(--muted)]">Allocated:</span>
                            <span className="font-bold tabular-nums text-[var(--text)]">
                              {curSymbol}{(totalAllocatedCents / 100).toFixed(2)}
                            </span>
                            {discrepancyCents === 0 ? (
                              <span className="text-[var(--settled)] font-semibold flex items-center gap-1">
                                <Check className="w-3 h-3" /> Exact Match
                              </span>
                            ) : discrepancyCents > 0 ? (
                              <span className="text-[var(--owes)] font-semibold">
                                ({curSymbol}{(discrepancyCents / 100).toFixed(2)} remaining)
                              </span>
                            ) : (
                              <span className="text-[var(--owes)] font-semibold">
                                ({curSymbol}{(Math.abs(discrepancyCents) / 100).toFixed(2)} over total)
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            {discrepancyCents !== 0 && (
                              <button
                                type="button"
                                onClick={handleAutoBalanceRemainder}
                                className="text-[var(--text)] hover:underline cursor-pointer font-bold"
                              >
                                Fill Remainder
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={handleResetCustomToEqual}
                              className="text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
                            >
                              Reset
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Line Items Assignment Section (if items were extracted from bill) */}
                      {extractedReceipt.items.length > 0 && (
                        <>
                          <div className="flex items-center justify-between text-xs font-mono pt-1">
                            <span className="text-[var(--muted)] uppercase">OR ASSIGN ITEMS TO TRAVELERS:</span>
                            <button
                              type="button"
                              onClick={splitAllWithEveryone}
                              className="text-[11px] text-[var(--text)] hover:underline cursor-pointer font-mono"
                            >
                              Reset All to Everyone
                            </button>
                          </div>

                          <div 
                            data-lenis-prevent="true"
                            className="space-y-2 max-h-[240px] overflow-y-auto overscroll-contain pr-1.5"
                            style={{ overscrollBehavior: 'contain' }}
                          >
                            {extractedReceipt.items.map((item, itemIdx) => {
                              return (
                                <div
                                  key={itemIdx}
                                  className="p-3 rounded-xl bg-[var(--canvas)] border border-[var(--border)] space-y-2"
                                >
                                  <div className="flex items-center justify-between text-xs font-mono">
                                    <span className="font-medium text-[var(--text)] truncate max-w-[220px]">
                                      {item.name}
                                    </span>
                                    <span className="font-bold tabular-nums text-[var(--text)] shrink-0">
                                      {curSymbol}{(item.priceCents / 100).toFixed(2)}
                                    </span>
                                  </div>

                                  {/* Claim chips */}
                                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                                    {activeMembers.map((m) => {
                                      const isClaimed = item.claimedByUserIds.includes(m.user_id);
                                      const tag = getMemberTagColor(m.user_id);
                                      return (
                                        <button
                                          key={m.user_id}
                                          type="button"
                                          onClick={() => toggleItemMember(itemIdx, m.user_id)}
                                          className={`px-2 py-1 rounded-md text-[11px] font-mono transition-colors cursor-pointer flex items-center gap-1.5 ${
                                            isClaimed
                                              ? 'bg-[var(--surface-elevated)] border border-white/20 text-[var(--text)]'
                                              : 'bg-transparent border border-dashed border-[var(--border)] text-[var(--muted)] opacity-60 hover:opacity-100'
                                          }`}
                                        >
                                          <span
                                            style={{
                                              backgroundColor: tag.bg,
                                              color: tag.text,
                                              borderColor: tag.border,
                                            }}
                                            className="w-3.5 h-3.5 rounded text-[8px] font-bold border flex items-center justify-center shrink-0"
                                          >
                                            {m.name.slice(0, 2).toUpperCase()}
                                          </span>
                                          <span className="truncate max-w-[70px]">{m.name}</span>
                                          {isClaimed && <Check className="w-2.5 h-2.5 text-[var(--text)]" />}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer: Exactly ONE Lime-filled primary button */}
          <div className="shrink-0 flex items-center justify-between p-4 sm:p-5 border-t border-[var(--border)] bg-[var(--surface-elevated)]">
            <button
              type="button"
              onClick={() => {
                setExtractedReceipt(null);
                setErrorMsg(null);
                setCustomSharesCents({});
                setShareInputStrings({});
                setIsCustomManual(false);
              }}
              className="flex items-center gap-1.5 text-xs font-mono text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{extractedReceipt ? 'Scan Another' : 'Cancel'}</span>
            </button>

            {extractedReceipt ? (
              <Button
                variant="primary"
                size="md"
                onClick={handleConfirm}
              >
                <span>Confirm & Split Bill</span>
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="md"
                onClick={onClose}
              >
                <span>Close</span>
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

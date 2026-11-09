import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Upload, 
  ArrowRight, 
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setErrorMsg(null);
    try {
      const res = await aiService.uploadReceipt(file, currency);
      const symbol = res.currency_symbol || getCurrencySymbol(currency);
      
      setExtractedReceipt({
        merchant: res.merchant || 'Scanned Bill',
        currency: res.currency || currency,
        currencySymbol: symbol,
        totalCents: res.total_cents || 10000,
        taxCents: res.tax_cents || 0,
        tipCents: res.tip_cents || 0,
        // By default, every item is split equally among ALL members of the party!
        items: (res.items || []).map((item) => ({
          name: item.name,
          priceCents: item.price_cents,
          claimedByUserIds: [...allUserIds],
        })),
      });

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

  // Assign an item to ALL members with 1 click
  const setItemToEveryone = (itemIdx: number) => {
    if (!extractedReceipt) return;
    setExtractedReceipt((prev) => {
      if (!prev) return prev;
      const nextItems = [...prev.items];
      nextItems[itemIdx] = {
        ...nextItems[itemIdx],
        claimedByUserIds: [...allUserIds],
      };
      return { ...prev, items: nextItems };
    });
  };

  // Assign ALL items to ALL members
  const splitAllWithEveryone = () => {
    if (!extractedReceipt) return;
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

  // Dynamically compute each traveler's owed cents in Itemized / Custom split mode:
  const computeItemizedShares = (): Record<string, number> => {
    if (!extractedReceipt || !extractedReceipt.items) return {};
    const shares: Record<string, number> = {};
    activeMembers.forEach((m) => { shares[m.user_id] = 0; });

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

    // If receipt has no line items, distribute the total equally across all active travelers
    if (itemsSubtotal === 0 && activeMembers.length > 0) {
      const base = Math.floor(extractedReceipt.totalCents / activeMembers.length);
      const rem = extractedReceipt.totalCents % activeMembers.length;
      activeMembers.forEach((m, i) => {
        shares[m.user_id] = base + (i < rem ? 1 : 0);
      });
      return shares;
    }

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
  };

  const handleConfirm = () => {
    if (!extractedReceipt) return;
    const selectedPayer = paidByUserId || currentUserId || activeMembers[0]?.user_id;
    const calculatedShares = computeItemizedShares();
    const customSplits = activeMembers.map((m) => ({
      user_id: m.user_id,
      owes_cents: calculatedShares[m.user_id] || 0,
    }));

    onConfirmExpense(
      extractedReceipt.merchant,
      extractedReceipt.totalCents,
      splitMode,
      splitMode === 'ITEMIZED' ? extractedReceipt.items : undefined,
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
  const itemizedShares = computeItemizedShares();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 overflow-y-auto select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="relative w-full max-w-4xl rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl overflow-hidden my-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[var(--border)] bg-[var(--surface-elevated)]">
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
                    ? `${activeMembers.length} party members · Itemized extraction complete` 
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

          <div className="p-4 sm:p-6">
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
                    : 'border-[var(--border)] bg-[var(--canvas)] hover:border-white/25 hover:bg-[var(--surface-elevated)]/40 cursor-pointer'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />

                {isScanning ? (
                  /* Animated Laser Scan Moment on Paper Receipt Sheet */
                  <div className="py-6 flex flex-col items-center justify-center space-y-6">
                    {/* Simulated Paper Sheet with Scanning Laser */}
                    <div className="relative w-56 h-72 rounded-lg bg-[var(--receipt-paper)] text-[var(--receipt-ink)] p-4 shadow-2xl overflow-hidden border border-black/10">
                      {/* Laser Line */}
                      <motion.div
                        initial={{ top: '6%' }}
                        animate={{ top: ['6%', '92%', '6%'] }}
                        transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
                        className="absolute left-0 right-0 h-1 bg-[var(--settled)] shadow-[0_0_12px_var(--settled)] pointer-events-none z-20"
                      />

                      {/* Ghost Receipt Skeleton Lines */}
                      <div className="space-y-2 opacity-35 font-mono text-[9px]">
                        <div className="w-24 h-2 bg-[var(--receipt-ink)] rounded mx-auto mb-3" />
                        <div className="flex justify-between border-b border-[var(--receipt-ink)] pb-1">
                          <span>ITEM</span>
                          <span>AMT</span>
                        </div>
                        <div className="flex justify-between py-0.5">
                          <span>Entree Special</span>
                          <span>450.00</span>
                        </div>
                        <div className="flex justify-between py-0.5">
                          <span>Drinks (2x)</span>
                          <span>220.00</span>
                        </div>
                        <div className="flex justify-between py-0.5">
                          <span>Service Charge</span>
                          <span>60.00</span>
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
                        Supports PNG, JPG, or PDF camera captures of dining, lodging, or travel expenses.
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
                {/* Left: The Signature Physical Paper Receipt */}
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
                        const isPayer = (paidByUserId || currentUserId) === m.user_id;
                        const tagColor = getMemberTagColor(m.user_id);
                        return (
                          <button
                            key={m.user_id}
                            type="button"
                            onClick={() => setPaidByUserId(m.user_id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer ${
                              isPayer
                                ? 'bg-[var(--surface-elevated)] border border-white/40 text-[var(--text)] font-semibold shadow-sm'
                                : 'bg-transparent border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
                            }`}
                          >
                            <span
                              style={{
                                backgroundColor: tagColor.bg,
                                color: tagColor.text,
                                borderColor: tagColor.border,
                              }}
                              className="w-4 h-4 rounded text-[9px] font-bold border flex items-center justify-center shrink-0"
                            >
                              {m.name.slice(0, 2).toUpperCase()}
                            </span>
                            <span>{m.name}</span>
                            {m.user_id === currentUserId && <span className="text-[10px] text-[var(--muted)]">(You)</span>}
                            {isPayer && <Check className="w-3 h-3 text-[var(--text)] ml-0.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Split Method Toggle (Equal vs Itemized) */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-mono text-[var(--muted)] uppercase tracking-wider">
                      Split Method
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSplitMode('EQUAL')}
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
                        onClick={() => setSplitMode('ITEMIZED')}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-mono font-medium transition-colors cursor-pointer ${
                          splitMode === 'ITEMIZED'
                            ? 'bg-[var(--surface-elevated)] border-white/30 text-[var(--text)] shadow-sm'
                            : 'bg-[var(--canvas)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
                        }`}
                      >
                        <ListFilter className="w-3.5 h-3.5" />
                        <span>Itemized Claim</span>
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
                    /* Itemized / Custom Split: Live Traveler Shares + Item Claimant Assigners */
                    <div className="space-y-3">
                      {/* Live Traveler Custom Split Breakdown */}
                      <div className="p-3.5 rounded-xl bg-[var(--canvas)] border border-[var(--border)] space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-[var(--muted)] font-semibold uppercase tracking-wider">
                            Custom Traveler Shares:
                          </span>
                          <span className="text-xs font-bold text-[var(--text)] tabular-nums font-mono">
                            {curSymbol}{(extractedReceipt.totalCents / 100).toFixed(2)} Total
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {activeMembers.map((m) => {
                            const tag = getMemberTagColor(m.user_id);
                            const userShareCents = itemizedShares[m.user_id] || 0;
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
                                    className="w-4 h-4 rounded text-[9px] font-bold border flex items-center justify-center shrink-0"
                                  >
                                    {m.name.slice(0, 2).toUpperCase()}
                                  </span>
                                  <span className="truncate max-w-[95px]">{m.name}</span>
                                </div>
                                <span className="tabular-nums font-semibold">
                                  {curSymbol}{(userShareCents / 100).toFixed(2)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs font-mono pt-1">
                        <span className="text-[var(--muted)] uppercase">ASSIGN ITEMS TO TRAVELERS:</span>
                        {extractedReceipt.items.length > 0 && (
                          <button
                            type="button"
                            onClick={splitAllWithEveryone}
                            className="text-[11px] text-[var(--text)] hover:underline cursor-pointer font-mono"
                          >
                            Reset All to Everyone
                          </button>
                        )}
                      </div>

                      {extractedReceipt.items.length === 0 ? (
                        <div className="p-4 rounded-xl bg-[var(--canvas)] border border-[var(--border)] text-center text-xs text-[var(--muted)] font-mono">
                          No itemized line items detected. Switch to Split Equally to divide the total evenly across travelers.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                          {extractedReceipt.items.map((item, idx) => {
                            const isSplitWithAll = item.claimedByUserIds.length === activeMembers.length;
                            const splitCount = Math.max(1, item.claimedByUserIds.length);
                            const perPersonItemCents = Math.round(item.priceCents / splitCount);

                            return (
                              <div
                                key={idx}
                                className="p-3 rounded-xl bg-[var(--canvas)] border border-[var(--border)] space-y-2 text-xs"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="min-w-0 pr-2">
                                    <div className="font-semibold text-[var(--text)] font-body truncate">
                                      {item.name}
                                    </div>
                                    <div className="font-mono text-xs text-[var(--text)] tabular-nums mt-0.5">
                                      {curSymbol}{(item.priceCents / 100).toFixed(2)}
                                      {splitCount > 1 && (
                                        <span className="text-[11px] font-normal text-[var(--muted)] ml-1.5">
                                          ({curSymbol}{(perPersonItemCents / 100).toFixed(2)} each · {splitCount} people)
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => setItemToEveryone(idx)}
                                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors shrink-0 cursor-pointer ${
                                      isSplitWithAll
                                        ? 'bg-white/10 border border-white/20 text-[var(--text)] font-semibold'
                                        : 'bg-[var(--surface-elevated)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
                                    }`}
                                  >
                                    Everyone
                                  </button>
                                </div>

                                {/* Member Toggle Chips */}
                                <div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-[var(--border)]">
                                  {activeMembers.map((m) => {
                                    const isClaimed = item.claimedByUserIds.includes(m.user_id);
                                    const tag = getMemberTagColor(m.user_id);
                                    return (
                                      <button
                                        key={m.user_id}
                                        type="button"
                                        onClick={() => toggleItemMember(idx, m.user_id)}
                                        className={`px-2 py-0.5 rounded text-xs font-mono transition-colors cursor-pointer flex items-center gap-1 ${
                                          isClaimed
                                            ? 'bg-[var(--surface-elevated)] border border-white/30 text-[var(--text)] font-medium'
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
                                        <span>{m.name.split(' ')[0]}</span>
                                        {isClaimed && <Check className="w-2.5 h-2.5 text-[var(--text)]" />}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions Footer: Single Lime Button for Primary Action */}
                  <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                    <Button 
                      variant="ghost" 
                      size="md" 
                      onClick={() => setExtractedReceipt(null)}
                      icon={<RotateCcw className="w-3.5 h-3.5" />}
                    >
                      Scan Another
                    </Button>
                    <Button 
                      variant="primary" 
                      size="md" 
                      onClick={handleConfirm} 
                      icon={<ArrowRight className="w-4 h-4" />}
                      className="font-body font-bold"
                    >
                      Confirm & Split Bill
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

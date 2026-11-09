import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Sparkles, ArrowRight, Users, ListFilter, Check, User } from 'lucide-react';
import { aiService } from '../../api/services';
import { Button } from '../ui/Button';
import { getCurrencySymbol } from '../../lib/currency';

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
    paidByUserId?: string
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
  const allUserIds = activeMembers.map(m => m.user_id);

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
      setErrorMsg('Could not parse receipt image. Please ensure the image is clear or try again.');
    } finally {
      setIsScanning(false);
    }
  };

  // Toggle a member in or out of an item split
  const toggleItemMember = (itemIdx: number, userId: string) => {
    if (!extractedReceipt) return;
    setExtractedReceipt(prev => {
      if (!prev) return prev;
      const nextItems = [...prev.items];
      const currentClaimed = nextItems[itemIdx].claimedByUserIds;
      const alreadyClaimed = currentClaimed.includes(userId);

      let updatedClaimed: string[];
      if (alreadyClaimed) {
        // If clicking to unselect, don't allow 0 members; keep at least this member or switch
        updatedClaimed = currentClaimed.filter(id => id !== userId);
        if (updatedClaimed.length === 0) {
          updatedClaimed = [userId];
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
    setExtractedReceipt(prev => {
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
    setExtractedReceipt(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map(it => ({
          ...it,
          claimedByUserIds: [...allUserIds],
        })),
      };
    });
  };

  const handleConfirm = () => {
    if (!extractedReceipt) return;
    const selectedPayer = paidByUserId || currentUserId || activeMembers[0]?.user_id;

    onConfirmExpense(
      extractedReceipt.merchant,
      extractedReceipt.totalCents,
      splitMode,
      splitMode === 'ITEMIZED' ? extractedReceipt.items : undefined,
      extractedReceipt.taxCents,
      extractedReceipt.tipCents,
      selectedPayer
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-xl rounded-3xl bg-[#0F1117] border border-white/12 shadow-[0_24px_64px_rgba(0,0,0,0.9)] overflow-hidden my-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/8 bg-[#07080D]/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#171A23] border border-white/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#C6FF3D]" />
              </div>
              <div>
                <h3 className="text-base font-display font-bold text-[#EDEEF2] m-0">
                  Upload Bill
                </h3>
                <p className="text-[11px] text-[#8A8FA3] font-body m-0 mt-0.5">
                  Scan receipt and split between all party members
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#8A8FA3] hover:text-[#EDEEF2] hover:bg-white/6 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            {!extractedReceipt ? (
              /* Dropzone */
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
                onClick={() => fileInputRef.current?.click()}
                className={`relative rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center cursor-pointer overflow-hidden transition-all select-none ${
                  dragOver
                    ? 'border-[#C6FF3D] bg-[#C6FF3D]/5'
                    : 'border-white/12 bg-[#07080D] hover:border-white/24 hover:bg-[#171A23]/30'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />

                {isScanning && (
                  <motion.div
                    initial={{ top: '0%' }}
                    animate={{ top: ['0%', '100%', '0%'] }}
                    transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                    className="absolute left-0 right-0 h-0.5 bg-[#C6FF3D] pointer-events-none z-10"
                  />
                )}

                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-[#171A23] border border-white/10 flex items-center justify-center shadow-inner">
                    <Upload className="w-6 h-6 text-[#C6FF3D]" />
                  </div>

                  <div>
                    <div className="text-sm font-display font-semibold text-[#EDEEF2]">
                      {isScanning ? 'Scanning Bill...' : 'Drop receipt or click to upload'}
                    </div>
                    <p className="text-xs text-[#8A8FA3] font-body mt-1 max-w-sm">
                      Upload photo or PDF to split automatically
                    </p>
                  </div>

                  {errorMsg && (
                    <div className="text-xs font-mono text-[#FF5C7A] mt-2">
                      {errorMsg}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Parsed Receipt Review & Split Configuration */
              <div className="space-y-4">
                {/* Bill Header Info Card */}
                <div className="p-4 rounded-2xl bg-[#07080D] border border-white/8 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-display font-bold text-[#EDEEF2]">
                      {extractedReceipt.merchant}
                    </div>
                    <div className="text-xs text-[#8A8FA3] font-mono mt-0.5">
                      {activeMembers.length} {activeMembers.length === 1 ? 'Party Member' : 'Party Members'}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-mono font-bold text-[#C6FF3D] tabular-nums">
                      {curSymbol}{(extractedReceipt.totalCents / 100).toFixed(2)}
                    </div>
                    <span className="text-[10px] text-[#8A8FA3] font-mono">Total Bill</span>
                  </div>
                </div>

                {/* Who Paid Section */}
                <div className="p-3.5 rounded-2xl bg-[#07080D] border border-white/6 space-y-2">
                  <div className="text-xs font-mono text-[#8A8FA3] flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#C6FF3D]" />
                    <span>WHO PAID THE BILL?</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {activeMembers.map((m) => {
                      const isPayer = (paidByUserId || currentUserId) === m.user_id;
                      return (
                        <button
                          key={m.user_id}
                          type="button"
                          onClick={() => setPaidByUserId(m.user_id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer ${
                            isPayer
                              ? 'bg-[#171A23] border border-[#C6FF3D] text-[#C6FF3D]'
                              : 'bg-transparent border border-white/8 text-[#8A8FA3] hover:text-[#EDEEF2]'
                          }`}
                        >
                          {m.name} {m.user_id === currentUserId ? '(You)' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Split Method Toggle: Split Equally vs Itemized */}
                <div className="space-y-2">
                  <div className="text-xs font-mono text-[#8A8FA3] uppercase">
                    HOW DO YOU WANT TO SPLIT?
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSplitMode('EQUAL')}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-mono font-medium transition-all cursor-pointer ${
                        splitMode === 'EQUAL'
                          ? 'bg-[#171A23] border-[#C6FF3D] text-[#C6FF3D]'
                          : 'bg-[#07080D] border-white/8 text-[#8A8FA3] hover:text-[#EDEEF2]'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Split Equally (All)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSplitMode('ITEMIZED')}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-mono font-medium transition-all cursor-pointer ${
                        splitMode === 'ITEMIZED'
                          ? 'bg-[#171A23] border-[#C6FF3D] text-[#C6FF3D]'
                          : 'bg-[#07080D] border-white/8 text-[#8A8FA3] hover:text-[#EDEEF2]'
                      }`}
                    >
                      <ListFilter className="w-3.5 h-3.5" />
                      <span>Split by Items</span>
                    </button>
                  </div>
                </div>

                {/* Equal Split Preview Panel */}
                {splitMode === 'EQUAL' ? (
                  <div className="p-4 rounded-2xl bg-[#07080D] border border-white/8 space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#8A8FA3]">PER PERSON SHARE:</span>
                      <span className="text-base font-bold text-[#C6FF3D] tabular-nums">
                        {curSymbol}{(perPersonEqualCents / 100).toFixed(2)}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-white/6 space-y-1.5">
                      <div className="text-[11px] text-[#8A8FA3] font-body">
                        Split equally among all {activeMembers.length} members:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {activeMembers.map(m => (
                          <span
                            key={m.user_id}
                            className="px-2.5 py-1 rounded-lg bg-[#171A23] border border-white/8 text-xs font-mono text-[#EDEEF2] flex items-center gap-1.5"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-[#C6FF3D]" />
                            <span>{m.name}: {curSymbol}{(perPersonEqualCents / 100).toFixed(2)}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Itemized Split Selector with "Everyone" Pills */
                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#8A8FA3]">SELECT WHO SHARES EACH ITEM:</span>
                      <button
                        type="button"
                        onClick={splitAllWithEveryone}
                        className="text-[11px] text-[#C6FF3D] hover:underline cursor-pointer"
                      >
                        Reset All to Everyone
                      </button>
                    </div>

                    {extractedReceipt.items.map((item, idx) => {
                      const isSplitWithAll = item.claimedByUserIds.length === activeMembers.length;
                      const splitCount = Math.max(1, item.claimedByUserIds.length);
                      const perPersonItemCents = Math.round(item.priceCents / splitCount);

                      return (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-[#07080D] border border-white/6 space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-[#EDEEF2] font-body">{item.name}</div>
                              <div className="font-mono text-xs font-bold text-[#C6FF3D] tabular-nums mt-0.5">
                                {curSymbol}{(item.priceCents / 100).toFixed(2)}
                                {splitCount > 1 && (
                                  <span className="text-[11px] font-normal text-[#8A8FA3] ml-1.5">
                                    ({curSymbol}{(perPersonItemCents / 100).toFixed(2)} each • {splitCount} people)
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* "Everyone" Quick Button */}
                            <button
                              type="button"
                              onClick={() => setItemToEveryone(idx)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                                isSplitWithAll
                                  ? 'bg-[#C6FF3D]/15 border border-[#C6FF3D] text-[#C6FF3D]'
                                  : 'bg-[#171A23] border border-white/8 text-[#8A8FA3] hover:text-[#EDEEF2]'
                              }`}
                            >
                              Everyone
                            </button>
                          </div>

                          {/* Member Chips for this item */}
                          <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-white/6">
                            {activeMembers.map((m) => {
                              const isClaimed = item.claimedByUserIds.includes(m.user_id);
                              return (
                                <button
                                  key={m.user_id}
                                  type="button"
                                  onClick={() => toggleItemMember(idx, m.user_id)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer flex items-center gap-1 ${
                                    isClaimed
                                      ? 'bg-[#171A23] border border-[#C6FF3D] text-[#C6FF3D]'
                                      : 'bg-transparent border border-white/6 text-[#8A8FA3] hover:text-[#EDEEF2]'
                                  }`}
                                >
                                  {isClaimed && <Check className="w-3 h-3 text-[#C6FF3D]" />}
                                  <span>{m.name.split(' ')[0]}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/8">
                  <Button variant="ghost" size="md" onClick={() => setExtractedReceipt(null)}>
                    Scan Another
                  </Button>
                  <Button variant="primary" size="md" onClick={handleConfirm} icon={<ArrowRight className="w-4 h-4" />}>
                    Confirm & Split Bill
                  </Button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

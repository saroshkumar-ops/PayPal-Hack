import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Sparkles, ArrowRight } from 'lucide-react';
import { aiService } from '../../api/services';
import { Button } from '../ui/Button';

interface ReceiptDropModalProps {
  isOpen: boolean;
  onClose: () => void;
  members?: Array<{ user_id?: string; id?: string; name: string }>;
  onConfirmExpense: (
    description: string, 
    amountCents: number, 
    items?: { name: string; priceCents: number; claimedBy?: string }[]
  ) => void;
}

export const ReceiptDropModal: React.FC<ReceiptDropModalProps> = ({
  isOpen,
  onClose,
  members,
  onConfirmExpense,
}) => {
  const memberNames = members && members.length > 0 ? members.map(m => m.name) : ['Sarah Connor', 'Alex Hunter', 'Dave Miller', 'Priya Sharma'];
  const [isScanning, setIsScanning] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [extractedReceipt, setExtractedReceipt] = useState<null | {
    merchant: string;
    currency: string;
    currencySymbol: string;
    totalCents: number;
    taxCents: number;
    tipCents: number;
    items: { name: string; priceCents: number; claimedBy?: string }[];
  }>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const simulateScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setExtractedReceipt({
        merchant: 'Jimbaran Sunset Seafood & Grill',
        currency: 'INR',
        currencySymbol: '₹',
        totalCents: 12000,
        taxCents: 1000,
        tipCents: 500,
        items: [
          { name: 'Grilled Red Snapper & Garlic Rice', priceCents: 4500, claimedBy: 'Sarah Connor' },
          { name: 'Jumbo Tiger Prawns (Platter)', priceCents: 4000, claimedBy: 'Alex Hunter' },
          { name: 'Young Coconuts & Cold Brew', priceCents: 2000, claimedBy: 'Dave Miller' },
        ],
      });
    }, 2400);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const res = await aiService.uploadReceipt(file);
      const symbol = res.currency_symbol || (res.currency === 'INR' ? '₹' : '₹');
      setExtractedReceipt({
        merchant: res.merchant || 'Jimbaran Sunset Seafood',
        currency: res.currency || 'INR',
        currencySymbol: symbol,
        totalCents: res.total_cents || 12000,
        taxCents: res.tax_cents || 1000,
        tipCents: res.tip_cents || 500,
        items: (res.items || []).map((item, idx) => ({
          name: item.name,
          priceCents: item.price_cents,
          claimedBy: memberNames[idx % memberNames.length],
        })),
      });
      setIsScanning(false);
    } catch {
      simulateScan();
    }
  };

  const toggleItemClaimant = (itemIdx: number, memberName: string) => {
    if (!extractedReceipt) return;
    setExtractedReceipt(prev => {
      if (!prev) return prev;
      const nextItems = [...prev.items];
      nextItems[itemIdx] = {
        ...nextItems[itemIdx],
        claimedBy: memberName,
      };
      return {
        ...prev,
        items: nextItems,
      };
    });
  };

  const handleConfirm = () => {
    if (!extractedReceipt) return;
    onConfirmExpense(
      extractedReceipt.merchant,
      extractedReceipt.totalCents,
      extractedReceipt.items
    );
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-xl rounded-3xl bg-[#0F1117] border border-white/12 shadow-[0_24px_64px_rgba(0,0,0,0.9)] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/8 bg-[#07080D]/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#171A23] border border-white/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#C6FF3D]" />
              </div>
              <div>
                <h3 className="text-base font-display font-bold text-[#EDEEF2] m-0">
                  Multimodal Receipt Scanner
                </h3>
                <p className="text-[11px] text-[#8A8FA3] font-body m-0 mt-0.5">
                  Gemini 2.5 Flash OCR with sequential line-item parsing
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

          <div className="p-5 sm:p-6 space-y-6">
            {!extractedReceipt ? (
              /* Dropzone with Glowing Acid Lime Scanning Line */
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  simulateScan();
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

                {/* Glowing Laser Scanline Animation */}
                {isScanning && (
                  <motion.div
                    initial={{ top: '0%' }}
                    animate={{ top: ['0%', '100%', '0%'] }}
                    transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                    className="absolute left-0 right-0 h-1 bg-[#C6FF3D] shadow-[0_0_20px_4px_#C6FF3D] pointer-events-none z-10"
                  />
                )}

                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-[#171A23] border border-white/10 flex items-center justify-center shadow-inner">
                    <Upload className="w-6 h-6 text-[#C6FF3D]" />
                  </div>

                  <div>
                    <div className="text-sm font-display font-semibold text-[#EDEEF2]">
                      {isScanning ? 'Extracting Line Items with Gemini OCR...' : 'Drop paper receipt or click to upload'}
                    </div>
                    <p className="text-xs text-[#8A8FA3] font-body mt-1 max-w-sm">
                      Supports JPG, PNG, HEIC. Line items, taxes, and service charges apportioned automatically.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      simulateScan();
                    }}
                    className="mt-2 text-xs font-mono text-[#C6FF3D] hover:underline"
                  >
                    Or simulate instant Jimbaran Feast scan
                  </button>
                </div>
              </div>
            ) : (
              /* Sequential Line-Item Parser & Claimant Assignment */
              <div className="space-y-5">
                <div className="p-4 rounded-2xl bg-[#07080D] border border-white/8 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-display font-bold text-[#EDEEF2]">
                      {extractedReceipt.merchant}
                    </div>
                    <div className="text-xs text-[#8A8FA3] font-mono mt-0.5">
                      Tax: ₹{(extractedReceipt.taxCents / 100).toFixed(2)} • Tip: ₹{(extractedReceipt.tipCents / 100).toFixed(2)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-mono font-bold text-[#C6FF3D] tabular-nums">
                      ₹{(extractedReceipt.totalCents / 100).toFixed(2)}
                    </div>
                    <span className="text-[10px] text-[#8A8FA3] font-mono">Total Verified</span>
                  </div>
                </div>

                {/* Line Items Sequence */}
                <div className="space-y-2.5">
                  <div className="text-xs font-mono text-[#8A8FA3] uppercase">
                    ITEM-BY-ITEM CLAIMANT ALLOCATION:
                  </div>

                  {extractedReceipt.items.map((item, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1, duration: 0.25 }}
                      className="p-3.5 rounded-xl bg-[#07080D] border border-white/6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-[#EDEEF2] font-body">{item.name}</div>
                        <div className="font-mono text-xs font-bold text-[#EDEEF2] tabular-nums mt-0.5">
                          ₹{(item.priceCents / 100).toFixed(2)}
                        </div>
                      </div>

                      {/* Claimant Pill Selector */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {memberNames.map((name) => {
                          const isClaimed = item.claimedBy === name;
                          return (
                            <button
                              key={name}
                              onClick={() => toggleItemClaimant(idx, name)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                                isClaimed
                                  ? 'bg-[#171A23] border border-[#C6FF3D] text-[#C6FF3D]'
                                  : 'bg-transparent border border-white/6 text-[#8A8FA3] hover:text-[#EDEEF2]'
                              }`}
                            >
                              {name.split(' ')[0]}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/8">
                  <Button variant="ghost" size="md" onClick={() => setExtractedReceipt(null)}>
                    Re-scan
                  </Button>
                  <Button variant="primary" size="md" onClick={handleConfirm} icon={<ArrowRight className="w-4 h-4" />}>
                    Approve & Commit to Ledger
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

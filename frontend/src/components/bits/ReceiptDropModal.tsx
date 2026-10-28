import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Sparkles, CheckCircle2, Receipt } from 'lucide-react';

interface ReceiptDropModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmExpense: (description: string, amountCents: number) => void;
}

export const ReceiptDropModal: React.FC<ReceiptDropModalProps> = ({
  isOpen,
  onClose,
  onConfirmExpense,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [extractedReceipt, setExtractedReceipt] = useState<null | {
    merchant: string;
    totalCents: number;
    taxCents: number;
    tipCents: number;
    items: { name: string; priceCents: number; claimedBy?: string }[];
  }>(null);

  const simulateScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setExtractedReceipt({
        merchant: 'Sunset Beach Bistro (Seminyak)',
        totalCents: 15600,
        taxCents: 1200,
        tipCents: 2400,
        items: [
          { name: 'Grilled Red Snapper & Rice', priceCents: 4500, claimedBy: 'Sarah' },
          { name: 'Truffle Parmesan Fries', priceCents: 2500, claimedBy: 'Alex' },
          { name: 'Tropical Craft Mojitos (x3)', priceCents: 5000, claimedBy: 'Alex' },
        ],
      });
    }, 1500);
  };

  const handleClaim = (index: number) => {
    if (!extractedReceipt) return;
    const updated = { ...extractedReceipt };
    const curr = updated.items[index].claimedBy;
    updated.items[index].claimedBy = curr === 'Alex' ? 'Dave' : curr === 'Dave' ? 'Sarah' : 'Alex';
    setExtractedReceipt(updated);
  };

  const handleSave = () => {
    if (!extractedReceipt) return;
    onConfirmExpense(extractedReceipt.merchant, extractedReceipt.totalCents);
    setExtractedReceipt(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-[#0E121B] p-6 shadow-2xl"
        >
          {/* Subtle Ambient Radial Glow */}
          <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-blue-500/15 blur-3xl" />

          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-500/20 to-blue-500/20 text-purple-400 border border-purple-500/30">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white m-0">Gemini 2.0 Receipt Itemizer</h3>
                <p className="text-xs text-zinc-400 m-0">Multimodal OCR & Proportional Tax/Tip Split</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="mt-5 space-y-4">
            {!extractedReceipt ? (
              <div
                onClick={simulateScan}
                className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
                  isScanning
                    ? 'border-blue-500/60 bg-blue-500/[0.04]'
                    : 'border-white/15 bg-zinc-900/40 hover:border-white/30 hover:bg-zinc-900/60'
                }`}
              >
                {isScanning ? (
                  <div className="flex flex-col items-center space-y-3 py-4">
                    <div className="relative h-12 w-12">
                      <div className="absolute inset-0 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                      <Receipt className="absolute inset-2.5 h-7 w-7 text-blue-400" />
                    </div>
                    <div className="text-sm font-semibold text-white">Extracting Line Items...</div>
                    <p className="text-xs text-zinc-400">Gemini 2.0 Flash Vision parsing image bytes</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.05] border border-white/10 text-zinc-300">
                      <Upload className="h-6 w-6 text-blue-400" />
                    </div>
                    <div className="text-sm font-semibold text-zinc-200">
                      Click to upload or drag receipt photo
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">
                      JPG, PNG, HEIC up to 10MB (Simulates Sunset Beach Bistro sample)
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Merchant & Total */}
                <div className="flex items-center justify-between rounded-2xl bg-zinc-900/80 p-4 border border-white/10">
                  <div>
                    <div className="text-xs text-zinc-400">Merchant Detected</div>
                    <div className="text-sm font-bold text-white">{extractedReceipt.merchant}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-zinc-400">Total with Tax & Tip</div>
                    <div className="text-base font-bold font-mono text-emerald-400">
                      ${(extractedReceipt.totalCents / 100).toFixed(2)} USD
                    </div>
                  </div>
                </div>

                {/* Extracted Items Claim Grid */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Extracted Line Items (Tap to change claimant):
                  </div>
                  {extractedReceipt.items.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleClaim(idx)}
                      className="flex items-center justify-between rounded-xl bg-zinc-900/50 p-3 border border-white/5 hover:border-white/15 cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/20 text-xs font-mono font-bold text-blue-300">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="text-xs font-medium text-white">{item.name}</div>
                          <div className="text-[11px] text-zinc-400 font-mono">
                            ${(item.priceCents / 100).toFixed(2)} USD
                          </div>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/10 text-zinc-200 border border-white/10">
                        Claimed: {item.claimedBy}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => setExtractedReceipt(null)}
                    className="text-xs text-zinc-400 hover:text-white"
                  >
                    Scan Another
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:brightness-110"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Split & Post to Ledger
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

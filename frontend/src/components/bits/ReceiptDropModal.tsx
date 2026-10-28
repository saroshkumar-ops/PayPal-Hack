import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, CheckCircle2 } from 'lucide-react';
import { Logo } from '../common/Logo';

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
    }, 1200);
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-[#33475A] bg-[#1F2C38] p-6 shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#33475A] pb-3.5 mb-4">
            <div className="flex items-center gap-2.5">
              <Logo size="sm" showText={false} />
              <div>
                <h3 className="text-sm font-bold text-[#E7EDF2] m-0">Gemini Receipt Itemizer</h3>
                <p className="text-[11px] text-[#8199AE] m-0">Multimodal OCR & Proportional Tax/Tip Split</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-[#8199AE] hover:text-[#E7EDF2] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="space-y-4">
            {!extractedReceipt ? (
              <div
                onClick={simulateScan}
                className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#33475A] bg-[#10161C] p-8 text-center cursor-pointer hover:border-[#4E6A83] transition-all"
              >
                {isScanning ? (
                  <div className="flex flex-col items-center space-y-2 py-3">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#E7EDF2] border-t-transparent" />
                    <div className="text-xs font-semibold text-[#E7EDF2] mt-2">Extracting Line Items...</div>
                    <p className="text-[11px] text-[#8199AE] m-0">Gemini 2.0 Flash Vision parsing image</p>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-[#8199AE] mb-2" />
                    <div className="text-xs font-semibold text-[#E7EDF2]">
                      Click to upload or drag receipt photo
                    </div>
                    <p className="text-[11px] text-[#8199AE] mt-1 m-0">
                      Simulates Sunset Beach Bistro sample receipt
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between rounded-xl bg-[#10161C] p-3 border border-[#33475A]">
                  <div>
                    <div className="text-[10px] text-[#8199AE] uppercase font-mono">Merchant</div>
                    <div className="text-xs font-bold text-[#E7EDF2]">{extractedReceipt.merchant}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-[#8199AE] uppercase font-mono">Total (with Tax/Tip)</div>
                    <div className="text-sm font-bold font-mono text-[#E7EDF2]">
                      ${(extractedReceipt.totalCents / 100).toFixed(2)} USD
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] font-mono text-[#8199AE] uppercase">
                    Extracted Line Items (Tap to change claimant):
                  </div>
                  {extractedReceipt.items.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleClaim(idx)}
                      className="flex items-center justify-between rounded-xl bg-[#10161C] p-2.5 border border-[#33475A] hover:border-[#4E6A83] cursor-pointer transition-all text-xs"
                    >
                      <div>
                        <div className="font-medium text-[#E7EDF2]">{item.name}</div>
                        <div className="text-[10px] text-[#8199AE] font-mono">
                          ${(item.priceCents / 100).toFixed(2)} USD
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#1F2C38] text-[#E7EDF2] border border-[#33475A]">
                        {item.claimedBy}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => setExtractedReceipt(null)}
                    className="text-xs text-[#8199AE] hover:text-[#E7EDF2] cursor-pointer"
                  >
                    Scan Another
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1.5 rounded-xl bg-[#4E6A83] hover:bg-[#33475A] px-4 py-2 text-xs font-semibold text-[#E7EDF2] transition-all cursor-pointer shadow-sm"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Save & Split
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

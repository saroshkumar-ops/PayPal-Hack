import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  CreditCard, 
  Lock, 
  CheckCircle2
} from 'lucide-react';

interface PayPalCheckoutDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  debtorName: string;
  debtorHandle: string;
  creditorName: string;
  description: string;
  amountCents: number;
  onConfirmPayment: () => Promise<void>;
}

export const PayPalCheckoutDrawer: React.FC<PayPalCheckoutDrawerProps> = ({
  isOpen,
  onClose,
  debtorName,
  debtorHandle,
  creditorName,
  description,
  amountCents,
  onConfirmPayment,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'paypal' | 'card'>('paypal');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const formattedAmount = (amountCents / 100).toFixed(2);

  const handlePay = async () => {
    setIsProcessing(true);
    await onConfirmPayment();
    setIsProcessing(false);
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1800);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0C1019] p-6 shadow-2xl"
        >
          {/* Subtle Ambient Radial Glow */}
          <div className="pointer-events-none absolute -top-24 -right-24 h-60 w-60 rounded-full bg-blue-500/20 blur-3xl" />

          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#0070E0]/20 text-[#0070E0] border border-[#0070E0]/30 font-bold text-xs">
                PP
              </div>
              <div>
                <h3 className="text-sm font-bold text-white m-0">PayPal Express Checkout</h3>
                <p className="text-[11px] text-zinc-400 m-0">Orders API (v2) Sandbox Rail</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Order Summary Card */}
          <div className="my-5 p-4 rounded-2xl bg-zinc-900/60 border border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">Debt Item</span>
              <span className="text-xs font-semibold text-white">{description}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">Payer (You)</span>
              <span className="text-xs font-mono text-zinc-200">{debtorName} ({debtorHandle})</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">Fronted By</span>
              <span className="text-xs font-semibold text-emerald-400">{creditorName}</span>
            </div>
            <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
              <span className="text-sm font-bold text-white">Amount Due</span>
              <span className="text-xl font-bold font-mono text-white tracking-tight">
                ${formattedAmount} <span className="text-xs text-zinc-400 font-sans font-normal">USD</span>
              </span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-2.5 mb-5">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
              Payment Method:
            </label>

            {/* Option 1: PayPal Account */}
            <div
              onClick={() => setSelectedMethod('paypal')}
              className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                selectedMethod === 'paypal'
                  ? 'border-[#0070E0] bg-[#0070E0]/10 shadow-lg shadow-blue-500/10'
                  : 'border-white/5 bg-zinc-900/40 hover:border-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-[#0070E0] to-[#003087] text-white font-extrabold text-xs">
                  P
                </div>
                <div>
                  <div className="text-xs font-bold text-white">PayPal Balance / Linked Bank</div>
                  <div className="text-[10px] text-zinc-400">Instant Sandbox Capture • No Fees</div>
                </div>
              </div>
              <div
                className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                  selectedMethod === 'paypal' ? 'border-[#0070E0] bg-[#0070E0]' : 'border-zinc-600'
                }`}
              >
                {selectedMethod === 'paypal' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
              </div>
            </div>

            {/* Option 2: Debit/Credit Card */}
            <div
              onClick={() => setSelectedMethod('card')}
              className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                selectedMethod === 'card'
                  ? 'border-[#0070E0] bg-[#0070E0]/10'
                  : 'border-white/5 bg-zinc-900/40 hover:border-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-800 text-zinc-300">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-200">Debit or Credit Card</div>
                  <div className="text-[10px] text-zinc-500">Processed through PayPal Guest Checkout</div>
                </div>
              </div>
              <div
                className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                  selectedMethod === 'card' ? 'border-[#0070E0] bg-[#0070E0]' : 'border-zinc-600'
                }`}
              >
                {selectedMethod === 'card' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
              </div>
            </div>
          </div>

          {/* Security Assurance */}
          <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-500 mb-5">
            <Lock className="w-3.5 h-3.5 text-zinc-400" />
            <span>Encrypted with PayPal Sandbox 256-bit TLS</span>
          </div>

          {/* Action CTA Button */}
          {isSuccess ? (
            <div className="w-full py-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Payment Captured! Debt Cleared.
            </div>
          ) : (
            <button
              onClick={handlePay}
              disabled={isProcessing}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#0070E0] via-[#005ea6] to-[#003087] hover:brightness-110 text-white font-bold text-xs shadow-xl shadow-blue-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Capturing PayPal Order...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  Pay ${formattedAmount} USD with PayPal
                </>
              )}
            </button>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

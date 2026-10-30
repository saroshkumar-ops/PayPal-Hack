import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, Lock, CheckCircle2 } from 'lucide-react';
import { Logo } from '../common/Logo';

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
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-[#33475A] bg-[#1F2C38] p-5 sm:p-6 shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-[#33475A]">
            <div className="flex items-center gap-2.5">
              <Logo size="sm" showText={false} />
              <div>
                <h3 className="text-sm font-bold text-[#E7EDF2] m-0">PayPal Express Checkout</h3>
                <p className="text-[11px] text-[#8199AE] m-0">Orders API (v2) Sandbox Rail</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-[#8199AE] hover:text-[#E7EDF2] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Order Summary Card */}
          <div className="my-4 p-4 rounded-xl bg-[#10161C] border border-[#33475A] space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#8199AE]">Item Description</span>
              <span className="font-semibold text-[#E7EDF2]">{description}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#8199AE]">Debtor Account</span>
              <span className="font-mono text-[#B7C6D3]">{debtorName} ({debtorHandle})</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#8199AE]">Fronted By</span>
              <span className="font-semibold text-[#E7EDF2]">{creditorName}</span>
            </div>
            <div className="pt-2 border-t border-[#33475A] flex items-center justify-between">
              <span className="font-bold text-[#E7EDF2]">Total Share</span>
              <span className="text-lg font-bold font-mono text-[#E7EDF2]">
                ${formattedAmount} <span className="text-xs text-[#8199AE] font-normal">USD</span>
              </span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-2 mb-4">
            <div
              onClick={() => setSelectedMethod('paypal')}
              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                selectedMethod === 'paypal'
                  ? 'border-[#4E6A83] bg-[#10161C]'
                  : 'border-[#33475A] bg-[#10161C]/50 hover:border-[#4E6A83]/50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1F2C38] text-[#E7EDF2] font-bold text-xs border border-[#33475A]">
                  P
                </div>
                <div>
                  <div className="text-xs font-bold text-[#E7EDF2]">PayPal Sandbox Account</div>
                  <div className="text-[10px] text-[#8199AE]">Instant capture • Zero transaction fees</div>
                </div>
              </div>
              <div
                className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center ${
                  selectedMethod === 'paypal' ? 'border-[#E7EDF2] bg-[#E7EDF2]' : 'border-[#33475A]'
                }`}
              >
                {selectedMethod === 'paypal' && <div className="h-1.5 w-1.5 rounded-full bg-[#10161C]" />}
              </div>
            </div>

            <div
              onClick={() => setSelectedMethod('card')}
              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                selectedMethod === 'card'
                  ? 'border-[#4E6A83] bg-[#10161C]'
                  : 'border-[#33475A] bg-[#10161C]/50 hover:border-[#4E6A83]/50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1F2C38] text-[#8199AE] border border-[#33475A]">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#E7EDF2]">Credit or Debit Card</div>
                  <div className="text-[10px] text-[#8199AE]">Guest Checkout via PayPal</div>
                </div>
              </div>
              <div
                className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center ${
                  selectedMethod === 'card' ? 'border-[#E7EDF2] bg-[#E7EDF2]' : 'border-[#33475A]'
                }`}
              >
                {selectedMethod === 'card' && <div className="h-1.5 w-1.5 rounded-full bg-[#10161C]" />}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#8199AE] mb-4">
            <Lock className="w-3.5 h-3.5 text-[#8199AE]" />
            <span>Encrypted with PayPal Sandbox 256-bit TLS</span>
          </div>

          {/* CTA */}
          {isSuccess ? (
            <div className="w-full py-3 rounded-xl bg-[#10161C] border border-[#4E6A83] text-[#E7EDF2] font-bold text-xs flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#E7EDF2]" />
              Captured! Debt Cleared.
            </div>
          ) : (
            <button
              onClick={handlePay}
              disabled={isProcessing}
              className="w-full py-3 px-4 rounded-xl bg-[#4E6A83] hover:bg-[#33475A] text-[#E7EDF2] font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <div className="h-3.5 w-3.5 rounded-full border-2 border-[#E7EDF2] border-t-transparent animate-spin" />
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

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, Lock, CheckCircle2, Copy, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import { getCurrencySymbol } from '../../lib/currency';

interface PayPalCheckoutDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  debtorName: string;
  debtorHandle: string;
  creditorName: string;
  description: string;
  amountCents: number;
  currency?: string;
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
  currency = 'INR',
  onConfirmPayment,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const cur = getCurrencySymbol(currency);
  const formattedAmount = (amountCents / 100).toFixed(2);
  const paypalUrl = `https://www.sandbox.paypal.com/checkoutnow?token=SIM_${amountCents}_${Date.now()}`;

  // Keyboard accessibility: dismiss on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handlePay = async () => {
    setIsProcessing(true);
    await onConfirmPayment();
    setIsProcessing(false);
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1400);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(paypalUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="paypal-checkout-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-[0_24px_64px_rgba(0,0,0,0.9)] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 sm:p-6 border-b border-[var(--border)] bg-[var(--surface-elevated)]">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--paypal)]" />
              <h3 id="paypal-checkout-title" className="text-sm font-display font-bold text-[var(--text)] m-0">
                Pay with PayPal
              </h3>
            </div>
            <button
              onClick={onClose}
              aria-label="Close PayPal checkout dialog"
              className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-white/6 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            {/* Amount Callout */}
            <div className="text-center p-5 rounded-2xl bg-[var(--canvas)] border border-[var(--border)]">
              <div className="text-xs font-mono text-[var(--muted)] uppercase tracking-wider">
                AMOUNT DUE
              </div>
              <div className="text-3xl sm:text-4xl font-mono font-bold text-[var(--text)] tabular-nums mt-1">
                <span className="text-[var(--paypal)] mr-1">{cur}</span>
                {formattedAmount}
              </div>
              <div className="text-xs text-[var(--muted)] font-body mt-1">
                {debtorName} ({debtorHandle}) owes {creditorName} {description ? `• ${description}` : ''}
              </div>
            </div>

            {/* Generated PayPal Link with Satisfying Copy Interaction */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono text-[var(--muted)]">
                <span>CHECKOUT LINK</span>
                <span className="text-[var(--text)] font-semibold">READY</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--canvas)] border border-[var(--border)]">
                <span className="flex-1 font-mono text-xs text-[var(--muted)] truncate">
                  {paypalUrl}
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--surface-elevated)] hover:bg-white/10 border border-[var(--border)] text-xs font-mono text-[var(--text)] transition-colors cursor-pointer shrink-0"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-[var(--settled)]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Status & Security */}
            <div className="p-3 rounded-xl bg-[var(--surface-elevated)]/60 border border-[var(--border)] flex items-center justify-between text-xs font-mono text-[var(--muted)]">
              <div className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[var(--muted)]" />
                <span>PayPal Sandbox</span>
              </div>
              <span className="text-[var(--text)]">Status: Unpaid</span>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <Button
                variant="paypal"
                size="lg"
                onClick={handlePay}
                disabled={isProcessing || isSuccess}
                icon={isSuccess ? <CheckCircle2 className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                className="w-full text-sm font-display font-bold"
              >
                {isSuccess ? 'Payment Complete!' : isProcessing ? 'Processing...' : 'Pay Now with PayPal'}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

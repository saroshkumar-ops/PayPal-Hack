import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, ArrowUpRight } from 'lucide-react';
import type { Member } from '../../types';
import { Button } from '../ui/Button';
import { getCurrencySymbol } from '../../lib/currency';

interface PayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  organizer: Member;
  amountCents: number;
  currency?: string;
  isLoading: boolean;
}

export const PayoutModal: React.FC<PayoutModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  organizer,
  amountCents,
  currency = 'INR',
  isLoading,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const cur = getCurrencySymbol(currency);
  const formattedAmount = (amountCents / 100).toFixed(2);
  const paypalAccount = organizer.paypal_email || 'Not configured';

  const handleCopyEmail = () => {
    if (!organizer.paypal_email) return;
    navigator.clipboard.writeText(organizer.paypal_email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="relative w-full max-w-md rounded-2xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-[var(--border)] bg-[var(--surface-elevated)]">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-[var(--paypal)]" />
              <div>
                <h3 className="text-sm font-display font-bold text-[var(--text)] m-0">
                  Transfer Trip Payout
                </h3>
                <p className="text-[11px] text-[var(--muted)] font-mono m-0 mt-0.5">
                  PayPal Payouts API v1
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            {/* Amount Banner */}
            <div className="p-4 rounded-xl bg-[var(--canvas)] border border-[var(--border)] text-center space-y-1">
              <div className="text-[10px] uppercase font-mono tracking-wider text-[var(--muted)]">
                PAYOUT AMOUNT
              </div>
              <div className="text-3xl font-display font-extrabold text-[var(--text)] tabular-nums font-mono">
                {cur}{formattedAmount}
              </div>
              <div className="text-[11px] text-[var(--muted)] font-mono">
                Fee: {cur}0.00 · Instant Transfer
              </div>
            </div>

            {/* Recipient Details & PayPal Reveal */}
            <div className="p-4 rounded-xl bg-[var(--canvas)] border border-[var(--border)] space-y-2.5 text-xs font-mono">
              <div className="flex justify-between items-center text-[var(--muted)]">
                <span>Beneficiary:</span>
                <span className="text-[var(--text)] font-body font-semibold">
                  {organizer.name} ({organizer.handle})
                </span>
              </div>

              {/* PayPal Reveal with Copy Micro-Interaction */}
              <div className="flex justify-between items-center text-[var(--muted)] pt-1 border-t border-[var(--border)]">
                <span>PayPal Account:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[var(--text)] font-semibold truncate max-w-[190px]">
                    {paypalAccount}
                  </span>
                  {organizer.paypal_email && (
                    <button
                      type="button"
                      onClick={handleCopyEmail}
                      title="Copy PayPal Email"
                      className="p-1 rounded bg-[var(--surface-elevated)] hover:bg-white/10 text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-[var(--settled)]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <p className="text-xs text-[var(--muted)] font-body leading-relaxed m-0">
              Transfers all collected trip shares from member settlements directly to {organizer.name}'s PayPal account.
            </p>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <Button variant="ghost" size="md" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button
                variant="paypal"
                size="md"
                onClick={onConfirm}
                disabled={isLoading}
                icon={<ArrowUpRight className="w-4 h-4" />}
                className="flex-1 font-body font-bold"
              >
                {isLoading ? 'Processing...' : 'Confirm Transfer'}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

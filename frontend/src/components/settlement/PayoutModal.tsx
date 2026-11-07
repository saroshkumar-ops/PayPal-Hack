import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, X } from 'lucide-react';
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
  if (!isOpen) return null;

  const cur = getCurrencySymbol(currency);
  const formattedAmount = (amountCents / 100).toFixed(2);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md rounded-3xl bg-[#0F1117] border border-white/12 shadow-[0_24px_64px_rgba(0,0,0,0.9)] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/8 bg-[#07080D]/50">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FFC439]" />
              <div>
                <h3 className="text-sm font-display font-bold text-[#EDEEF2] m-0">
                  Confirm Batch Payout
                </h3>
                <p className="text-[11px] text-[#8A8FA3] font-body m-0 mt-0.5">
                  Human-in-the-Loop Organizer Authorization
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#8A8FA3] hover:text-[#EDEEF2] hover:bg-white/6 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            {/* Beneficiary Breakdown */}
            <div className="p-4 rounded-2xl bg-[#07080D] border border-white/8 space-y-2.5 text-xs font-mono">
              <div className="flex justify-between items-center text-[#8A8FA3]">
                <span>Beneficiary:</span>
                <span className="text-[#EDEEF2] font-body font-semibold">{organizer.name} ({organizer.handle})</span>
              </div>
              <div className="flex justify-between items-center text-[#8A8FA3]">
                <span>PayPal Account:</span>
                <span className="text-[#C6FF3D] truncate max-w-[180px]">{organizer.paypal_email}</span>
              </div>
              <div className="flex justify-between items-center text-[#8A8FA3]">
                <span>Disbursement Amount:</span>
                <span className="text-base font-bold text-[#EDEEF2] tabular-nums">
                  {cur}{formattedAmount}
                </span>
              </div>
              <div className="flex justify-between items-center text-[#8A8FA3]">
                <span>PayPal Fee:</span>
                <span className="text-[#C6FF3D]">{cur}0.00 (Zero Fee)</span>
              </div>
            </div>

            <p className="text-xs text-[#8A8FA3] font-body leading-relaxed m-0">
              Disburses pooled escrow balances collected from debtor checkouts directly to {organizer.name}'s PayPal account via PayPal Batch Payouts API v1.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <Button variant="ghost" size="md" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button
                variant="paypal"
                size="md"
                onClick={onConfirm}
                disabled={isLoading}
                icon={<ShieldCheck className="w-4 h-4" />}
                className="flex-1 text-xs sm:text-sm font-display font-bold"
              >
                {isLoading ? 'Disbursing...' : 'Authorize Payout'}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

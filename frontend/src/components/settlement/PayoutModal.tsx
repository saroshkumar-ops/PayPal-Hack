import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, X, CheckCircle2 } from 'lucide-react';
import type { Member } from '../../types';
import { Logo } from '../common/Logo';

interface PayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  organizer: Member;
  amountCents: number;
  isLoading: boolean;
}

export const PayoutModal: React.FC<PayoutModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  organizer,
  amountCents,
  isLoading,
}) => {
  if (!isOpen) return null;

  const formattedAmount = (amountCents / 100).toFixed(2);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#33475A] bg-[#1F2C38] p-6 shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[#33475A]">
            <div className="flex items-center gap-2.5">
              <Logo size="sm" showText={false} />
              <div>
                <h3 className="text-sm font-bold text-[#E7EDF2] m-0">Confirm Batch Payout</h3>
                <p className="text-[11px] text-[#8199AE] m-0">Human-in-the-Loop Organizer Authorization</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-[#8199AE] hover:text-[#E7EDF2] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Details Card */}
          <div className="p-4 rounded-xl bg-[#10161C] border border-[#33475A] space-y-2.5 mb-4 text-xs font-mono">
            <div className="flex justify-between items-center text-[#8199AE]">
              <span>Beneficiary:</span>
              <span className="text-[#E7EDF2] font-sans font-semibold">{organizer.name} ({organizer.handle})</span>
            </div>

            <div className="flex justify-between items-center text-[#8199AE]">
              <span>PayPal Sandbox Email:</span>
              <span className="text-[#E7EDF2]">{organizer.paypal_email}</span>
            </div>

            <div className="flex justify-between items-center text-[#8199AE]">
              <span>Net Reimbursement:</span>
              <span className="font-bold text-sm text-[#E7EDF2]">${formattedAmount} USD</span>
            </div>

            <div className="flex justify-between items-center text-[#8199AE] pt-2 border-t border-[#33475A] text-[10px]">
              <span>API Method:</span>
              <span className="text-[#8199AE]">POST /v1/payments/payouts</span>
            </div>

            <div className="flex justify-between items-center text-[#8199AE] text-[10px]">
              <span>Idempotency Key:</span>
              <span className="text-[#8199AE] truncate max-w-[180px]">
                UUIDv4-idemp-{Date.now().toString().slice(-8)}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#10161C] border border-[#33475A] mb-5">
            <CheckCircle2 className="h-4 w-4 text-[#8199AE] mt-0.5 shrink-0" />
            <p className="text-[11px] text-[#B7C6D3] m-0 leading-relaxed font-sans">
              Reimburses Sarah Chen via PayPal Batch Payouts API and settles remaining trip splits across the ledger.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#8199AE] hover:text-[#E7EDF2] hover:bg-[#33475A]/40 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#4E6A83] hover:bg-[#33475A] text-[#E7EDF2] transition-all cursor-pointer disabled:opacity-50 shadow-sm"
            >
              <ShieldCheck className="h-4 w-4" />
              {isLoading ? 'Executing Payout...' : 'Confirm & Disburse'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

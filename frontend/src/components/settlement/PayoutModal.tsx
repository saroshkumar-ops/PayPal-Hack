import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, X, CheckCircle2 } from 'lucide-react';
import type { Member } from '../../types';

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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0E121B] p-6 shadow-2xl"
        >
          {/* Subtle Ambient Glow */}
          <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-emerald-500/15 blur-3xl" />

          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white m-0">Confirm Batch Payout</h3>
                <p className="text-xs text-zinc-400 m-0">Human-in-the-Loop Organizer Authorization</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl p-1.5 text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Details Card */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/[0.06] space-y-3 mb-5 text-xs">
            <div className="flex justify-between items-center text-zinc-400">
              <span>Beneficiary:</span>
              <span className="font-semibold text-zinc-100">{organizer.name} ({organizer.handle})</span>
            </div>

            <div className="flex justify-between items-center text-zinc-400">
              <span>PayPal Sandbox Email:</span>
              <span className="font-mono text-cyan-400">{organizer.paypal_email}</span>
            </div>

            <div className="flex justify-between items-center text-zinc-400">
              <span>Net Reimbursement:</span>
              <span className="font-mono font-bold text-base text-emerald-400">${formattedAmount} USD</span>
            </div>

            <div className="flex justify-between items-center text-zinc-400 pt-2 border-t border-white/[0.06] font-mono text-[10px]">
              <span>API Method:</span>
              <span className="text-blue-400">POST /v1/payments/payouts</span>
            </div>

            <div className="flex justify-between items-center text-zinc-400 font-mono text-[10px]">
              <span>Idempotency Key:</span>
              <span className="text-zinc-500 truncate max-w-[200px]">
                UUIDv4-idemp-{Date.now().toString().slice(-8)}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-emerald-500/[0.08] border border-emerald-500/20 mb-5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
            <p className="text-[11px] text-emerald-300 m-0 leading-relaxed">
              Disburses net reimbursement to Sarah's PayPal sandbox account and clears remaining debts in the ledger.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white shadow-lg shadow-emerald-500/25 transition-all cursor-pointer disabled:opacity-50"
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

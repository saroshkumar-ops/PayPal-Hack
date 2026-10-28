import React from 'react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-gray-950 border border-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white m-0">
                Confirm PayPal Batch Payout
              </h3>
              <p className="text-[11px] text-gray-400 m-0">
                Human-in-the-Loop Organizer Authorization
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Details Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3 mb-5 text-xs">
          <div className="flex justify-between items-center text-gray-400">
            <span>Primary Beneficiary:</span>
            <span className="font-semibold text-gray-200">{organizer.name} ({organizer.handle})</span>
          </div>

          <div className="flex justify-between items-center text-gray-400">
            <span>PayPal Sandbox Email:</span>
            <span className="font-mono text-cyan-400">{organizer.paypal_email}</span>
          </div>

          <div className="flex justify-between items-center text-gray-400">
            <span>Net Disbursed Amount:</span>
            <span className="font-mono font-bold text-base text-emerald-400">${formattedAmount} USD</span>
          </div>

          <div className="flex justify-between items-center text-gray-400 pt-2 border-t border-gray-800 font-mono text-[10px]">
            <span>PayPal API Call:</span>
            <span className="text-amber-400">POST /v1/payments/payouts</span>
          </div>

          <div className="flex justify-between items-center text-gray-400 font-mono text-[10px]">
            <span>Idempotency Key:</span>
            <span className="text-gray-400 truncate max-w-[200px]">
              UUIDv4-idemp-{Date.now().toString().slice(-8)}
            </span>
          </div>
        </div>

        <div className="bg-emerald-950/30 border border-emerald-600/30 rounded-xl p-3 mb-5 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
          <p className="text-[11px] text-emerald-300/90 m-0 leading-relaxed">
            Executing this batch disbursement will credit Sarah's sandbox account and clear all remaining member settlement splits across the ledger.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-gray-200 border border-gray-800 hover:bg-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            {isLoading ? 'Executing Payout...' : 'Confirm & Disburse'}
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { ShieldCheck, Activity } from 'lucide-react';
import type { TripLedger, PayPalEventLog } from '../types';

interface PayoutsPageProps {
  ledger: TripLedger;
  paypalLogs: PayPalEventLog[];
  onOpenPayoutModal: () => void;
}

export const PayoutsPage: React.FC<PayoutsPageProps> = ({
  ledger,
  paypalLogs,
  onOpenPayoutModal,
}) => {
  const organizer = ledger.members.find((m) => m.role === 'organizer') || ledger.members[0];
  const organizerOwedCents = Math.max(0, ledger.net_balances_cents[organizer.user_id] || 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#33475A]">
        <div>
          <h1 className="text-xl font-bold text-[#E7EDF2] tracking-tight m-0">
            PayPal Batch Payouts & Webhook Stream
          </h1>
          <p className="text-xs text-[#8199AE] m-0 mt-0.5">
            Disburse pooled group reimbursements via Batch Payouts API v1 and inspect real-time signed webhooks
          </p>
        </div>

        <button
          onClick={onOpenPayoutModal}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#4E6A83] hover:bg-[#33475A] text-[#E7EDF2] text-xs font-semibold transition-all cursor-pointer shadow-sm"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Authorize Batch Payout
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Batch Payout Authorization Card (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-[#33475A] bg-[#1F2C38] p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-[#33475A]">
              <ShieldCheck className="w-4 h-4 text-[#8199AE]" />
              <h3 className="text-xs font-bold text-[#E7EDF2] uppercase tracking-wider m-0">
                Disbursement Target
              </h3>
            </div>

            <p className="text-xs text-[#8199AE] leading-relaxed mb-4">
              Consolidates remaining member reimbursements and disburses them directly to the trip organizer on PayPal rails.
            </p>

            <div className="p-3.5 rounded-xl bg-[#10161C] border border-[#33475A] space-y-2.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-[#8199AE]">Beneficiary:</span>
                <span className="text-[#E7EDF2]">{organizer.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8199AE]">PayPal Email:</span>
                <span className="text-[#E7EDF2] truncate max-w-[180px]">{organizer.paypal_email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8199AE]">Net Reimbursement:</span>
                <span className="text-[#E7EDF2] font-bold">${(organizerOwedCents / 100).toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#33475A]">
                <span className="text-[#8199AE]">API Call:</span>
                <span className="text-[#E7EDF2]">POST /v1/payments/payouts</span>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <button
              onClick={onOpenPayoutModal}
              className="w-full py-2.5 px-4 rounded-xl bg-[#4E6A83] hover:bg-[#33475A] text-[#E7EDF2] font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <ShieldCheck className="w-4 h-4" />
              Execute Batch Payout ($ {(organizerOwedCents / 100).toFixed(2)} USD)
            </button>
          </div>
        </div>

        {/* Right: Verified Webhook Stream (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-[#33475A] bg-[#1F2C38] p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#33475A]">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#8199AE]" />
              <h3 className="text-xs font-bold text-[#E7EDF2] uppercase tracking-wider m-0">
                Verified PayPal Webhook Log
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[#8199AE] bg-[#10161C] border border-[#33475A] px-2 py-0.5 rounded">
              Signed Headers Verified
            </span>
          </div>

          <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
            {paypalLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-[#10161C] border border-[#33475A] text-xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[10px] font-bold text-[#E7EDF2] bg-[#1F2C38] border border-[#33475A] px-2 py-0.5 rounded">
                    {log.event_type}
                  </span>
                  <span className="font-mono text-[10px] text-[#8199AE]">{log.timestamp}</span>
                </div>
                <p className="text-xs text-[#B7C6D3] m-0 leading-relaxed font-sans mt-1">
                  {log.summary}
                </p>
                {log.reference_id && (
                  <div className="text-[10px] font-mono text-[#8199AE] mt-1">
                    Ref: {log.reference_id}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

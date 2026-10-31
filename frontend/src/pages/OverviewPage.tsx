import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Receipt, 
  ShieldCheck, 
  Clock, 
  ArrowRight, 
  PlusCircle, 
  Terminal,
  Sparkles 
} from 'lucide-react';
import type { TripLedger } from '../types';

interface OverviewPageProps {
  ledger: TripLedger;
  onSimulateExpense: () => void;
  onAdvanceTime: () => void;
  onOpenReceiptModal: () => void;
  onOpenPayoutModal: () => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  ledger,
  onSimulateExpense,
  onAdvanceTime,
  onOpenReceiptModal,
  onOpenPayoutModal,
}) => {
  const totalSpendCents = ledger.expenses.reduce((acc, exp) => acc + exp.amount_cents, 0);
  let settledCents = 0;
  let pendingCents = 0;

  ledger.expenses.forEach((exp) => {
    exp.splits.forEach((split) => {
      if (split.paid_status === 'SETTLED') {
        settledCents += split.owes_cents;
      } else {
        pendingCents += split.owes_cents;
      }
    });
  });

  const settledPercentage = totalSpendCents > 0 ? Math.round((settledCents / totalSpendCents) * 100) : 0;
  const organizer = ledger.members.find((m) => m.role === 'organizer') || ledger.members[0];
  const organizerOwedCents = Math.max(0, ledger.net_balances_cents[organizer.user_id] || 0);

  return (
    <div className="space-y-6 w-full py-1">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#33475A]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#E7EDF2] tracking-tight m-0">
            {ledger.trip_name}
          </h1>
          <p className="text-xs sm:text-sm text-[#8199AE] m-0 mt-1">
            Trip Treasury overview • {ledger.members.length} travelers • Integer-cent accounting
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link
            to="/simulator"
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#4E6A83] hover:bg-[#33475A] text-[#E7EDF2] text-xs font-semibold transition-all no-underline shadow-sm"
          >
            <Terminal className="w-3.5 h-3.5" />
            Open Chat Simulator
          </Link>
        </div>
      </div>

      {/* Hero Bento: Virtual Card + Stat Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Virtual Card (4 cols on widescreen) */}
        <div className="lg:col-span-4 rounded-2xl bg-[#1F2C38] border border-[#33475A] p-5 sm:p-6 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between pb-4 border-b border-[#33475A]">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-[#8199AE]">
                PayPal Travel Treasury
              </div>
              <div className="text-xs font-semibold text-[#E7EDF2] mt-0.5">
                Fronted by {organizer.name}
              </div>
            </div>
            <span className="font-mono text-xs text-[#8199AE]">•••• 8821</span>
          </div>

          <div className="my-5 sm:my-6 space-y-3">
            <div>
              <div className="text-xs text-[#8199AE] uppercase tracking-wider font-medium">
                Net Reimbursable Balance
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[#E7EDF2] tracking-tight mt-1">
                ₹{(organizerOwedCents / 100).toFixed(2)}{' '}
                <span className="text-xs text-[#8199AE] font-normal">INR</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#33475A]/60 text-xs">
              <span className="text-[#8199AE]">Sandbox Escrow:</span>
              <span className="font-mono font-semibold text-[#E7EDF2]">
                ₹{((ledger.platform_escrow_cents || 0) / 100).toFixed(2)} INR
              </span>
            </div>

            <div className="text-[11px] text-[#8199AE] font-mono truncate">
              Receiver: {organizer.paypal_email}
            </div>
          </div>

          <div className="pt-4 border-t border-[#33475A] flex items-center justify-between">
            <span className="text-xs text-[#8199AE]">1-Click Settlement</span>
            <button
              onClick={onOpenPayoutModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#4E6A83] hover:bg-[#33475A] text-[#E7EDF2] text-xs font-semibold transition-all cursor-pointer shadow-sm"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Batch Payout
            </button>
          </div>
        </div>

        {/* 3 Metrics Cards (8 cols on widescreen) */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Metric 1 */}
          <div className="rounded-2xl bg-[#1F2C38] border border-[#33475A] p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#8199AE] uppercase tracking-wider">
                Total Expenses
              </span>
              <Receipt className="w-4 h-4 text-[#8199AE]" />
            </div>
            <div className="my-2">
              <div className="text-2xl font-bold font-mono text-[#E7EDF2]">
                ₹{(totalSpendCents / 100).toFixed(2)}
              </div>
              <div className="text-[11px] text-[#8199AE] mt-0.5">Across {ledger.expenses.length} logged items</div>
            </div>
            <div className="h-1.5 w-full rounded-full bg-[#10161C] overflow-hidden mt-2">
              <div
                className="h-full bg-[#4E6A83] rounded-full"
                style={{ width: `${settledPercentage}%` }}
              />
            </div>
          </div>

          {/* Metric 2 */}
          <div className="rounded-2xl bg-[#1F2C38] border border-[#33475A] p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#8199AE] uppercase tracking-wider">
                Settled Rate
              </span>
              <ShieldCheck className="w-4 h-4 text-[#8199AE]" />
            </div>
            <div className="my-2">
              <div className="text-2xl font-bold font-mono text-[#E7EDF2]">
                {settledPercentage}%
              </div>
              <div className="text-[11px] text-[#8199AE] mt-0.5">
                ₹{(settledCents / 100).toFixed(2)} settled via PayPal
              </div>
            </div>
            <div className="text-[11px] text-[#8199AE]">Zero floating-point drift</div>
          </div>

          {/* Metric 3 */}
          <div className="rounded-2xl bg-[#1F2C38] border border-[#33475A] p-5 flex flex-col justify-between sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#8199AE] uppercase tracking-wider">
                Pending Debts Pool
              </span>
              <Clock className="w-4 h-4 text-[#8199AE]" />
            </div>
            <div className="flex items-center justify-between my-2">
              <div>
                <div className="text-2xl font-bold font-mono text-[#E7EDF2]">
                  ₹{(pendingCents / 100).toFixed(2)}
                </div>
                <div className="text-[11px] text-[#8199AE] mt-0.5">
                  Across pending group splits
                </div>
              </div>
              <Link
                to="/ledger"
                className="flex items-center gap-1.5 text-xs text-[#E7EDF2] hover:text-[#B7C6D3] no-underline font-medium"
              >
                AG Grid <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="text-[11px] text-[#8199AE]">2 travelers awaiting settlement</div>
          </div>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div className="rounded-2xl bg-[#1F2C38] border border-[#33475A] p-5">
        <div className="text-xs font-bold text-[#E7EDF2] uppercase tracking-wider mb-3">
          Quick Simulation Controls
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={onSimulateExpense}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#10161C] hover:bg-[#33475A] border border-[#33475A] text-xs font-semibold text-[#E7EDF2] transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-[#8199AE]" />
            Simulate ₹1,500 Group Dinner
          </button>

          <button
            onClick={onAdvanceTime}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#10161C] hover:bg-[#33475A] border border-[#33475A] text-xs font-semibold text-[#E7EDF2] transition-all cursor-pointer"
          >
            <Clock className="w-4 h-4 text-[#8199AE]" />
            Fast-Forward Time +24h
          </button>

          <button
            onClick={onOpenReceiptModal}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#10161C] hover:bg-[#33475A] border border-[#33475A] text-xs font-semibold text-[#E7EDF2] transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-[#8199AE]" />
            Scan Receipt (Gemini OCR)
          </button>
        </div>
      </div>

      {/* Recent Activity List */}
      <div className="rounded-2xl bg-[#1F2C38] border border-[#33475A] p-5">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#33475A]">
          <span className="text-xs font-bold text-[#E7EDF2] uppercase tracking-wider">
            Recent Expenses
          </span>
          <Link
            to="/ledger"
            className="text-xs text-[#8199AE] hover:text-[#E7EDF2] no-underline flex items-center gap-1"
          >
            Full Ledger <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="space-y-2.5">
          {ledger.expenses.map((exp) => (
            <div
              key={exp.expense_id}
              className="flex items-center justify-between p-3 rounded-xl bg-[#10161C] border border-[#33475A]"
            >
              <div>
                <div className="text-xs font-semibold text-[#E7EDF2]">{exp.description}</div>
                <div className="text-[11px] text-[#8199AE]">
                  Category: {exp.category} • Fronted by Sarah
                </div>
              </div>
              <div className="text-right font-mono font-bold text-sm text-[#E7EDF2]">
                ₹{(exp.amount_cents / 100).toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

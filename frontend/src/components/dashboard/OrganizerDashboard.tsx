import React, { useState, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import type { TripLedger } from '../../types';
import { 
  Search, 
  ArrowRight, 
  ShieldCheck, 
  Users, 
  Receipt, 
  Clock,
  Sparkles
} from 'lucide-react';

interface OrganizerDashboardProps {
  ledger: TripLedger;
  onTriggerPayout: () => void;
}

export const OrganizerDashboard: React.FC<OrganizerDashboardProps> = ({
  ledger,
  onTriggerPayout,
}) => {
  const [quickFilterText, setQuickFilterText] = useState('');

  // Compute summary stats
  const stats = useMemo(() => {
    const totalExpensesCents = ledger.expenses.reduce((acc, exp) => acc + exp.amount_cents, 0);
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

    return {
      totalVolume: (totalExpensesCents / 100).toFixed(2),
      settledAmount: (settledCents / 100).toFixed(2),
      pendingAmount: (pendingCents / 100).toFixed(2),
      settledPercentage: totalExpensesCents > 0 ? Math.round((settledCents / totalExpensesCents) * 100) : 0,
    };
  }, [ledger]);

  // Flatten expenses into table rows for AG Grid
  const rowData = useMemo(() => {
    return ledger.expenses.map((exp) => {
      const payer = ledger.members.find((m) => m.user_id === exp.paid_by);
      const isAllSettled = exp.splits.every((s) => s.paid_status === 'SETTLED');
      const hasEscalated = exp.splits.some((s) => s.paid_status === 'PENDING' && (ledger.members.find(m => m.user_id === s.user_id)?.heat_score || 0) > 40);

      const splitSummary = exp.splits
        .map((s) => {
          const m = ledger.members.find((mem) => mem.user_id === s.user_id);
          const firstName = m?.name.split(' ')[0] || s.user_id;
          return `${firstName}: $${(s.owes_cents / 100).toFixed(2)} (${s.paid_status === 'SETTLED' ? '✓' : 'Pending'})`;
        })
        .join(' • ');

      return {
        expense_id: exp.expense_id,
        date: new Date(exp.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        category: exp.category,
        description: exp.description,
        amount: (exp.amount_cents / 100).toFixed(2),
        paid_by: payer?.name || exp.paid_by,
        payer_avatar: payer?.avatar_url,
        split_summary: splitSummary,
        status: isAllSettled ? 'SETTLED' : hasEscalated ? 'ESCALATED' : 'PENDING',
        split_count: exp.splits.length,
      };
    });
  }, [ledger]);

  // AG Grid Column Definitions
  const colDefs = useMemo<ColDef[]>(() => {
    return [
      {
        field: 'date',
        headerName: 'Date',
        width: 100,
        sortable: true,
        filter: true,
      },
      {
        field: 'category',
        headerName: 'Category',
        width: 130,
        sortable: true,
        filter: true,
        cellRenderer: (params: ICellRendererParams) => {
          const icons: Record<string, string> = {
            LODGING: '🏠 Lodging',
            TRANSPORT: '🚗 Transport',
            FOOD: '🍽️ Food & Drinks',
            ACTIVITIES: '🎟️ Activities',
            OTHER: '📦 Other',
          };
          return (
            <span className="text-xs font-medium text-gray-300">
              {icons[params.value] || params.value}
            </span>
          );
        },
      },
      {
        field: 'description',
        headerName: 'Description',
        flex: 1.5,
        minWidth: 200,
        sortable: true,
        filter: true,
        cellRenderer: (params: ICellRendererParams) => (
          <span className="font-medium text-white">{params.value}</span>
        ),
      },
      {
        field: 'amount',
        headerName: 'Amount (USD)',
        width: 140,
        sortable: true,
        filter: 'agNumberColumnFilter',
        cellRenderer: (params: ICellRendererParams) => (
          <span className="font-mono font-bold text-amber-400">${params.value}</span>
        ),
      },
      {
        field: 'paid_by',
        headerName: 'Fronted By',
        width: 160,
        sortable: true,
        filter: true,
        cellRenderer: (params: ICellRendererParams) => (
          <div className="flex items-center gap-2 h-full">
            {params.data.payer_avatar && (
              <img
                src={params.data.payer_avatar}
                alt=""
                className="w-5 h-5 rounded-full object-cover border border-gray-600"
              />
            )}
            <span className="text-xs text-gray-200">{params.value}</span>
          </div>
        ),
      },
      {
        field: 'split_summary',
        headerName: 'Split Breakdown',
        flex: 2,
        minWidth: 260,
        cellRenderer: (params: ICellRendererParams) => (
          <span className="text-xs text-gray-400 font-mono">{params.value}</span>
        ),
      },
      {
        field: 'status',
        headerName: 'Payment Status',
        width: 150,
        sortable: true,
        filter: true,
        cellRenderer: (params: ICellRendererParams) => {
          const status = params.value;
          if (status === 'SETTLED') {
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                SETTLED
              </span>
            );
          }
          if (status === 'ESCALATED') {
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                ESCALATED
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              PENDING
            </span>
          );
        },
      },
    ];
  }, [ledger]);

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-gray-950 border border-gray-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 font-medium">Total Trip Spend</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-white">${stats.totalVolume}</div>
          <div className="text-[11px] text-gray-500 mt-1">Calculated in integer cents</div>
        </div>

        {/* Metric 2 */}
        <div className="bg-gray-950 border border-gray-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 font-medium">Settled via PayPal</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">${stats.settledAmount}</div>
          <div className="text-[11px] text-emerald-500/80 mt-1">
            {stats.settledPercentage}% of group debts settled
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-gray-950 border border-gray-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 font-medium">Outstanding Balances</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">${stats.pendingAmount}</div>
          <div className="text-[11px] text-gray-500 mt-1">Active collection in progress</div>
        </div>

        {/* Metric 4 */}
        <div className="bg-gray-950 border border-gray-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400 font-medium">Trip Members</span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-white">{ledger.members.length} People</div>
          <div className="text-[11px] text-purple-400/80 mt-1">1 Organizer • 2 Members</div>
        </div>
      </div>

      {/* Flagship AG Grid Component */}
      <div className="bg-gray-950 border border-gray-800 rounded-2xl p-5 shadow-2xl">
        {/* Table Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center font-bold text-xs border border-red-500/20">
              AG
            </div>
            <div>
              <h3 className="text-base font-bold text-white m-0 flex items-center gap-2">
                Trip Ledger Data Grid
                <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-semibold">
                  AG Grid Enabled
                </span>
              </h3>
              <p className="text-xs text-gray-400 m-0">
                Interactive multi-column sorting, quick filter, and real-time capture updates
              </p>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={quickFilterText}
              onChange={(e) => setQuickFilterText(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700/80 rounded-xl pl-9 pr-4 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* AG Grid Container */}
        <div className="ag-theme-quartz-dark w-full h-[400px] rounded-xl overflow-hidden border border-gray-800">
          <AgGridReact
            rowData={rowData}
            columnDefs={colDefs}
            quickFilterText={quickFilterText}
            defaultColDef={{
              resizable: true,
              sortable: true,
            }}
            animateRows={true}
            pagination={true}
            paginationPageSize={10}
          />
        </div>
      </div>

      {/* Bipartite Debt Simplification & Batch Payout Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Minimum Cash Flow Simplification Engine */}
        <div className="lg:col-span-2 bg-gray-950 border border-gray-800 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white m-0">
                Bipartite Minimum Cash Flow Simplification
              </h3>
            </div>
            <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-mono">
              O(N) Optimization
            </span>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed mb-4">
            Instead of multiple messy cross-payments, TripSheriff matches the largest net debtors directly with the fronting creditor to reduce transaction friction:
          </p>

          <div className="space-y-3">
            {/* Payment 1: Alex to Sarah */}
            <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-rose-300">Alex Rivera</span>
                  <span className="text-[10px] text-gray-500">(@alex_travels)</span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-600" />
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-emerald-300">Sarah Chen</span>
                  <span className="text-[10px] text-gray-500">(@sarah_c)</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-bold font-mono text-amber-400">$110.00 USD</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-medium">
                  PENDING
                </span>
              </div>
            </div>

            {/* Payment 2: Dave to Sarah */}
            <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-rose-300">Dave Kim</span>
                  <span className="text-[10px] text-gray-500">(@dave_k)</span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-600" />
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-emerald-300">Sarah Chen</span>
                  <span className="text-[10px] text-gray-500">(@sarah_c)</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-bold font-mono text-amber-400">$80.00 USD</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-medium">
                  PENDING
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: PayPal Batch Payout Authorization Card */}
        <div className="bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950/40 border border-indigo-500/30 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-white m-0">PayPal Batch Payouts</h3>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed mb-4">
              Disburse pooled funds to reimburse Sarah for fronting the group expenses with a single idempotent API call.
            </p>

            <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-3 space-y-2 mb-4 text-xs font-mono">
              <div className="flex justify-between text-gray-400">
                <span>Beneficiary:</span>
                <span className="text-gray-200">sarah.organizer@personal.example.com</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Net Reimbursement:</span>
                <span className="text-emerald-400 font-bold">$190.00 USD</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>API Rails:</span>
                <span className="text-indigo-400">POST /v1/payments/payouts</span>
              </div>
            </div>
          </div>

          <button
            onClick={onTriggerPayout}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            Authorize PayPal Batch Payout
          </button>
        </div>
      </div>
    </div>
  );
};

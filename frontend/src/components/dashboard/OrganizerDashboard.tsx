import React, { useState, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import type { TripLedger } from '../../types';
import { SpotlightCard } from '../bits/SpotlightCard';
import { BadgePill } from '../bits/BadgePill';
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
      const hasEscalated = exp.splits.some(
        (s) => s.paid_status === 'PENDING' && (ledger.members.find(m => m.user_id === s.user_id)?.heat_score || 0) > 40
      );

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
      };
    });
  }, [ledger]);

  // AG Grid Column Definitions
  const colDefs = useMemo<ColDef[]>(() => {
    return [
      {
        field: 'date',
        headerName: 'Date',
        width: 110,
        sortable: true,
        filter: true,
      },
      {
        field: 'category',
        headerName: 'Category',
        width: 140,
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
            <span className="text-xs font-semibold text-zinc-300">
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
          <span className="font-semibold text-white">{params.value}</span>
        ),
      },
      {
        field: 'amount',
        headerName: 'Total (USD)',
        width: 140,
        sortable: true,
        filter: 'agNumberColumnFilter',
        cellRenderer: (params: ICellRendererParams) => (
          <span className="font-mono font-bold text-emerald-400">${params.value}</span>
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
                className="w-6 h-6 rounded-full object-cover border border-white/10"
              />
            )}
            <span className="text-xs text-zinc-200 font-medium">{params.value}</span>
          </div>
        ),
      },
      {
        field: 'split_summary',
        headerName: 'Split Breakdown',
        flex: 2,
        minWidth: 260,
        cellRenderer: (params: ICellRendererParams) => (
          <span className="text-xs text-zinc-400 font-mono">{params.value}</span>
        ),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 140,
        sortable: true,
        filter: true,
        cellRenderer: (params: ICellRendererParams) => {
          return <BadgePill status={params.value as any} />;
        },
      },
    ];
  }, [ledger]);

  return (
    <div className="space-y-6">
      {/* 4 Spotlight Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SpotlightCard className="p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-zinc-400 font-medium">Total Trip Volume</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold font-mono text-white tracking-tight">${stats.totalVolume}</div>
          <div className="text-[11px] text-zinc-500 mt-1">Calculated in integer cents</div>
        </SpotlightCard>

        <SpotlightCard className="p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-zinc-400 font-medium">Settled via PayPal</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold font-mono text-emerald-400 tracking-tight">${stats.settledAmount}</div>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${stats.settledPercentage}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-emerald-400">{stats.settledPercentage}%</span>
          </div>
        </SpotlightCard>

        <SpotlightCard className="p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-zinc-400 font-medium">Outstanding Debts</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold font-mono text-amber-400 tracking-tight">${stats.pendingAmount}</div>
          <div className="text-[11px] text-zinc-500 mt-1">Active collection in chat</div>
        </SpotlightCard>

        <SpotlightCard className="p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-zinc-400 font-medium">Group Members</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold font-mono text-white tracking-tight">{ledger.members.length} Travelers</div>
          <div className="text-[11px] text-zinc-500 mt-1">1 Organizer • 2 Members</div>
        </SpotlightCard>
      </div>

      {/* Flagship AG Grid Component */}
      <SpotlightCard className="p-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 font-bold text-xs border border-red-500/20">
              AG
            </div>
            <div>
              <h3 className="text-base font-bold text-white m-0 flex items-center gap-2">
                Trip Ledger Data Grid
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-semibold">
                  AG Grid Enabled
                </span>
              </h3>
              <p className="text-xs text-zinc-400 m-0">Multi-column sorting, quick filter, and real-time capture updates</p>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search expenses, members..."
              value={quickFilterText}
              onChange={(e) => setQuickFilterText(e.target.value)}
              className="w-full rounded-2xl bg-zinc-950/80 border border-white/10 pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500/60 transition-colors"
            />
          </div>
        </div>

        {/* AG Grid Container */}
        <div className="ag-theme-quartz-dark w-full h-[400px] rounded-2xl overflow-hidden border border-white/[0.08]">
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
      </SpotlightCard>

      {/* Bipartite Debt Simplification & Batch Payout Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Minimum Cash Flow Simplification Engine */}
        <SpotlightCard className="lg:col-span-2 p-6 shadow-xl">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.07]">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white m-0">
                Bipartite Minimum Cash Flow Optimization
              </h3>
            </div>
            <span className="font-mono text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded-full">
              O(N) Graph Simplification
            </span>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed mb-4">
            Instead of multiple confusing pairwise splits, TripSheriff matches net debtors directly with the fronting creditor to reduce transaction friction:
          </p>

          <div className="space-y-3">
            {/* Payment 1: Alex to Sarah */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/60 border border-white/[0.05]">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-rose-300">Alex Rivera</span>
                  <span className="text-[10px] text-zinc-500">(@alex_travels)</span>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-600" />
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-emerald-300">Sarah Chen</span>
                  <span className="text-[10px] text-zinc-500">(@sarah_c)</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-sm text-amber-400">$110.00 USD</span>
                <BadgePill status="PENDING" label="PENDING" />
              </div>
            </div>

            {/* Payment 2: Dave to Sarah */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-900/60 border border-white/[0.05]">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-rose-300">Dave Kim</span>
                  <span className="text-[10px] text-zinc-500">(@dave_k)</span>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-600" />
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-emerald-300">Sarah Chen</span>
                  <span className="text-[10px] text-zinc-500">(@sarah_c)</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-sm text-amber-400">$80.00 USD</span>
                <BadgePill status="PENDING" label="PENDING" />
              </div>
            </div>
          </div>
        </SpotlightCard>

        {/* Right: PayPal Batch Payout Authorization Card */}
        <SpotlightCard className="p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-bold text-white m-0">PayPal Batch Payouts API</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed mb-4">
              Disburse pooled funds to reimburse Sarah for fronting the group expenses with a single idempotent API call.
            </p>

            <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-white/[0.06] space-y-2 mb-4 text-xs font-mono">
              <div className="flex justify-between text-zinc-400">
                <span>Beneficiary:</span>
                <span className="text-zinc-200">sarah.organizer@personal.example.com</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Net Reimbursement:</span>
                <span className="text-emerald-400 font-bold">$190.00 USD</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>API Rails:</span>
                <span className="text-blue-400">POST /v1/payments/payouts</span>
              </div>
            </div>
          </div>

          <button
            onClick={onTriggerPayout}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:brightness-110 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <ShieldCheck className="w-4 h-4" />
            Authorize PayPal Batch Payout
          </button>
        </SpotlightCard>
      </div>
    </div>
  );
};

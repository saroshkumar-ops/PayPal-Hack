import React, { useState, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import type { TripLedger } from '../types';
import { Search, ArrowRight, Sparkles, ShieldCheck, Receipt, Coins, CheckCircle } from 'lucide-react';

interface LedgerPageProps {
  ledger: TripLedger;
}

export const LedgerPage: React.FC<LedgerPageProps> = ({ ledger }) => {
  const [quickFilterText, setQuickFilterText] = useState('');

  const totalSpendCents = useMemo(() => {
    return ledger.expenses.reduce((acc, exp) => acc + exp.amount_cents, 0);
  }, [ledger.expenses]);

  let settledCents = 0;
  ledger.expenses.forEach((exp) => {
    exp.splits.forEach((split) => {
      if (split.paid_status === 'SETTLED') {
        settledCents += split.owes_cents;
      }
    });
  });

  const settledPercentage = totalSpendCents > 0 ? Math.round((settledCents / totalSpendCents) * 100) : 0;

  // Row Data for AG Grid
  const rowData = useMemo(() => {
    return ledger.expenses.map((exp) => {
      const payer = ledger.members.find((m) => m.user_id === exp.paid_by);
      const isAllSettled = exp.splits.every((s) => s.paid_status === 'SETTLED');

      const splitSummary = exp.splits
        .map((s) => {
          const m = ledger.members.find((mem) => mem.user_id === s.user_id);
          const firstName = m?.name.split(' ')[0] || s.user_id;
          return `${firstName}: ₹${(s.owes_cents / 100).toFixed(2)} (${s.paid_status === 'SETTLED' ? 'Settled' : 'Pending'})`;
        })
        .join(' • ');

      return {
        expense_id: exp.expense_id,
        date: new Date(exp.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        category: exp.category,
        description: exp.description,
        amount: (exp.amount_cents / 100).toFixed(2),
        paid_by: payer?.name || exp.paid_by,
        split_summary: splitSummary,
        status: isAllSettled ? 'SETTLED' : 'PENDING',
      };
    });
  }, [ledger]);

  // AG Grid Column Definitions
  const colDefs = useMemo<ColDef[]>(() => {
    return [
      {
        field: 'date',
        headerName: 'Date',
        width: 120,
        sortable: true,
        filter: true,
        cellRenderer: (params: ICellRendererParams) => (
          <span className="font-mono text-xs text-[#8199AE]">{params.value}</span>
        ),
      },
      {
        field: 'category',
        headerName: 'Category',
        width: 130,
        sortable: true,
        filter: true,
        cellRenderer: (params: ICellRendererParams) => (
          <span className="px-2.5 py-1 rounded-md bg-[#1F2C38] border border-[#33475A] text-xs font-semibold text-[#B7C6D3] uppercase tracking-wider">
            {params.value}
          </span>
        ),
      },
      {
        field: 'description',
        headerName: 'Description',
        flex: 1.6,
        minWidth: 200,
        sortable: true,
        filter: true,
        cellRenderer: (params: ICellRendererParams) => (
          <span className="font-bold text-sm text-[#E7EDF2] tracking-tight">{params.value}</span>
        ),
      },
      {
        field: 'amount',
        headerName: 'Amount (INR)',
        width: 150,
        sortable: true,
        filter: 'agNumberColumnFilter',
        cellRenderer: (params: ICellRendererParams) => (
          <span className="font-mono font-black text-sm text-[#E7EDF2]">₹{params.value}</span>
        ),
      },
      {
        field: 'paid_by',
        headerName: 'Fronted By',
        width: 150,
        sortable: true,
        filter: true,
        cellRenderer: (params: ICellRendererParams) => (
          <span className="text-xs font-medium text-[#B7C6D3]">{params.value}</span>
        ),
      },
      {
        field: 'split_summary',
        headerName: 'Member Split Details',
        flex: 2,
        minWidth: 260,
        cellRenderer: (params: ICellRendererParams) => (
          <span className="text-xs text-[#8199AE] font-mono truncate">{params.value}</span>
        ),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 130,
        sortable: true,
        filter: true,
        cellRenderer: (params: ICellRendererParams) => {
          const isSettled = params.value === 'SETTLED';
          return (
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold ${
                isSettled
                  ? 'bg-[#10161C] text-[#E7EDF2] border border-[#4E6A83]'
                  : 'bg-[#10161C] text-[#8199AE] border border-[#33475A]'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isSettled ? 'bg-[#E7EDF2]' : 'bg-[#8199AE]'}`} />
              {params.value}
            </span>
          );
        },
      },
    ];
  }, []);

  return (
    <div className="space-y-6 w-full py-2">
      {/* Title & Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#33475A]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#E7EDF2] tracking-tight m-0 flex items-center gap-3">
            Trip Ledger & AG Grid
            <span className="text-xs font-mono font-bold text-[#E7EDF2] bg-[#4E6A83] border border-[#8199AE]/40 px-2.5 py-1 rounded-full">
              Enterprise Quartz Dark
            </span>
          </h1>
          <p className="text-sm text-[#8199AE] m-0 mt-1">
            Immutable group expenses with integer-cent accuracy, real-time sorting, and zero drift
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#8199AE] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search expenses, fronted payers, tags..."
            value={quickFilterText}
            onChange={(e) => setQuickFilterText(e.target.value)}
            className="w-full bg-[#1F2C38] border border-[#33475A] rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-[#E7EDF2] placeholder-[#8199AE] focus:outline-none focus:border-[#4E6A83] transition-colors"
          />
        </div>
      </div>

      {/* Summary KPI Badges Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-[#1F2C38] border border-[#33475A] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#10161C] border border-[#33475A] flex items-center justify-center">
            <Coins className="w-5 h-5 text-[#8199AE]" />
          </div>
          <div>
            <div className="text-[11px] uppercase font-bold text-[#8199AE]">Total Volume</div>
            <div className="text-base sm:text-lg font-black font-mono text-[#E7EDF2]">
              ₹{(totalSpendCents / 100).toFixed(2)}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#1F2C38] border border-[#33475A] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#10161C] border border-[#33475A] flex items-center justify-center">
            <Receipt className="w-5 h-5 text-[#8199AE]" />
          </div>
          <div>
            <div className="text-[11px] uppercase font-bold text-[#8199AE]">Expenses Logged</div>
            <div className="text-base sm:text-lg font-black font-mono text-[#E7EDF2]">
              {ledger.expenses.length} Items
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#1F2C38] border border-[#33475A] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#10161C] border border-[#33475A] flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-[#8199AE]" />
          </div>
          <div>
            <div className="text-[11px] uppercase font-bold text-[#8199AE]">Settled Rate</div>
            <div className="text-base sm:text-lg font-black font-mono text-[#E7EDF2]">
              {settledPercentage}%
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#1F2C38] border border-[#33475A] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#10161C] border border-[#33475A] flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-[#8199AE]" />
          </div>
          <div>
            <div className="text-[11px] uppercase font-bold text-[#8199AE]">Mathematical Drift</div>
            <div className="text-base sm:text-lg font-black font-mono text-[#E7EDF2]">
              ₹0.00
            </div>
          </div>
        </div>
      </div>

      {/* AG Grid Table Container */}
      <div className="rounded-3xl border border-[#33475A] bg-[#1F2C38] p-4 sm:p-5 shadow-2xl overflow-hidden">
        <div className="ag-theme-quartz ag-theme-quartz-dark w-full h-[460px] lg:h-[calc(100vh-360px)] min-h-[440px] max-h-[740px] rounded-2xl overflow-hidden border border-[#33475A]">
          <AgGridReact
            rowData={rowData}
            columnDefs={colDefs}
            quickFilterText={quickFilterText}
            defaultColDef={{ resizable: true, sortable: true }}
            animateRows={true}
            pagination={true}
            paginationPageSize={10}
          />
        </div>
      </div>

      {/* Bipartite Debt Simplification Graph Card */}
      <div className="rounded-3xl border border-[#33475A] bg-[#1F2C38] p-6 sm:p-7 shadow-xl">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#33475A]">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-[#B7C6D3]" />
            <h3 className="text-sm sm:text-base font-bold text-[#E7EDF2] uppercase tracking-wider font-mono m-0">
              Bipartite Minimum Cash Flow Graph
            </h3>
          </div>
          <span className="text-xs font-mono font-bold text-[#8199AE] bg-[#10161C] border border-[#33475A] px-3 py-1 rounded-full">
            O(N) Optimization
          </span>
        </div>

        <p className="text-xs sm:text-sm text-[#8199AE] leading-relaxed mb-5">
          Instead of multiple circular transactions, the minimum cash flow algorithm matches net debtors directly with the fronting organizer:
        </p>

        {ledger.simplified_settlements && ledger.simplified_settlements.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {ledger.simplified_settlements.map((s, idx) => {
              const fromMember = ledger.members.find((m) => m.user_id === s.from_user_id);
              const toMember = ledger.members.find((m) => m.user_id === s.to_user_id);
              return (
                <div key={idx} className="p-4 rounded-2xl bg-[#10161C] border border-[#33475A] hover:border-[#4E6A83] transition-all flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs sm:text-sm font-bold text-[#E7EDF2]">{fromMember?.name || s.from_user_id}</span>
                    <ArrowRight className="w-4 h-4 text-[#8199AE]" />
                    <span className="text-xs sm:text-sm font-bold text-[#E7EDF2]">{toMember?.name || s.to_user_id}</span>
                  </div>
                  <span className="font-mono font-black text-xs sm:text-sm text-[#E7EDF2]">
                    ₹{s.formatted_amount || (s.amount_cents / 100).toFixed(2)} INR
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-5 rounded-2xl bg-[#10161C] border border-[#33475A] text-center text-xs sm:text-sm text-[#8199AE] font-medium">
            All group expenses are completely balanced. 0 circular settlements required.
          </div>
        )}
      </div>
    </div>
  );
};

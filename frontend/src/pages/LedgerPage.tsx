import React, { useState, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import type { TripLedger } from '../types';
import { Search, ArrowRight, Sparkles } from 'lucide-react';

interface LedgerPageProps {
  ledger: TripLedger;
}

export const LedgerPage: React.FC<LedgerPageProps> = ({ ledger }) => {
  const [quickFilterText, setQuickFilterText] = useState('');

  // Row Data for AG Grid
  const rowData = useMemo(() => {
    return ledger.expenses.map((exp) => {
      const payer = ledger.members.find((m) => m.user_id === exp.paid_by);
      const isAllSettled = exp.splits.every((s) => s.paid_status === 'SETTLED');

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
        cellRenderer: (params: ICellRendererParams) => (
          <span className="text-xs font-medium text-[#B7C6D3]">{params.value}</span>
        ),
      },
      {
        field: 'description',
        headerName: 'Description',
        flex: 1.5,
        minWidth: 200,
        sortable: true,
        filter: true,
        cellRenderer: (params: ICellRendererParams) => (
          <span className="font-semibold text-[#E7EDF2]">{params.value}</span>
        ),
      },
      {
        field: 'amount',
        headerName: 'Amount (USD)',
        width: 140,
        sortable: true,
        filter: 'agNumberColumnFilter',
        cellRenderer: (params: ICellRendererParams) => (
          <span className="font-mono font-bold text-[#E7EDF2]">${params.value}</span>
        ),
      },
      {
        field: 'paid_by',
        headerName: 'Fronted By',
        width: 150,
        sortable: true,
        filter: true,
        cellRenderer: (params: ICellRendererParams) => (
          <span className="text-xs text-[#B7C6D3]">{params.value}</span>
        ),
      },
      {
        field: 'split_summary',
        headerName: 'Split Details',
        flex: 2,
        minWidth: 250,
        cellRenderer: (params: ICellRendererParams) => (
          <span className="text-xs text-[#8199AE] font-mono">{params.value}</span>
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
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                isSettled
                  ? 'bg-[#10161C] text-[#E7EDF2] border border-[#4E6A83]'
                  : 'bg-[#10161C] text-[#8199AE] border border-[#33475A]'
              }`}
            >
              {params.value}
            </span>
          );
        },
      },
    ];
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Title & Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#33475A]">
        <div>
          <h1 className="text-xl font-bold text-[#E7EDF2] tracking-tight m-0 flex items-center gap-2">
            Trip Ledger & AG Grid
            <span className="text-[10px] font-mono text-[#8199AE] bg-[#1F2C38] border border-[#33475A] px-2 py-0.5 rounded">
              Sponsor Candidate
            </span>
          </h1>
          <p className="text-xs text-[#8199AE] m-0 mt-0.5">
            Full immutable ledger of group transactions with integer-cent accuracy
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-[#8199AE] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search expenses..."
            value={quickFilterText}
            onChange={(e) => setQuickFilterText(e.target.value)}
            className="w-full bg-[#1F2C38] border border-[#33475A] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#E7EDF2] placeholder-[#8199AE] focus:outline-none focus:border-[#4E6A83]"
          />
        </div>
      </div>

      {/* AG Grid Table Container */}
      <div className="rounded-2xl border border-[#33475A] bg-[#1F2C38] p-4 shadow-sm">
        <div className="ag-theme-quartz-dark w-full h-[450px] rounded-xl overflow-hidden border border-[#33475A]">
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
      <div className="rounded-2xl border border-[#33475A] bg-[#1F2C38] p-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#33475A]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#8199AE]" />
            <h3 className="text-xs font-bold text-[#E7EDF2] uppercase tracking-wider m-0">
              Bipartite Minimum Cash Flow Graph
            </h3>
          </div>
          <span className="text-[10px] font-mono text-[#8199AE] bg-[#10161C] border border-[#33475A] px-2 py-0.5 rounded">
            O(N) Optimization
          </span>
        </div>

        <p className="text-xs text-[#8199AE] leading-relaxed mb-4">
          Instead of multiple circular transactions, the minimum cash flow algorithm matches net debtors directly with the fronting organizer:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl bg-[#10161C] border border-[#33475A] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold text-[#E7EDF2]">Alex Rivera</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#8199AE]" />
              <span className="text-xs font-semibold text-[#E7EDF2]">Sarah Chen</span>
            </div>
            <span className="font-mono font-bold text-xs text-[#E7EDF2]">$110.00 USD</span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#10161C] border border-[#33475A] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold text-[#E7EDF2]">Dave Kim</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#8199AE]" />
              <span className="text-xs font-semibold text-[#E7EDF2]">Sarah Chen</span>
            </div>
            <span className="font-mono font-bold text-xs text-[#E7EDF2]">$80.00 USD</span>
          </div>
        </div>
      </div>
    </div>
  );
};

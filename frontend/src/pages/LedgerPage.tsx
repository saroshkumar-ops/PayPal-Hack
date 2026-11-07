import React, { useState, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { Link } from 'react-router-dom';
import type { TripLedger } from '../types';
import { 
  Search, 
  Lock, 
  HelpCircle, 
  Receipt, 
  ShieldCheck
} from 'lucide-react';
import { StatusPill } from '../components/ui/StatusPill';
import { getCurrencySymbol } from '../lib/currency';

interface LedgerPageProps {
  ledger: TripLedger;
}

export const LedgerPage: React.FC<LedgerPageProps> = ({ ledger }) => {
  const [quickFilterText, setQuickFilterText] = useState('');
  const [showExplanation, setShowExplanation] = useState(false);
  const cur = getCurrencySymbol(ledger.currency);

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
  const driftCents = Math.abs(Object.values(ledger.net_balances_cents || {}).reduce((acc, val) => acc + val, 0));

  // Row Data for AG Grid
  const rowData = useMemo(() => {
    return ledger.expenses.map((exp) => {
      const payer = ledger.members.find((m) => m.user_id === exp.paid_by);
      const isAllSettled = exp.splits.every((s) => s.paid_status === 'SETTLED');

      const splitSummary = exp.splits
        .map((s) => {
          const m = ledger.members.find((mem) => mem.user_id === s.user_id);
          const firstName = m?.name.split(' ')[0] || s.user_id;
          return `${firstName}: ${cur}${(s.owes_cents / 100).toFixed(2)} (${s.paid_status === 'SETTLED' ? 'Settled' : 'Pending'})`;
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
  }, [ledger, cur]);

  // AG Grid Column Definitions
  const colDefs = useMemo<ColDef[]>(() => {
    return [
      {
        field: 'date',
        headerName: 'Date',
        width: 100,
        sortable: true,
        filter: true,
        cellRenderer: (params: ICellRendererParams) => (
          <span className="font-mono text-xs text-[#8A8FA3]">{params.value}</span>
        ),
      },
      {
        field: 'category',
        headerName: 'Category',
        width: 120,
        sortable: true,
        filter: true,
        cellRenderer: (params: ICellRendererParams) => (
          <span className="px-2 py-0.5 rounded-lg bg-[#171A23] border border-white/8 text-[11px] font-mono text-[#EDEEF2]">
            {params.value}
          </span>
        ),
      },
      {
        field: 'description',
        headerName: 'Description',
        flex: 1,
        minWidth: 180,
        sortable: true,
        filter: true,
        cellRenderer: (params: ICellRendererParams) => (
          <span className="font-body text-xs font-semibold text-[#EDEEF2]">{params.value}</span>
        ),
      },
      {
        field: 'amount',
        headerName: `Amount (${cur})`,
        width: 130,
        sortable: true,
        filter: true,
        cellRenderer: (params: ICellRendererParams) => (
          <span className="font-mono text-xs font-bold text-[#C6FF3D] tabular-nums">
            {cur}{params.value}
          </span>
        ),
      },
      {
        field: 'paid_by',
        headerName: 'Fronted By',
        width: 130,
        sortable: true,
        filter: true,
        cellRenderer: (params: ICellRendererParams) => (
          <span className="font-body text-xs text-[#EDEEF2]">{params.value}</span>
        ),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        sortable: true,
        filter: true,
        cellRenderer: (params: ICellRendererParams) => (
          <StatusPill
            status={params.value === 'SETTLED' ? 'paid' : 'owes'}
            label={params.value}
          />
        ),
      },
      {
        field: 'split_summary',
        headerName: 'Split Allocation',
        flex: 1.5,
        minWidth: 240,
        cellRenderer: (params: ICellRendererParams) => (
          <span className="font-mono text-[11px] text-[#8A8FA3] truncate">{params.value}</span>
        ),
      },
    ];
  }, [cur]);

  const settlements = ledger.simplified_settlements || [];

  return (
    <div className="space-y-6 w-full max-w-[1560px] mx-auto py-2">
      {/* ================================================================ */}
      {/* 1. TOP AUDIT HUD (DOUBLE-ENTRY MATHEMATICAL PROOF)                */}
      {/* ================================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#0F1117] border border-white/8 space-y-1">
          <div className="text-[10px] text-[#8A8FA3] font-mono uppercase tracking-wider">TOTAL EXPENDITURE</div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-[#EDEEF2] tabular-nums">
            {cur}{(totalSpendCents / 100).toFixed(2)}
          </div>
          <div className="text-[11px] text-[#8A8FA3] font-body">{ledger.expenses.length} Total Receipts Logged</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0F1117] border border-white/8 space-y-1">
          <div className="text-[10px] text-[#8A8FA3] font-mono uppercase tracking-wider">SETTLED IN ESCROW</div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-[#C6FF3D] tabular-nums">
            {cur}{(settledCents / 100).toFixed(2)}
          </div>
          <div className="text-[11px] text-[#C6FF3D] font-mono">{settledPercentage}% Settled on PayPal</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0F1117] border border-white/8 space-y-1">
          <div className="text-[10px] text-[#8A8FA3] font-mono uppercase tracking-wider">OUTSTANDING DEBTS</div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-[#FF5C7A] tabular-nums">
            {cur}{((totalSpendCents - settledCents) / 100).toFixed(2)}
          </div>
          <div className="text-[11px] text-[#FF5C7A] font-mono">Bipartite Transits Pending</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0F1117] border border-white/8 space-y-1">
          <div className="flex items-center justify-between">
            <div className="text-[10px] text-[#8A8FA3] font-mono uppercase tracking-wider">MATHEMATICAL DRIFT</div>
            <button
              onClick={() => setShowExplanation(!showExplanation)}
              className="text-[#C6FF3D] hover:underline text-[10px] font-mono flex items-center gap-1 cursor-pointer"
            >
              <HelpCircle className="w-3 h-3" />
              <span>{showExplanation ? 'Hide' : 'Explain'}</span>
            </button>
          </div>
          <div className="text-xl sm:text-2xl font-mono font-bold tabular-nums flex items-center gap-1.5">
            <span className={driftCents === 0 ? 'text-[#C6FF3D]' : 'text-[#FF5C7A]'}>
              {cur}{(driftCents / 100).toFixed(2)}
            </span>
            <Lock className={`w-4 h-4 ${driftCents === 0 ? 'text-[#C6FF3D]' : 'text-[#FF5C7A]'}`} />
          </div>
          <div className="text-[11px] font-mono text-[#8A8FA3]">
            {driftCents === 0 ? 'Equilibrium Verified' : 'Imbalance Detected'}
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* 2. VISUAL EXPLANATION OF DOUBLE-ENTRY AUDIT ENGINE               */}
      {/* ================================================================ */}
      {showExplanation && (
        <div className="p-5 rounded-3xl bg-[#0F1117] border border-[#C6FF3D]/30 shadow-[0_16px_48px_rgba(0,0,0,0.8)] space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#C6FF3D]">
            <ShieldCheck className="w-4 h-4" />
            <span>HOW THE DOUBLE-ENTRY AUDIT ENGINE WORKS</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            <div className="p-4 rounded-2xl bg-[#07080D] border border-white/6 space-y-2">
              <div className="text-[#EDEEF2] font-semibold font-body">1. Strict Double-Entry Balance</div>
              <p className="text-[#8A8FA3] font-body m-0 leading-relaxed">
                Every bill paid by one member is matched with corresponding debts assigned to participating travelers. The sum of all net positions across the group is always strictly zero.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#07080D] border border-white/6 space-y-2">
              <div className="text-[#C6FF3D] font-semibold font-body">2. 64-Bit Integer Cents</div>
              <p className="text-[#8A8FA3] font-body m-0 leading-relaxed">
                Floating-point math causes rounding errors (e.g. 10 / 3 = 3.3333333333). Our backend stores every currency unit in integer cents, guaranteeing 0.00 drift across unlimited splits.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#07080D] border border-white/6 space-y-2">
              <div className="text-[#FFC439] font-semibold font-body">3. Minimum Cash Flow (Bipartite)</div>
              <p className="text-[#8A8FA3] font-body m-0 leading-relaxed">
                Instead of everyone paying everyone back, the graph matching engine finds the optimal shortest path: debtor balances settle directly to creditors with the minimal number of payments.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* 3. BIPARTITE MINIMUM CASH FLOW SUMMARY CARDS                     */}
      {/* ================================================================ */}
      <div className="rounded-3xl bg-[#0F1117] border border-white/8 p-6 shadow-[0_16px_48px_rgba(0,0,0,0.8)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/8 pb-3">
          <div>
            <h3 className="text-sm font-display font-bold text-[#EDEEF2] m-0">
              Optimal Settlement Transit Ledger
            </h3>
            <p className="text-xs text-[#8A8FA3] font-body m-0 mt-0.5">
              Direct single-step transactions calculated via minimum cash flow
            </p>
          </div>
          <span className="text-[11px] font-mono text-[#C6FF3D] bg-[#C6FF3D]/10 px-2.5 py-1 rounded-full border border-[#C6FF3D]/30 w-fit">
            {settlements.length} Transits
          </span>
        </div>

        {settlements.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[#07080D] border border-white/6 text-center text-xs font-mono text-[#8A8FA3] space-y-2">
            <div>All debts settled. No active transit transactions.</div>
            <div className="text-[11px] text-[#8A8FA3]/70 font-body">
              When expenses are added, the minimum cash flow solver computes direct settlement cards here.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {settlements.map((s, idx) => {
              const fromMember = ledger.members.find((m) => m.user_id === s.from_user_id);
              const toMember = ledger.members.find((m) => m.user_id === s.to_user_id);

              return (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-[#07080D] border border-white/8 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-xs font-mono font-semibold text-[#FF5C7A]">
                      {fromMember?.name || s.from_user_id}
                    </div>
                    <div className="text-[10px] text-[#8A8FA3] font-mono">
                      owes {toMember?.name || s.to_user_id}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-mono font-bold text-[#EDEEF2] tabular-nums">
                      {cur}{(s.amount_cents / 100).toFixed(2)}
                    </div>
                    <div className="text-[10px] text-[#FFC439] font-mono font-semibold">
                      PayPal Ready
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/* 4. HIGH-DENSITY AG GRID AUDIT LEDGER                              */}
      {/* ================================================================ */}
      <div className="rounded-3xl bg-[#0F1117] border border-white/8 p-5 sm:p-6 shadow-[0_16px_48px_rgba(0,0,0,0.8)] space-y-4">
        {/* Search & Stats Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#8A8FA3] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search..."
              value={quickFilterText}
              onChange={(e) => setQuickFilterText(e.target.value)}
              className="w-full bg-[#07080D] border border-white/8 rounded-xl pl-10 pr-4 py-2 text-xs text-[#EDEEF2] placeholder-[#8A8FA3] font-body focus:outline-none focus:border-[#C6FF3D]"
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-[#8A8FA3]">
            <span>Audit Trail Entries:</span>
            <span className="font-bold text-[#EDEEF2] tabular-nums">{rowData.length}</span>
          </div>
        </div>

        {/* AG Grid Container or Empty Explanation */}
        {rowData.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#07080D] border border-white/6 text-center space-y-3">
            <Receipt className="w-8 h-8 text-[#8A8FA3]/50 mx-auto" />
            <div className="text-sm font-display font-bold text-[#EDEEF2]">Audit Trail Ready</div>
            <p className="text-xs text-[#8A8FA3] font-body max-w-md mx-auto m-0">
              Every expense, OCR receipt scan, and PayPal capture is verified and immutably recorded here with full split breakdowns.
            </p>
            <div className="pt-2">
              <Link to="/simulator" className="no-underline">
                <button className="px-4 py-2 rounded-xl bg-[#171A23] hover:bg-[#C6FF3D]/10 border border-white/10 hover:border-[#C6FF3D]/30 text-xs font-mono text-[#EDEEF2] hover:text-[#C6FF3D] transition-all cursor-pointer">
                  Go to Simulator to Log First Expense
                </button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="w-full h-[520px] ag-theme-quartz-dark rounded-2xl overflow-hidden border border-white/8">
            <AgGridReact
              rowData={rowData}
              columnDefs={colDefs}
              quickFilterText={quickFilterText}
              pagination={true}
              paginationPageSize={10}
              animateRows={true}
              rowHeight={48}
              headerHeight={44}
            />
          </div>
        )}
      </div>
    </div>
  );
};

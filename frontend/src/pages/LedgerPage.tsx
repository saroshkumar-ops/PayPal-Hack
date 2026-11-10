import React, { useState, useMemo, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { Link } from 'react-router-dom';
import type { TripLedger } from '../types';
import { 
  Search, 
  Receipt,
  Trash2,
  AlertTriangle,
  X,
  FileText
} from 'lucide-react';
import { StatusPill } from '../components/ui/StatusPill';
import { Button } from '../components/ui/Button';
import { PaperReceipt } from '../components/bits/PaperReceipt';
import { getCurrencySymbol } from '../lib/currency';
import { formatExpenseId, formatCategoryName, formatPartyName } from '../lib/formatters';
import { getMemberTagColor } from '../components/ui/Avatar';

interface LedgerPageProps {
  ledger: TripLedger;
  onDeleteExpense?: (expenseId: string) => Promise<void>;
}

export const LedgerPage: React.FC<LedgerPageProps> = ({ ledger, onDeleteExpense }) => {
  const [quickFilterText, setQuickFilterText] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ expenseId: string; description: string } | null>(null);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const cur = getCurrencySymbol(ledger.currency);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (deleteConfirm) {
          setDeleteConfirm(null);
        } else if (selectedExpenseId) {
          setSelectedExpenseId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteConfirm, selectedExpenseId]);

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
  const pendingCents = totalSpendCents - settledCents;

  // Selected expense for detailed paper inspection
  const inspectedExpense = useMemo(() => {
    if (!selectedExpenseId) return null;
    return ledger.expenses.find((e) => e.expense_id === selectedExpenseId) || null;
  }, [selectedExpenseId, ledger.expenses]);

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
        date: new Date(exp.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        category: exp.category,
        description: exp.description,
        amount: (exp.amount_cents / 100).toFixed(2),
        paid_by: payer?.name || exp.paid_by,
        paid_by_id: exp.paid_by,
        split_summary: splitSummary,
        status: isAllSettled ? 'SETTLED' : 'PENDING',
        split_type: exp.split_type,
        rawExpense: exp,
      };
    });
  }, [ledger, cur]);

  // AG Grid Column Definitions (Strict Token Compliance)
  const colDefs = useMemo<ColDef[]>(() => {
    return [
      {
        field: 'date',
        headerName: 'Date',
        width: 110,
        sortable: true,
        filter: true,
        cellRenderer: (params: ICellRendererParams) => (
          <span className="font-mono text-sm text-[var(--muted)]">{params.value}</span>
        ),
      },
      {
        field: 'category',
        headerName: 'Category',
        width: 130,
        sortable: true,
        filter: true,
        cellRenderer: (params: ICellRendererParams) => (
          <span className="px-2 py-0.5 rounded-md bg-[var(--surface-elevated)] border border-[var(--border)] text-xs sm:text-sm font-mono text-[var(--text)]">
            {formatCategoryName(params.value)}
          </span>
        ),
      },
      {
        field: 'description',
        headerName: 'Description',
        flex: 1,
        minWidth: 190,
        sortable: true,
        filter: true,
        cellRenderer: (params: ICellRendererParams) => (
          <div 
            onClick={() => setSelectedExpenseId(params.data.expense_id)}
            className="flex items-center gap-2 cursor-pointer hover:underline"
            title="Click to inspect receipt breakdown"
          >
            <span className="font-body text-sm font-semibold text-[var(--text)]">{params.value}</span>
            <span className="text-xs sm:text-sm font-mono text-[var(--muted)] bg-[var(--surface-elevated)] px-1.5 py-0.5 rounded border border-[var(--border)]">
              {formatExpenseId(params.data.expense_id)}
            </span>
          </div>
        ),
      },
      {
        field: 'amount',
        headerName: `Amount (${cur})`,
        width: 130,
        sortable: true,
        filter: true,
        cellRenderer: (params: ICellRendererParams) => (
          /* Neutral body text color with JetBrains Mono tabular numerals (strictly no lime) */
          <span className="font-mono text-sm sm:text-base font-bold text-[var(--text)] tabular-nums">
            {cur}{params.value}
          </span>
        ),
      },
      {
        field: 'paid_by',
        headerName: 'Paid By',
        width: 130,
        sortable: true,
        filter: true,
        cellRenderer: (params: ICellRendererParams) => {
          const tag = getMemberTagColor(params.data.paid_by_id);
          return (
            <div className="flex items-center gap-2 font-body text-sm text-[var(--text)]">
              <span
                style={{
                  backgroundColor: tag.bg,
                  color: tag.text,
                  borderColor: tag.border,
                }}
                className="w-5 h-5 rounded-md text-xs font-bold border flex items-center justify-center shrink-0"
              >
                {String(params.value).slice(0, 2).toUpperCase()}
              </span>
              <span className="truncate">{params.value}</span>
            </div>
          );
        },
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
        flex: 1.6,
        minWidth: 240,
        cellRenderer: (params: ICellRendererParams) => (
          <span 
            onClick={() => setSelectedExpenseId(params.data.expense_id)}
            className="font-mono text-sm text-[var(--muted)] hover:text-[var(--text)] truncate block cursor-pointer"
            title="Click to view full split ticket"
          >
            {params.value}
          </span>
        ),
      },
      {
        headerName: '',
        width: 55,
        sortable: false,
        filter: false,
        cellRenderer: (params: ICellRendererParams) => (
          /* Neutral trash button: stays --muted, neutral hover (coral is strictly inside confirm dialog) */
          <button
            onClick={() => setDeleteConfirm({ 
              expenseId: params.data.expense_id, 
              description: params.data.description 
            })}
            title="Delete Bill"
            className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-center"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        ),
      },
    ];
  }, [cur]);

  const settlements = ledger.simplified_settlements || [];

  return (
    <div className="space-y-6 w-full max-w-[1560px] mx-auto py-2">
      {/* ================================================================ */}
      {/* 1. ASYMMETRIC HEADER & FINANCIAL SUMMARY STRIP (NO 3-CARD SLOP)  */}
      {/* ================================================================ */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            {/* Active Party Marker */}
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[var(--surface-elevated)] border border-[var(--border)] text-xs font-mono text-[var(--text)]">
              <span className="w-1.5 h-1.5 bg-white/70 rounded-full" />
              <span className="font-semibold">{formatPartyName(ledger.trip_name || ledger.name, ledger.trip_id)}</span>
              <span className="text-[var(--muted)]">·</span>
              <span className="text-[var(--muted)]">{ledger.expenses.length} bills recorded</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-[var(--text)] tracking-tight leading-none m-0">
              Expense Audit
            </h1>

            <p className="text-xs sm:text-sm text-[var(--muted)] font-body leading-relaxed m-0">
              Verified double-entry log of all bills, itemized member claims, and exact payment statuses.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link to="/simulator" className="no-underline">
              <Button variant="secondary" size="md">
                <span>Chat Simulator</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Asymmetric Financial Tally Strip */}
        <div className="pt-4 border-t border-[var(--border)] grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border)] font-mono text-center gap-3 sm:gap-0">
          <div className="px-4 py-2 space-y-1 sm:text-left">
            <div className="text-xs uppercase text-[var(--muted)] tracking-wider font-semibold">Total Bills Logged</div>
            <div className="text-2xl font-display font-extrabold text-[var(--text)] tabular-nums">
              {cur}{(totalSpendCents / 100).toFixed(2)}
            </div>
            <div className="text-xs text-[var(--muted)] font-medium">{ledger.expenses.length} total receipts</div>
          </div>

          <div className="px-4 py-2 space-y-1 sm:text-left">
            <div className="text-xs uppercase text-[var(--muted)] tracking-wider font-semibold">Settled Volume</div>
            <div className="text-2xl font-display font-extrabold text-[var(--settled)] tabular-nums">
              {cur}{(settledCents / 100).toFixed(2)}
            </div>
            <div className="text-xs text-[var(--settled)] font-medium">{settledPercentage}% settled</div>
          </div>

          <div className="px-4 py-2 space-y-1 sm:text-left">
            <div className="text-xs uppercase text-[var(--muted)] tracking-wider font-semibold">Outstanding Volume</div>
            <div className="text-2xl font-display font-extrabold text-[var(--owes)] tabular-nums">
              {cur}{(pendingCents / 100).toFixed(2)}
            </div>
            <div className="text-xs text-[var(--muted)] font-medium">pending shares</div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* 2. DIRECT SETTLEMENT DIRECTIVES STRIP                            */}
      {/* ================================================================ */}
      {settlements.length > 0 && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
            <span className="text-sm font-mono font-semibold uppercase tracking-wider text-[var(--text)]">
              Direct Peer Settlements Required
            </span>
            <span className="text-xs sm:text-sm font-mono text-[var(--muted)] font-medium">
              {settlements.length} {settlements.length === 1 ? 'payment' : 'payments'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {settlements.map((s, idx) => {
              const fromMember = ledger.members.find((m) => m.user_id === s.from_user_id);
              const toMember = ledger.members.find((m) => m.user_id === s.to_user_id);

              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-[var(--canvas)] border border-[var(--border)] flex items-center justify-between gap-3 text-sm font-mono"
                >
                  <div>
                    <div className="font-semibold text-sm sm:text-base text-[var(--owes)]">
                      {fromMember?.name || s.from_user_id}
                    </div>
                    <div className="text-xs sm:text-sm text-[var(--muted)] font-mono">
                      owes {toMember?.name || s.to_user_id}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold text-sm sm:text-base text-[var(--text)] tabular-nums">
                      {cur}{(s.amount_cents / 100).toFixed(2)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ================================================================ */}
      {/* 3. HIGH-DENSITY AUDIT TABLE                                      */}
      {/* ================================================================ */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 space-y-4 shadow-sm">
        {/* Search & Header Strip */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[var(--muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by merchant, traveler, or ID..."
              value={quickFilterText}
              onChange={(e) => setQuickFilterText(e.target.value)}
              className="w-full bg-[var(--canvas)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-2 text-xs text-[var(--text)] placeholder-[var(--muted)] font-body focus:outline-none focus:border-white/30"
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-[var(--muted)]">
            <span>Logged Bills:</span>
            <span className="font-bold text-[var(--text)] tabular-nums">{rowData.length}</span>
          </div>
        </div>

        {/* AG Grid Container or Empty Explanation */}
        {rowData.length === 0 ? (
          <div className="p-12 rounded-xl bg-[var(--canvas)] border border-[var(--border)] text-center space-y-3">
            <Receipt className="w-8 h-8 text-[var(--muted)]/50 mx-auto" />
            <div className="text-sm font-display font-bold text-[var(--text)]">No Expenses Recorded</div>
            <p className="text-xs text-[var(--muted)] font-body max-w-md mx-auto m-0">
              When bills are scanned or added, every line item and custom split is permanently audited here.
            </p>
          </div>
        ) : (
          <div className="w-full h-[520px] ag-theme-quartz-dark rounded-xl overflow-hidden border border-[var(--border)]">
            <AgGridReact
              rowData={rowData}
              columnDefs={colDefs}
              quickFilterText={quickFilterText}
              pagination={true}
              paginationPageSize={10}
              animateRows={true}
              rowHeight={48}
              headerHeight={44}
              onRowClicked={(e) => setSelectedExpenseId(e.data.expense_id)}
            />
          </div>
        )}
      </section>

      {/* ================================================================ */}
      {/* 4. EXPENSE INSPECT MODAL (PHYSICAL TICKET VIEW)                   */}
      {/* ================================================================ */}
      {inspectedExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 overflow-y-auto select-none">
          <div className="w-full max-w-md max-h-[92vh] flex flex-col rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4 sm:p-6 shadow-2xl space-y-4 my-auto overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-[var(--text)]" />
                <h3 className="text-sm font-display font-bold text-[var(--text)] m-0">
                  Bill Ticket Breakdown
                </h3>
              </div>
              <button
                onClick={() => setSelectedExpenseId(null)}
                className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex justify-center py-2">
              <PaperReceipt
                merchantName={inspectedExpense.description || 'Scanned Bill'}
                receiptNumber={`#${inspectedExpense.expense_id.slice(-6).toUpperCase()}`}
                date={new Date(inspectedExpense.timestamp).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
                currency={ledger.currency}
                items={inspectedExpense.splits.map((s) => {
                  const m = ledger.members.find((mem) => mem.user_id === s.user_id);
                  return {
                    name: m ? `${m.name.split(' ')[0]}'s Share` : 'Member Share',
                    priceCents: s.owes_cents,
                    claimedByUserIds: [s.user_id],
                  };
                })}
                totalCents={inspectedExpense.amount_cents}
                members={ledger.members}
                memberSplits={inspectedExpense.splits.map((s) => {
                  const m = ledger.members.find((mem) => mem.user_id === s.user_id);
                  return {
                    user_id: s.user_id,
                    name: m ? m.name : s.user_id,
                    owes_cents: s.owes_cents,
                  };
                })}
                splitType={inspectedExpense.split_type === 'EQUAL' ? 'EQUAL' : 'CUSTOM'}
                rotateDeg={-0.5}
                interactive={false}
              />
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedExpenseId(null)}
              >
                <span>Close Ticket</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* 5. DELETE EXPENSE CONFIRMATION MODAL                             */}
      {/* ================================================================ */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 overflow-hidden select-none">
          <div className="w-full max-w-sm rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--owes)]/15 border border-[var(--owes)]/30 flex items-center justify-center text-[var(--owes)]">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-display font-bold text-[var(--text)] m-0">Delete Bill</h3>
                <p className="text-xs text-[var(--muted)] font-body m-0 mt-0.5">Remove this bill and recalculate balances</p>
              </div>
            </div>

            <p className="text-xs text-[var(--text)] font-body bg-[var(--canvas)] p-3 rounded-xl border border-[var(--border)] m-0 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-[var(--owes)]">{deleteConfirm.description}</span> ({formatExpenseId(deleteConfirm.expenseId)})?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteConfirm(null)}
                disabled={isDeleting}
              >
                <span>Cancel</span>
              </Button>
              {/* Allowed by Section 3: Coral is used inside confirmation dialog on destructive confirm button */}
              <button
                type="button"
                onClick={async () => {
                  if (!onDeleteExpense) return;
                  setIsDeleting(true);
                  try {
                    await onDeleteExpense(deleteConfirm.expenseId);
                    setDeleteConfirm(null);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
                className="px-3.5 py-2 rounded-xl bg-[var(--owes)] hover:brightness-110 text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-40"
              >
                {isDeleting ? 'Deleting...' : 'Delete Bill'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

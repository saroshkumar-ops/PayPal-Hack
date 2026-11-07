import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Send, 
  Clock, 
  Utensils, 
  CreditCard, 
  Flame, 
  Paperclip, 
  Sparkles, 
  MessageSquare, 
  ShieldAlert, 
  Table, 
  Search,
  ShieldCheck,
  Activity
} from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import type { ChatMessage, TripLedger } from '../types';
import { Logo } from '../components/common/Logo';

interface SimulatorPageProps {
  ledger: TripLedger;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onSimulateExpense: () => void;
  onAdvanceTime: (hours: number) => void;
  onPayDebt: (userId: string, amountCents: number, expenseId?: string) => void;
  onOpenReceiptModal: () => void;
  isLoading: boolean;
}

export const SimulatorPage: React.FC<SimulatorPageProps> = ({
  ledger,
  messages,
  onSendMessage,
  onSimulateExpense,
  onAdvanceTime,
  onPayDebt,
  onOpenReceiptModal,
  isLoading,
}) => {
  const [inputText, setInputText] = useState('');
  const [mobileTab, setMobileTab] = useState<'chat' | 'grid' | 'matrix'>('chat');
  const [rightPanelTab, setRightPanelTab] = useState<'grid' | 'matrix'>('grid');
  const [gridFilterText, setGridFilterText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const alexDebtor = ledger.members.find(m => m.user_id === 'user_02') || ledger.members[1];
  const heat = alexDebtor.heat_score || 75;

  // Calculate live financial metrics for the grid banner
  const totalSpendCents = ledger.expenses.reduce((sum, exp) => sum + exp.amount_cents, 0);
  let settledCents = 0;
  ledger.expenses.forEach((exp) => {
    exp.splits.forEach((split) => {
      if (split.paid_status === 'SETTLED') settledCents += split.owes_cents;
    });
  });
  const settledPercentage = totalSpendCents > 0 ? Math.round((settledCents / totalSpendCents) * 100) : 0;

  // AG Grid Row Data (Reactive to live ledger updates)
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
        width: 85,
        sortable: true,
        filter: true,
      },
      {
        field: 'category',
        headerName: 'Category',
        width: 105,
        sortable: true,
        filter: true,
        cellRenderer: (params: ICellRendererParams) => (
          <span className="text-[11px] font-medium text-[#B7C6D3]">{params.value}</span>
        ),
      },
      {
        field: 'description',
        headerName: 'Description',
        flex: 1.3,
        minWidth: 140,
        sortable: true,
        filter: true,
        cellRenderer: (params: ICellRendererParams) => (
          <span className="font-semibold text-xs text-[#E7EDF2] truncate">{params.value}</span>
        ),
      },
      {
        field: 'amount',
        headerName: 'Amount (INR)',
        width: 110,
        sortable: true,
        filter: 'agNumberColumnFilter',
        cellRenderer: (params: ICellRendererParams) => (
          <span className="font-mono font-bold text-xs text-[#E7EDF2]">₹{params.value}</span>
        ),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 100,
        sortable: true,
        filter: true,
        cellRenderer: (params: ICellRendererParams) => {
          const isSettled = params.value === 'SETTLED';
          return (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
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
      {
        field: 'paid_by',
        headerName: 'Fronted By',
        width: 100,
        sortable: true,
        cellRenderer: (params: ICellRendererParams) => (
          <span className="text-[11px] text-[#B7C6D3] truncate">{params.value}</span>
        ),
      },
      {
        field: 'split_summary',
        headerName: 'Split Details',
        flex: 1.5,
        minWidth: 170,
        cellRenderer: (params: ICellRendererParams) => (
          <span className="text-[10px] text-[#8199AE] font-mono truncate">{params.value}</span>
        ),
      },
    ];
  }, []);

  return (
    <div className="space-y-4 w-full py-1">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-[#33475A]">
        <div>
          <h1 className="text-xl font-bold text-[#E7EDF2] tracking-tight m-0 flex items-center gap-2">
            Telegram Group Chat & Judge Simulator
            <span className="text-[10px] font-mono text-[#8199AE] bg-[#1F2C38] border border-[#33475A] px-2 py-0.5 rounded">
              Split-Screen Mode
            </span>
          </h1>
          <p className="text-xs text-[#8199AE] m-0 mt-0.5">
            Real-time interactive chat synchronized with live AG Grid accounting and PayPal sandbox rails
          </p>
        </div>

        {/* Action Triggers */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={onSimulateExpense}
            disabled={isLoading}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1F2C38] hover:bg-[#33475A] border border-[#33475A] text-xs font-medium text-[#E7EDF2] transition-all cursor-pointer"
          >
            <Utensils className="w-3.5 h-3.5 text-[#8199AE]" />
            Simulate Dinner
          </button>
          <button
            onClick={() => onAdvanceTime(24)}
            disabled={isLoading}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#4E6A83] hover:bg-[#33475A] text-xs font-medium text-[#E7EDF2] transition-all cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5" />
            Fast-Forward +24h
          </button>
          <button
            onClick={() => onPayDebt('user_02', 49933)}
            disabled={isLoading}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1F2C38] hover:bg-[#33475A] border border-[#33475A] text-xs font-medium text-[#E7EDF2] transition-all cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5 text-[#8199AE]" />
            Pay Alex's Share
          </button>
        </div>
      </div>

      {/* Mobile Tab Toggle (< lg only) */}
      <div className="lg:hidden flex rounded-xl bg-[#1F2C38] border border-[#33475A] p-1">
        <button
          onClick={() => setMobileTab('chat')}
          className={`flex-1 py-1.5 px-2 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            mobileTab === 'chat'
              ? 'bg-[#4E6A83] text-[#E7EDF2] shadow-sm'
              : 'text-[#8199AE] hover:text-[#B7C6D3]'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Chat ({messages.length})</span>
        </button>
        <button
          onClick={() => setMobileTab('grid')}
          className={`flex-1 py-1.5 px-2 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            mobileTab === 'grid'
              ? 'bg-[#4E6A83] text-[#E7EDF2] shadow-sm'
              : 'text-[#8199AE] hover:text-[#B7C6D3]'
          }`}
        >
          <Table className="w-3.5 h-3.5" />
          <span>AG Grid</span>
        </button>
        <button
          onClick={() => setMobileTab('matrix')}
          className={`flex-1 py-1.5 px-2 flex items-center justify-center gap-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            mobileTab === 'matrix'
              ? 'bg-[#4E6A83] text-[#E7EDF2] shadow-sm'
              : 'text-[#8199AE] hover:text-[#B7C6D3]'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Escalation ({heat}%)</span>
        </button>
      </div>

      {/* Main Grid: Responsive Side-by-Side (PC Full Screen) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Column: Chat Feed (6 cols on widescreen) */}
        <div
          className={`lg:col-span-6 flex flex-col rounded-2xl border border-[#33475A] bg-[#1F2C38] overflow-hidden shadow-sm h-[calc(100vh-310px)] lg:h-[calc(100vh-190px)] min-h-[480px] lg:min-h-[620px] ${
            mobileTab === 'chat' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Channel Header */}
          <div className="px-4 py-3 border-b border-[#33475A] bg-[#10161C]/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Logo size="sm" showText={false} />
              <div>
                <div className="text-xs font-bold text-[#E7EDF2] leading-tight">
                  {ledger.trip_name || 'TripSheriff Treasury'} #expenses
                </div>
                <div className="text-[10px] text-[#8199AE]">TripSheriff AI Bot Active</div>
              </div>
            </div>
            <span className="text-[10px] font-mono text-[#8199AE] bg-[#10161C] border border-[#33475A] px-2 py-0.5 rounded-md">
              Telegram Gateway
            </span>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className="flex flex-col items-start max-w-[92%] sm:max-w-[88%]">
                <div className="flex items-center gap-2 mb-1 pl-1">
                  <span className="text-xs font-bold text-[#E7EDF2]">{msg.sender_name}</span>
                  <span className="text-[10px] text-[#8199AE] font-mono">{msg.sender_handle}</span>
                  <span className="text-[10px] text-[#8199AE]">• {msg.timestamp}</span>
                </div>

                <div
                  className={`rounded-2xl p-3.5 text-xs leading-relaxed border ${
                    msg.is_bot
                      ? 'bg-[#10161C] border-[#33475A] text-[#E7EDF2]'
                      : 'bg-[#33475A]/40 border-[#33475A] text-[#E7EDF2]'
                  }`}
                >
                  {msg.badge && (
                    <div className="mb-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1F2C38] border border-[#33475A] text-[#8199AE]">
                        {msg.badge}
                      </span>
                    </div>
                  )}

                  <div className="whitespace-pre-line text-[#B7C6D3]">
                    {msg.text.split('**').map((part, i) =>
                      i % 2 === 1 ? <strong key={i} className="text-[#E7EDF2] font-semibold">{part}</strong> : part
                    )}
                  </div>

                  {/* Dynamic Pillow WANTED meme poster card from AI microservice */}
                  {msg.image_card_base64 && (
                    <div className="mt-3 rounded-xl overflow-hidden border border-[#4E6A83] max-w-xs shadow-md">
                      <img
                        src={`data:image/png;base64,${msg.image_card_base64}`}
                        alt="WANTED Deadbeat Meme Poster"
                        className="w-full h-auto block"
                      />
                    </div>
                  )}

                  {/* Public Deadbeat Roast Poster (Tier 4 fallback) */}
                  {msg.roast_tier === 'PUBLIC_ROAST' && !msg.image_card_base64 && (
                    <div className="mt-3 p-3 rounded-xl bg-[#10161C] border border-[#4E6A83] text-left">
                      <div className="text-[10px] font-mono font-bold text-[#E7EDF2] uppercase tracking-wider">
                        WANTED: DEADBEAT TRAVELER
                      </div>
                      <div className="text-xs text-[#E7EDF2] font-semibold mt-1">
                        Alex Rivera • ₹499.33 INR
                      </div>
                      <div className="text-[11px] text-[#8199AE] italic mt-0.5">
                        "Consensus roast active. Demoted to pull-out couch until settled."
                      </div>
                    </div>
                  )}

                  {/* Interactive PayPal Buttons */}
                  {msg.buttons && msg.buttons.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-[#33475A] flex flex-wrap gap-2">
                      {msg.buttons.map((btn, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            if (btn.payload) {
                              onPayDebt(btn.payload.userId, btn.payload.amountCents, btn.payload.expenseId);
                            } else {
                              onPayDebt('user_02', 49933, 'exp_8821');
                            }
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#4E6A83] hover:bg-[#33475A] text-[#E7EDF2] transition-all cursor-pointer"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          {btn.text}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-[#33475A] bg-[#10161C]/60 flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenReceiptModal}
              title="Upload Receipt"
              className="p-2.5 rounded-lg bg-[#1F2C38] hover:bg-[#33475A] border border-[#33475A] text-[#8199AE] hover:text-[#E7EDF2] transition-colors cursor-pointer"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              type="text"
              placeholder="e.g. Paid ₹600 for dinner with Alex and Dave..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-[#10161C] border border-[#33475A] rounded-xl px-3.5 py-2 text-xs text-[#E7EDF2] placeholder-[#8199AE] focus:outline-none focus:border-[#4E6A83]"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="p-2.5 rounded-lg bg-[#4E6A83] hover:bg-[#33475A] text-[#E7EDF2] transition-all disabled:opacity-40 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Right Column: Live AG Grid Ledger / Escalation Matrix (6 cols on widescreen) */}
        <div
          className={`lg:col-span-6 flex flex-col rounded-2xl border border-[#33475A] bg-[#1F2C38] overflow-hidden shadow-sm h-[calc(100vh-310px)] lg:h-[calc(100vh-190px)] min-h-[480px] lg:min-h-[620px] ${
            mobileTab === 'grid' || mobileTab === 'matrix' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Header Toolbar: Tab Switcher & Live Sync Indicator */}
          <div className="px-4 py-2.5 border-b border-[#33475A] bg-[#10161C]/50 flex items-center justify-between">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#10161C] border border-[#33475A]">
              <button
                onClick={() => {
                  setRightPanelTab('grid');
                  setMobileTab('grid');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  (mobileTab === 'grid' || (rightPanelTab === 'grid' && mobileTab !== 'matrix'))
                    ? 'bg-[#4E6A83] text-[#E7EDF2] shadow-sm'
                    : 'text-[#8199AE] hover:text-[#B7C6D3]'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Live AG Grid Ledger</span>
              </button>

              <button
                onClick={() => {
                  setRightPanelTab('matrix');
                  setMobileTab('matrix');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  (mobileTab === 'matrix' || (rightPanelTab === 'matrix' && mobileTab !== 'grid'))
                    ? 'bg-[#4E6A83] text-[#E7EDF2] shadow-sm'
                    : 'text-[#8199AE] hover:text-[#B7C6D3]'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Escalation Matrix</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono text-[#E7EDF2] bg-[#10161C] border border-[#33475A] px-2 py-0.5 rounded">
                <Activity className="w-3 h-3 text-[#8199AE]" />
                Live Sync
              </span>
            </div>
          </div>

          {/* Body Content: View A (AG Grid Ledger) vs View B (Escalation Matrix) */}
          {(mobileTab === 'grid' || (rightPanelTab === 'grid' && mobileTab !== 'matrix')) ? (
            <div className="flex-1 flex flex-col p-4 overflow-hidden space-y-3">
              {/* Quick Search & Summary Banner */}
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 text-[#8199AE] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filter expenses in grid..."
                    value={gridFilterText}
                    onChange={(e) => setGridFilterText(e.target.value)}
                    className="w-full bg-[#10161C] border border-[#33475A] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#E7EDF2] placeholder-[#8199AE] focus:outline-none focus:border-[#4E6A83]"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-[#8199AE] text-[11px]">Total:</span>
                  <span className="font-bold text-[#E7EDF2]">₹{(totalSpendCents / 100).toFixed(2)}</span>
                  <span className="text-[#8199AE]">•</span>
                  <span className="text-[#8199AE] text-[11px]">Settled:</span>
                  <span className="font-bold text-[#E7EDF2]">{settledPercentage}%</span>
                </div>
              </div>

              {/* Embedded AG Grid Container */}
              <div className="flex-1 rounded-xl overflow-hidden border border-[#33475A] bg-[#10161C]">
                <div className="ag-theme-quartz ag-theme-quartz-dark w-full h-full">
                  <AgGridReact
                    rowData={rowData}
                    columnDefs={colDefs}
                    quickFilterText={gridFilterText}
                    defaultColDef={{ resizable: true, sortable: true }}
                    animateRows={true}
                    pagination={true}
                    paginationPageSize={8}
                  />
                </div>
              </div>

              {/* Grid Footer with Escrow & Settlement Indicator */}
              <div className="p-2.5 rounded-xl bg-[#10161C] border border-[#33475A] flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#8199AE]" />
                  <span className="text-[#8199AE]">Platform Escrow:</span>
                  <span className="font-bold text-[#E7EDF2]">
                    ₹{((ledger.platform_escrow_cents || 0) / 100).toFixed(2)} INR
                  </span>
                </div>
                <div className="text-[11px] text-[#8199AE]">
                  Conserved Balance: ₹0.00
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {/* Debt Escalation Matrix Card */}
              <div className="rounded-xl border border-[#33475A] bg-[#10161C] p-4 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-[#33475A]">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-[#8199AE]" />
                    <span className="text-xs font-bold text-[#E7EDF2] uppercase tracking-wider">
                      Active Debt Heat Gauge
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#8199AE] bg-[#1F2C38] border border-[#33475A] px-2 py-0.5 rounded">
                    Consent: {alexDebtor.roast_consent}
                  </span>
                </div>

                <div className="my-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[#E7EDF2]">{alexDebtor.name}</div>
                      <div className="text-[11px] text-[#8199AE] font-mono">{alexDebtor.handle}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold font-mono text-[#E7EDF2]">₹799.33 Overdue</div>
                      <div className="text-[10px] text-[#8199AE]">{ledger.hours_elapsed}h Unpaid</div>
                    </div>
                  </div>

                  {/* Heat Score Bar */}
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-[#8199AE]">Debt Heat Score</span>
                      <span className="font-mono text-[#E7EDF2]">{heat}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[#1F2C38] overflow-hidden">
                      <div className="h-full bg-[#4E6A83] rounded-full transition-all duration-500" style={{ width: `${heat}%` }} />
                    </div>
                  </div>

                  {/* Current Persona Quote */}
                  <div className="p-3 rounded-xl bg-[#1F2C38] border border-[#33475A] text-[11px] text-[#B7C6D3] italic leading-relaxed">
                    "Alex beta, I see your stories from the cafe. Sarah is still waiting on your ₹499.33 dinner share from yesterday."
                  </div>
                </div>

                <button
                  onClick={() => onAdvanceTime(24)}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#4E6A83] hover:bg-[#33475A] text-xs font-semibold text-[#E7EDF2] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Fast-Forward +24h to Escalate Tone
                </button>
              </div>

              {/* Member Net Balances */}
              <div className="rounded-xl border border-[#33475A] bg-[#10161C] p-4 shadow-sm">
                <div className="text-xs font-bold text-[#E7EDF2] uppercase tracking-wider pb-2.5 mb-2.5 border-b border-[#33475A]">
                  Member Net Balances (Conservation Rule)
                </div>

                <div className="space-y-2">
                  {ledger.members.map((m) => {
                    const net = (ledger.net_balances_cents[m.user_id] || 0) / 100;
                    const isCreditor = net > 0;
                    const isSettled = net === 0;

                    return (
                      <div
                        key={m.user_id}
                        className="flex items-center justify-between p-2 rounded-lg bg-[#1F2C38] border border-[#33475A]"
                      >
                        <div>
                          <div className="text-xs font-semibold text-[#E7EDF2]">{m.name}</div>
                          <div className="text-[10px] text-[#8199AE] font-mono">{m.handle}</div>
                        </div>
                        <div className="text-right font-mono text-xs font-bold text-[#E7EDF2]">
                          {isCreditor ? `+₹${net.toFixed(2)}` : isSettled ? '₹0.00' : `-₹${Math.abs(net).toFixed(2)}`}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] text-[#8199AE] font-mono mt-2.5 m-0">
                  Net Balance Conservation: Exactly ₹0.00
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

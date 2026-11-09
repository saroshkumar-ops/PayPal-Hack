import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Wallet, ArrowUpRight } from 'lucide-react';
import { getCurrencySymbol } from '../../lib/currency';
import { formatPartyName } from '../../lib/formatters';

interface VirtualTripCardProps {
  balanceCents: number;
  tripName: string;
  organizerName: string;
  organizerEmail?: string;
  currency?: string;
  onPayout: () => void;
}

export const VirtualTripCard: React.FC<VirtualTripCardProps> = ({
  balanceCents,
  tripName,
  organizerName,
  organizerEmail,
  currency = 'INR',
  onPayout,
}) => {
  const formattedBalance = (balanceCents / 100).toFixed(2);
  const curSymbol = getCurrencySymbol(currency);
  const curCode = currency?.toUpperCase() === 'USD' ? 'USD' : 'INR';
  const [isFlipped, setIsFlipped] = useState(false);

  const toggleFlip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlipped((prev) => !prev);
  };

  return (
    <div className="relative w-full flex flex-col justify-between select-none">
      {/* Top Bar: Label & Flip Toggle */}
      <div className="w-full flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-white/60 rounded-full" />
          <span className="text-[11px] font-mono text-[var(--muted)] uppercase tracking-wider">
            ORGANIZER TREASURY
          </span>
        </div>
        <button
          onClick={toggleFlip}
          title="Flip card details"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--surface-elevated)] hover:bg-white/10 border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] text-xs font-mono transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" />
          <span>{isFlipped ? 'Front' : 'Details'}</span>
        </button>
      </div>

      {/* Card Stage with Smooth Perspective */}
      <div
        className="relative w-full h-[220px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-sm"
        style={{ perspective: 1000 }}
      >
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="w-full h-full relative [transform-style:preserve-3d]"
        >
          {/* FRONT FACE */}
          <div
            className={`absolute inset-0 p-5 flex flex-col justify-between bg-[var(--surface-elevated)] [backface-visibility:hidden] ${
              isFlipped ? 'pointer-events-none' : ''
            }`}
          >
            {/* Header: Trip Name & PayPal Channel */}
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[var(--canvas)] border border-[var(--border)] flex items-center justify-center">
                  <Wallet className="w-3.5 h-3.5 text-[var(--text)]" />
                </div>
                <span className="text-xs font-display font-bold text-[var(--text)] truncate max-w-[170px]">
                  {formatPartyName(tripName)}
                </span>
              </div>

              <span className="text-[11px] font-mono font-bold tracking-tight text-[var(--paypal)]">
                PayPal
              </span>
            </div>

            {/* Core: Collected Payout Balance */}
            <div className="my-1">
              <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-mono">
                Available to Payout
              </div>
              <div className="text-3xl font-display font-extrabold text-[var(--text)] tracking-tight flex items-baseline gap-1 mt-1">
                <span>{curSymbol}</span>
                <span className="tabular-nums font-mono">{formattedBalance}</span>
                <span className="text-xs text-[var(--muted)] font-mono font-normal">{curCode}</span>
              </div>
            </div>

            {/* Footer: Organizer Receiver & Action */}
            <div className="flex items-end justify-between pt-3 border-t border-[var(--border)]">
              <div className="min-w-0 pr-2">
                <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-mono">
                  Receiver
                </div>
                <div className="text-xs font-body font-semibold text-[var(--text)] truncate max-w-[170px]">
                  {organizerName}
                </div>
                {organizerEmail && (
                  <div className="text-[10px] text-[var(--muted)] font-mono truncate max-w-[170px]">
                    {organizerEmail}
                  </div>
                )}
              </div>

              {/* Dedicated PayPal Gold Payout Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPayout();
                }}
                disabled={balanceCents <= 0}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--paypal)] hover:brightness-105 disabled:opacity-30 disabled:cursor-not-allowed text-[var(--canvas)] text-xs font-body font-bold transition-all cursor-pointer shrink-0"
              >
                <span>Payout</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* BACK FACE (FLIPPED) */}
          <div
            className={`absolute inset-0 p-5 flex flex-col justify-between bg-[var(--surface)] border border-[var(--border)] [transform:rotateY(180deg)] [backface-visibility:hidden] ${
              !isFlipped ? 'pointer-events-none' : ''
            }`}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
              <span className="text-xs font-display font-bold text-[var(--text)]">
                Payout Details
              </span>
              <span className="text-[10px] font-mono text-[var(--muted)]">API v1</span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between text-[var(--muted)]">
                <span>Trip:</span>
                <span className="text-[var(--text)] truncate max-w-[170px]">{formatPartyName(tripName)}</span>
              </div>
              <div className="flex justify-between text-[var(--muted)]">
                <span>Receiver:</span>
                <span className="text-[var(--text)] truncate max-w-[170px]">{organizerName}</span>
              </div>
              <div className="flex justify-between text-[var(--muted)]">
                <span>Status:</span>
                <span className={balanceCents > 0 ? 'text-[var(--text)] font-semibold' : 'text-[var(--settled)]'}>
                  {balanceCents > 0 ? 'Awaiting Payout' : 'All Settled'}
                </span>
              </div>
            </div>

            <div className="text-[11px] font-body text-[var(--muted)] pt-2 border-t border-[var(--border)] leading-relaxed">
              When members pay their split, funds pool here until transferred to the organizer's PayPal account.
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

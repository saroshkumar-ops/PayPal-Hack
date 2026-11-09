import React from 'react';
import { motion } from 'framer-motion';
import { getCurrencySymbol } from '../../lib/currency';
import { getMemberTagColor } from '../ui/Avatar';

export interface ReceiptItemData {
  id?: string;
  name: string;
  priceCents: number;
  claimedByUserIds?: string[];
}

export interface PaperReceiptProps {
  merchantName?: string;
  receiptNumber?: string;
  date?: string;
  currency?: string;
  items: ReceiptItemData[];
  taxCents?: number;
  tipCents?: number;
  totalCents: number;
  members?: Array<{ user_id: string; name: string }>;
  selectedItemId?: string | null;
  onTapItem?: (index: number, item: ReceiptItemData) => void;
  onDragStartItem?: (e: React.DragEvent, index: number, item: ReceiptItemData) => void;
  className?: string;
  rotateDeg?: number;
  interactive?: boolean;
}

export const PaperReceipt: React.FC<PaperReceiptProps> = ({
  merchantName = 'TRIP EXPENSE',
  receiptNumber = '#REC-001',
  date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  currency = 'INR',
  items = [],
  taxCents = 0,
  tipCents = 0,
  totalCents,
  members = [],
  selectedItemId,
  onTapItem,
  onDragStartItem,
  className = '',
  rotateDeg = -0.75,
  interactive = true,
}) => {
  const cur = getCurrencySymbol(currency);
  const subtotalCents = items.reduce((acc, item) => acc + item.priceCents, 0) || totalCents;

  return (
    <motion.div
      style={{
        rotate: rotateDeg,
        transformOrigin: 'center top',
      }}
      className={`relative w-full max-w-[380px] bg-[var(--receipt-paper)] text-[var(--receipt-ink)] font-mono text-xs select-none shadow-[0_24px_48px_-12px_rgba(0,0,0,0.85)] transition-transform duration-200 ${className}`}
    >
      {/* Top Perforated Torn Edge */}
      <div className="w-full h-3 overflow-hidden -mt-2.5">
        <svg
          viewBox="0 0 380 12"
          preserveAspectRatio="none"
          className="w-full h-full fill-[var(--receipt-paper)]"
        >
          <path d="M0,12 L0,4 L10,0 L20,4 L30,0 L40,4 L50,0 L60,4 L70,0 L80,4 L90,0 L100,4 L110,0 L120,4 L130,0 L140,4 L150,0 L160,4 L170,0 L180,4 L190,0 L200,4 L210,0 L220,4 L230,0 L240,4 L250,0 L260,4 L270,0 L280,4 L290,0 L300,4 L310,0 L320,4 L330,0 L340,4 L350,0 L360,4 L370,0 L380,4 L380,12 Z" />
        </svg>
      </div>

      {/* Receipt Body */}
      <div className="px-5 pt-3 pb-4 space-y-3">
        {/* Header */}
        <div className="text-center space-y-1 border-b border-[var(--receipt-ink)]/20 pb-3">
          <div className="text-[10px] tracking-widest uppercase opacity-60">
            --- OFFICIAL TRIP RECEIPT ---
          </div>
          <h3 className="font-display font-black text-base uppercase tracking-tight text-[var(--receipt-ink)] m-0">
            {merchantName}
          </h3>
          <div className="flex items-center justify-between text-[11px] opacity-75 pt-1">
            <span>{receiptNumber}</span>
            <span>{date}</span>
          </div>
        </div>

        {/* Line Items List */}
        <div className="space-y-1.5 py-1">
          <div className="flex justify-between text-[10px] uppercase tracking-wider opacity-50 border-b border-dashed border-[var(--receipt-ink)]/20 pb-1">
            <span>Item</span>
            <span>Amount</span>
          </div>

          {items.length === 0 ? (
            <div className="py-6 text-center text-[11px] opacity-60 italic">
              No individual items listed.
            </div>
          ) : (
            items.map((item, idx) => {
              const isSelected = selectedItemId === (item.id || `item_${idx}`);
              const claimedCount = item.claimedByUserIds?.length || 0;
              const perPersonCents = claimedCount > 0 ? Math.round(item.priceCents / claimedCount) : item.priceCents;

              return (
                <div
                  key={item.id || idx}
                  draggable={interactive && Boolean(onDragStartItem)}
                  onDragStart={(e) => onDragStartItem?.(e, idx, item)}
                  onClick={() => interactive && onTapItem?.(idx, item)}
                  className={`p-1.5 rounded transition-all ${
                    interactive ? 'cursor-pointer hover:bg-black/5 active:bg-black/10' : ''
                  } ${isSelected ? 'bg-black/10 ring-1 ring-[var(--receipt-ink)]' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-xs leading-tight truncate">
                        {item.name}
                      </div>
                      {claimedCount > 1 && (
                        <div className="text-[10px] opacity-60 tabular-nums">
                          {cur}{(perPersonCents / 100).toFixed(2)} each ({claimedCount} shares)
                        </div>
                      )}
                    </div>
                    <div className="font-bold tabular-nums shrink-0 text-xs">
                      {cur}{(item.priceCents / 100).toFixed(2)}
                    </div>
                  </div>

                  {/* Member Claim Initials Chips */}
                  {item.claimedByUserIds && item.claimedByUserIds.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap mt-1">
                      {item.claimedByUserIds.map((userId) => {
                        const m = members.find((mem) => mem.user_id === userId);
                        const name = m?.name || userId;
                        const initial = name.slice(0, 2).toUpperCase();
                        const color = getMemberTagColor(userId);

                        return (
                          <span
                            key={userId}
                            style={{
                              backgroundColor: color.bg,
                              borderColor: color.border,
                              color: color.text,
                            }}
                            className="inline-flex items-center px-1 py-0.2 rounded text-[9px] font-bold border"
                            title={name}
                          >
                            {initial}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Calculations / Subtotal / Tax / Total */}
        <div className="border-t border-dashed border-[var(--receipt-ink)]/30 pt-2 space-y-1 text-xs">
          <div className="flex justify-between text-[11px] opacity-75">
            <span>SUBTOTAL</span>
            <span className="tabular-nums">{cur}{(subtotalCents / 100).toFixed(2)}</span>
          </div>

          {taxCents > 0 && (
            <div className="flex justify-between text-[11px] opacity-75">
              <span>TAX</span>
              <span className="tabular-nums">{cur}{(taxCents / 100).toFixed(2)}</span>
            </div>
          )}

          {tipCents > 0 && (
            <div className="flex justify-between text-[11px] opacity-75">
              <span>TIP</span>
              <span className="tabular-nums">{cur}{(tipCents / 100).toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between text-sm font-black border-t-2 border-[var(--receipt-ink)] pt-1.5 mt-1">
            <span>TOTAL DUE</span>
            <span className="tabular-nums">{cur}{(totalCents / 100).toFixed(2)}</span>
          </div>
        </div>

        {/* Footer Barcode Stamp */}
        <div className="pt-2 text-center space-y-1.5 border-t border-[var(--receipt-ink)]/20">
          {/* Simulated clean barcode strip */}
          <div className="flex justify-center items-end gap-[2px] h-6 py-1 opacity-70">
            {[4, 2, 5, 1, 3, 6, 2, 4, 1, 5, 2, 6, 3, 2, 5, 1, 4, 3, 6, 2, 5, 1, 3, 6, 2, 4].map((h, i) => (
              <span
                key={i}
                style={{ height: `${h * 3}px` }}
                className={`w-[2px] bg-[var(--receipt-ink)] inline-block ${i % 3 === 0 ? 'w-[3px]' : ''}`}
              />
            ))}
          </div>
          <div className="text-[9px] tracking-wider uppercase opacity-50">
            THANK YOU • SPLIT WITH TRIPSHERIFF
          </div>
        </div>
      </div>

      {/* Bottom Perforated Torn Edge */}
      <div className="w-full h-3 overflow-hidden -mb-2.5">
        <svg
          viewBox="0 0 380 12"
          preserveAspectRatio="none"
          className="w-full h-full fill-[var(--receipt-paper)] rotate-180"
        >
          <path d="M0,12 L0,4 L10,0 L20,4 L30,0 L40,4 L50,0 L60,4 L70,0 L80,4 L90,0 L100,4 L110,0 L120,4 L130,0 L140,4 L150,0 L160,4 L170,0 L180,4 L190,0 L200,4 L210,0 L220,4 L230,0 L240,4 L250,0 L260,4 L270,0 L280,4 L290,0 L300,4 L310,0 L320,4 L330,0 L340,4 L350,0 L360,4 L370,0 L380,4 L380,12 Z" />
        </svg>
      </div>
    </motion.div>
  );
};

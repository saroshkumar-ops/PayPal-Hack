import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { getCurrencySymbol } from '../../lib/currency';
import { getMemberTagColor } from '../ui/Avatar';

export interface ReceiptItemData {
  id?: string;
  name: string;
  qty?: number;
  quantity?: number;
  unitPriceCents?: number;
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
  roundOffCents?: number;
  totalCents: number;
  members?: Array<{ user_id: string; name: string }>;
  memberSplits?: Array<{ user_id: string; owes_cents: number; name?: string }>;
  splitType?: string;
  selectedItemId?: string | null;
  onTapItem?: (index: number, item: ReceiptItemData) => void;
  onDragStartItem?: (e: React.DragEvent, index: number, item: ReceiptItemData) => void;
  className?: string;
  rotateDeg?: number;
  interactive?: boolean;
  animatingSplit?: boolean;
}

export const PaperReceipt: React.FC<PaperReceiptProps> = ({
  merchantName = 'TRIP EXPENSE',
  receiptNumber = '#REC-001',
  date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  currency = 'INR',
  items = [],
  taxCents = 0,
  tipCents = 0,
  roundOffCents = 0,
  totalCents,
  members = [],
  memberSplits,
  splitType = 'EQUAL',
  selectedItemId,
  onTapItem,
  onDragStartItem,
  className = '',
  rotateDeg = -0.75,
  interactive = true,
  animatingSplit = false,
}) => {
  const cur = getCurrencySymbol(currency);
  const subtotalCents = items.reduce((acc, item) => acc + item.priceCents, 0) || totalCents;

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Guarantee stagger animation never exceeds 1.0s regardless of item count
  const maxDelay = 0.75;
  const itemDelay = items.length > 0 ? Math.min(0.04, maxDelay / items.length) : 0.04;

  // Derive traveler split shares to display on the receipt
  const computedSplits: Array<{ user_id: string; name: string; owes_cents: number }> = useMemo(() => {
    if (memberSplits && memberSplits.length > 0) {
      return memberSplits.map((ms) => {
        const mem = members.find((m) => m.user_id === ms.user_id);
        return {
          user_id: ms.user_id,
          name: ms.name || mem?.name || ms.user_id,
          owes_cents: ms.owes_cents,
        };
      });
    }

    if (members.length === 0) return [];

    // If items have claimed members, compute each member's share
    if (items.length > 0) {
      const shares: Record<string, number> = {};
      members.forEach((m) => { shares[m.user_id] = 0; });
      let itemSub = 0;

      items.forEach((it) => {
        itemSub += it.priceCents;
        const claimants = it.claimedByUserIds && it.claimedByUserIds.length > 0
          ? it.claimedByUserIds
          : members.map((m) => m.user_id);
        const count = Math.max(1, claimants.length);
        const base = Math.floor(it.priceCents / count);
        const rem = it.priceCents % count;
        claimants.forEach((uid, i) => {
          shares[uid] = (shares[uid] || 0) + base + (i < rem ? 1 : 0);
        });
      });

      const diff = totalCents - itemSub;
      if (diff !== 0 && itemSub > 0) {
        let dist = 0;
        members.forEach((m, idx) => {
          if (idx === members.length - 1) {
            shares[m.user_id] = Math.max(0, (shares[m.user_id] || 0) + (diff - dist));
          } else {
            const extra = Math.round(((shares[m.user_id] || 0) * diff) / itemSub);
            shares[m.user_id] = Math.max(0, (shares[m.user_id] || 0) + extra);
            dist += extra;
          }
        });
      }

      return members.map((m) => ({
        user_id: m.user_id,
        name: m.name,
        owes_cents: shares[m.user_id] || 0,
      }));
    }

    // Default even split if no items
    const evenShare = Math.floor(totalCents / members.length);
    const rem = totalCents % members.length;
    return members.map((m, i) => ({
      user_id: m.user_id,
      name: m.name,
      owes_cents: evenShare + (i < rem ? 1 : 0),
    }));
  }, [memberSplits, members, items, totalCents]);

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
          <div className="text-xs font-semibold tracking-wider uppercase opacity-80">
            --- OFFICIAL TRIP RECEIPT ---
          </div>
          <h3 className="font-display font-black text-base uppercase tracking-tight text-[var(--receipt-ink)] m-0">
            {merchantName}
          </h3>
          <div className="flex items-center justify-between text-xs opacity-85 font-medium pt-1">
            <span>{receiptNumber}</span>
            <span>{date}</span>
          </div>
        </div>

        {/* Line Items List */}
        <div className="space-y-1.5 py-1">
          <div className="flex justify-between text-xs font-bold uppercase tracking-wider opacity-75 border-b border-dashed border-[var(--receipt-ink)]/20 pb-1">
            <span>Item</span>
            <span>Amount</span>
          </div>

          {items.length === 0 ? (
            <div className="py-6 text-center text-xs opacity-75 italic">
              No individual items listed.
            </div>
          ) : (
            items.map((item, idx) => {
              const isSelected = selectedItemId === (item.id || `item_${idx}`);
              const claimedCount = item.claimedByUserIds?.length || 0;
              const perPersonCents = claimedCount > 0 ? Math.round(item.priceCents / claimedCount) : item.priceCents;

              return (
                <motion.div
                  key={item.id || idx}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    delay: prefersReducedMotion ? 0 : Math.min(idx * itemDelay, maxDelay), 
                    duration: prefersReducedMotion ? 0 : 0.18, 
                    ease: 'easeOut' 
                  }}
                  draggable={interactive && Boolean(onDragStartItem)}
                  onDragStart={(e: any) => onDragStartItem?.(e, idx, item)}
                  onClick={() => interactive && onTapItem?.(idx, item)}
                  className={`p-1.5 rounded transition-all ${
                    interactive ? 'cursor-pointer hover:bg-black/5 active:bg-black/10' : ''
                  } ${isSelected ? 'bg-black/10 ring-1 ring-[var(--receipt-ink)]' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm leading-tight truncate">
                        {(item.quantity || item.qty || 1) > 1 && item.unitPriceCents ? (
                          `${item.quantity || item.qty} x ${item.name} @ ${(item.unitPriceCents / 100).toFixed(2)} = ${(item.priceCents / 100).toFixed(2)}`
                        ) : (
                          item.name
                        )}
                      </div>
                      {claimedCount === 1 ? (
                        <div className="text-xs sm:text-sm opacity-80 font-body">
                          Claimed by {members.find(m => m.user_id === item.claimedByUserIds?.[0])?.name.split(' ')[0] || '1 traveler'}
                        </div>
                      ) : claimedCount > 1 ? (
                        <div className="text-xs sm:text-sm opacity-80 tabular-nums">
                          {cur}{(perPersonCents / 100).toFixed(2)} each ({claimedCount} shares)
                        </div>
                      ) : null}
                    </div>
                    <div className="font-bold tabular-nums shrink-0 text-sm">
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
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold border"
                            title={name}
                          >
                            {initial}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>

        {/* Calculations / Subtotal / Tax / Total */}
        <div className="border-t border-dashed border-[var(--receipt-ink)]/30 pt-2 space-y-1 text-sm">
          <div className="flex justify-between text-sm font-medium opacity-85">
            <span>SUBTOTAL</span>
            <span className="tabular-nums">{cur}{(subtotalCents / 100).toFixed(2)}</span>
          </div>

          {taxCents > 0 && (
            <div className="flex justify-between text-sm font-medium opacity-85">
              <span>TAX</span>
              <span className="tabular-nums">{cur}{(taxCents / 100).toFixed(2)}</span>
            </div>
          )}

          {tipCents > 0 && (
            <div className="flex justify-between text-sm font-medium opacity-85">
              <span>TIP</span>
              <span className="tabular-nums">{cur}{(tipCents / 100).toFixed(2)}</span>
            </div>
          )}

          {roundOffCents !== undefined && roundOffCents !== 0 && (
            <div className="flex justify-between text-sm font-medium opacity-85">
              <span>ROUND-OFF</span>
              <span className="tabular-nums">
                {roundOffCents > 0 ? '+' : '-'}{cur}{(Math.abs(roundOffCents) / 100).toFixed(2)}
              </span>
            </div>
          )}

          <div className="flex justify-between text-base font-black border-t-2 border-[var(--receipt-ink)] pt-1.5 mt-1">
            <span>TOTAL DUE</span>
            <span className="tabular-nums">{cur}{(totalCents / 100).toFixed(2)}</span>
          </div>

          {/* Traveler Allocation Printed on Receipt */}
          {computedSplits.length > 0 && (
            <div className="border-t border-dashed border-[var(--receipt-ink)]/30 pt-2 space-y-1">
              <div className="flex justify-between text-xs sm:text-sm font-bold uppercase tracking-wider opacity-75">
                <span>TRAVELER SHARES</span>
                <span>{splitType}</span>
              </div>
              <div className="space-y-0.5 pt-0.5">
                {computedSplits.map((s, sIdx) => (
                  <motion.div
                    key={s.user_id}
                    animate={
                      animatingSplit && !prefersReducedMotion
                        ? { x: [0, -10, 0], scale: [1, 1.03, 1] }
                        : {}
                    }
                    transition={{
                      delay: prefersReducedMotion ? 0 : sIdx * 0.1,
                      duration: 0.4,
                      ease: 'easeInOut',
                    }}
                    className="flex justify-between text-sm font-mono"
                  >
                    <span className="opacity-80 truncate max-w-[190px]">{s.name}:</span>
                    <span className="font-bold tabular-nums">{cur}{(s.owes_cents / 100).toFixed(2)}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center pt-3 border-t border-[var(--receipt-ink)]/20 space-y-1">
          <div className="text-xs uppercase font-bold tracking-wider opacity-85">
            THANK YOU • SPLIT WITH TRIPSHERIFF
          </div>
          {/* Barcode graphic */}
          <div className="flex justify-center items-center gap-[2px] h-6 py-1 opacity-70">
            {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 4, 1, 2, 3, 1, 4, 2, 1].map((w, i) => (
              <div
                key={i}
                style={{ width: `${w}px` }}
                className="h-full bg-[var(--receipt-ink)]"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Jagged Torn Edge */}
      <div className="w-full h-3 overflow-hidden -mb-2.5">
        <svg
          viewBox="0 0 380 12"
          preserveAspectRatio="none"
          className="w-full h-full fill-[var(--receipt-paper)]"
        >
          <path d="M0,0 L0,8 L10,12 L20,8 L30,12 L40,8 L50,12 L60,8 L70,12 L80,8 L90,12 L100,8 L110,12 L120,8 L130,12 L140,8 L150,12 L160,8 L170,12 L180,8 L190,12 L200,8 L210,12 L220,8 L230,12 L240,8 L250,12 L260,8 L270,12 L280,8 L290,12 L300,8 L310,12 L320,8 L330,12 L340,8 L350,12 L360,8 L370,12 L380,8 L380,0 Z" />
        </svg>
      </div>
    </motion.div>
  );
};

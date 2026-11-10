import React, { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Upload, 
  Users, 
  ListFilter, 
  Check, 
  User, 
  RotateCcw,
  Receipt as ReceiptIcon,
  AlertCircle,
  Plus,
  Trash2,
  Edit3,
  RefreshCw
} from 'lucide-react';
import { aiService } from '../../api/services';
import { Button } from '../ui/Button';
import { getCurrencySymbol } from '../../lib/currency';
import { getMemberTagColor } from '../ui/Avatar';
import { PaperReceipt } from './PaperReceipt';

export interface ExtractedItemDraft {
  name: string;
  qty?: number;
  quantity?: number;
  unitPriceCents?: number;
  priceCents: number;
  claimedByUserIds: string[];
}

interface ReceiptDropModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency?: string;
  members?: Array<{ user_id: string; name: string }>;
  currentUserId?: string;
  onConfirmExpense: (
    description: string, 
    amountCents: number, 
    splitType: 'EQUAL' | 'ITEMIZED',
    items?: ExtractedItemDraft[],
    taxCents?: number,
    tipCents?: number,
    paidByUserId?: string,
    customSplits?: Array<{ user_id: string; owes_cents: number }>
  ) => Promise<void> | void;
}

export const ReceiptDropModal: React.FC<ReceiptDropModalProps> = ({
  isOpen,
  onClose,
  currency = 'INR',
  members = [],
  currentUserId,
  onConfirmExpense,
}) => {
  const activeMembers = members && members.length > 0 ? members : [];
  const allUserIds = activeMembers.map((m) => m.user_id);

  const [isScanning, setIsScanning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parseError, setParseError] = useState<{
    title: string;
    message: string;
    isQuota: boolean;
    rawDetail?: string;
  } | null>(null);
  const [splitMode, setSplitMode] = useState<'EQUAL' | 'ITEMIZED'>('EQUAL');
  const [paidByUserId, setPaidByUserId] = useState<string>(() => {
    return currentUserId || activeMembers[0]?.user_id || '';
  });

  // Reset parsing errors on modal close/open
  useEffect(() => {
    if (!isOpen) {
      setParseError(null);
      setErrorMsg(null);
      setIsScanning(false);
    }
  }, [isOpen]);

  // Keyboard accessibility: dismiss on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Explicit user-typed custom amounts per traveler
  const [customSharesCents, setCustomSharesCents] = useState<Record<string, number>>({});
  const [shareInputStrings, setShareInputStrings] = useState<Record<string, string>>({});
  const [isCustomManual, setIsCustomManual] = useState<boolean>(false);

  // Editable bill total & line item prices
  const [totalInputString, setTotalInputString] = useState<string | null>(null);
  const [itemPriceInputs, setItemPriceInputs] = useState<Record<number, string>>({});

  const [extractedReceipt, setExtractedReceipt] = useState<null | {
    merchant: string;
    currency: string;
    currencySymbol: string;
    totalCents: number;
    taxCents: number;
    tipCents: number;
    roundOffCents: number;
    fallbackPriceUsed?: boolean;
    items: ExtractedItemDraft[];
  }>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Compute shares based on item claims or equal distribution
  const computeItemizedShares = (): Record<string, number> => {
    if (!extractedReceipt) return {};
    const shares: Record<string, number> = {};
    activeMembers.forEach((m) => { shares[m.user_id] = 0; });
    const count = Math.max(1, activeMembers.length);

    // If receipt has line items, compute from item claims
    if (extractedReceipt.items && extractedReceipt.items.length > 0) {
      let itemsSubtotal = 0;
      const claimedDirectShares: Record<string, number> = {};
      activeMembers.forEach((m) => { claimedDirectShares[m.user_id] = 0; });

      extractedReceipt.items.forEach((item) => {
        itemsSubtotal += item.priceCents;
        // If nobody claimed it, item is communal (split among all active members)
        const claimants = item.claimedByUserIds && item.claimedByUserIds.length > 0 
          ? item.claimedByUserIds 
          : allUserIds;
        const claimCount = Math.max(1, claimants.length);
        const baseShare = Math.floor(item.priceCents / claimCount);
        const rem = item.priceCents % claimCount;
        claimants.forEach((uid, i) => {
          const itemShare = baseShare + (i < rem ? 1 : 0);
          claimedDirectShares[uid] = (claimedDirectShares[uid] || 0) + itemShare;
        });
      });

      const taxCents = extractedReceipt.taxCents || 0;
      const tipCents = extractedReceipt.tipCents || 0;

      // Determine round-off: if not set or if gap is <= 100 cents, treat gap as round-off
      const rawGap = extractedReceipt.totalCents - (itemsSubtotal + taxCents + tipCents);
      let roundOff = extractedReceipt.roundOffCents || 0;
      if (roundOff === 0 && Math.abs(rawGap) > 0 && Math.abs(rawGap) <= 100) {
        roundOff = rawGap;
      }

      // Communal adjustments to allocate proportionally (tax + tip + round-off)
      const communalAdjustments = taxCents + tipCents + roundOff;

      // Provisional shares = claimedDirectShares + proportional communal adjustments
      const provisionalShares: Record<string, number> = {};
      if (itemsSubtotal > 0 && communalAdjustments !== 0) {
        let distributedAdjustments = 0;
        activeMembers.forEach((m, idx) => {
          if (idx === activeMembers.length - 1) {
            const extra = communalAdjustments - distributedAdjustments;
            provisionalShares[m.user_id] = (claimedDirectShares[m.user_id] || 0) + extra;
          } else {
            const userSubtotal = claimedDirectShares[m.user_id] || 0;
            const extra = Math.round((userSubtotal * communalAdjustments) / itemsSubtotal);
            provisionalShares[m.user_id] = userSubtotal + extra;
            distributedAdjustments += extra;
          }
        });
      } else {
        activeMembers.forEach((m) => {
          provisionalShares[m.user_id] = claimedDirectShares[m.user_id] || 0;
        });
      }

      const totalAllocated = itemsSubtotal + communalAdjustments;
      const diffToBillTotal = extractedReceipt.totalCents - totalAllocated;

      if (diffToBillTotal === 0) {
        // Perfect match
        return provisionalShares;
      } else if (diffToBillTotal > 0) {
        // Items + tax + tip are LESS than total (unmatched amount remaining)
        // Divide remaining unmatched communal amount equally so no individual share is skewed
        const baseDiff = Math.floor(diffToBillTotal / count);
        const remDiff = diffToBillTotal % count;
        activeMembers.forEach((m, idx) => {
          shares[m.user_id] = (provisionalShares[m.user_id] || 0) + baseDiff + (idx < remDiff ? 1 : 0);
        });
        return shares;
      } else {
        // Items + tax + tip are GREATER than total (e.g. discounts, coupons, overage)
        // Scale proportionally without allowing any negative share
        const provSum = Object.values(provisionalShares).reduce((acc, v) => acc + v, 0);
        if (provSum > 0 && extractedReceipt.totalCents > 0) {
          let scaledSum = 0;
          activeMembers.forEach((m) => {
            const scaled = Math.floor(((provisionalShares[m.user_id] || 0) * extractedReceipt.totalCents) / provSum);
            shares[m.user_id] = Math.max(0, scaled);
            scaledSum += shares[m.user_id];
          });
          const remScale = extractedReceipt.totalCents - scaledSum;
          // Distribute remainder cent-by-cent to members with highest provisional share
          const sortedMembers = [...activeMembers].sort((a, b) => (provisionalShares[b.user_id] || 0) - (provisionalShares[a.user_id] || 0));
          for (let i = 0; i < remScale; i++) {
            const memberId = sortedMembers[i % sortedMembers.length].user_id;
            shares[memberId] += 1;
          }
          return shares;
        } else {
          // If total is 0 or provSum is 0
          const base = Math.floor(extractedReceipt.totalCents / count);
          const rem = extractedReceipt.totalCents % count;
          activeMembers.forEach((m, idx) => {
            shares[m.user_id] = Math.max(0, base + (idx < rem ? 1 : 0));
          });
          return shares;
        }
      }
    }

    // Default even split if no items
    const base = Math.floor(extractedReceipt.totalCents / count);
    const rem = extractedReceipt.totalCents % count;
    activeMembers.forEach((m, idx) => {
      shares[m.user_id] = Math.max(0, base + (idx < rem ? 1 : 0));
    });

    return shares;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setErrorMsg(null);
    setIsCustomManual(false);
    setCustomSharesCents({});
    setShareInputStrings({});
    setTotalInputString(null);
    setItemPriceInputs({});
    try {
      const res = await aiService.uploadReceipt(file, currency);
      const symbol = res.currency_symbol || getCurrencySymbol(currency);
      
      const taxCents = res.tax_cents || 0;
      const tipCents = res.tip_cents || 0;
      const itemsList = res.items || [];
      let usedOldFallbackPrice = false;

      const mappedItems: ExtractedItemDraft[] = itemsList.map((item) => {
        let lineTotal: number;
        let unitPrice: number | undefined = item.unit_price_cents;
        const qty = item.quantity ?? item.qty ?? 1;

        if (item.line_total_cents !== undefined && item.line_total_cents !== null && item.line_total_cents > 0) {
          lineTotal = item.line_total_cents;
        } else if (item.price_cents !== undefined && item.price_cents !== null && item.price_cents > 0) {
          lineTotal = item.price_cents;
          if (item.line_total_cents === undefined || item.line_total_cents === null) {
            usedOldFallbackPrice = true;
          }
        } else {
          lineTotal = 0;
        }

        if (unitPrice === undefined && qty > 1 && lineTotal > 0) {
          unitPrice = Math.round(lineTotal / qty);
        } else if (unitPrice === undefined) {
          unitPrice = lineTotal;
        }

        return {
          name: item.name,
          qty,
          quantity: qty,
          unitPriceCents: unitPrice,
          priceCents: lineTotal,
          claimedByUserIds: [...allUserIds],
        };
      });

      const itemsSum = mappedItems.reduce((acc, it) => acc + (it.priceCents || 0), 0);
      let totalCents = res.total_cents;
      if (!totalCents || totalCents <= 0) {
        if (mappedItems.length > 0) {
          totalCents = itemsSum + taxCents + tipCents;
        }
      }

      if (!totalCents || totalCents <= 0) {
        setParseError({
          title: 'Bill Total Not Detected',
          message: 'Could not detect a legible total from this photo. You can enter the amount and items manually or try scanning with a clearer photo.',
          isQuota: false,
          rawDetail: 'No valid currency amount was detected in the receipt header or totals.',
        });
        setErrorMsg('Could not detect bill total. Please re-scan or enter manually.');
        setExtractedReceipt(null);
        return;
      }

      let roundOffCents = res.round_off_cents || 0;
      const rawGap = totalCents - (itemsSum + taxCents + tipCents);
      if (roundOffCents === 0 && Math.abs(rawGap) > 0 && Math.abs(rawGap) <= 100) {
        roundOffCents = rawGap;
      }

      const parsed = {
        merchant: res.merchant || 'Scanned Bill',
        currency: res.currency || currency,
        currencySymbol: symbol,
        totalCents: totalCents,
        taxCents: taxCents,
        tipCents: tipCents,
        roundOffCents: roundOffCents,
        fallbackPriceUsed: usedOldFallbackPrice,
        items: mappedItems,
      };

      setExtractedReceipt(parsed);
      setTotalInputString((parsed.totalCents / 100).toFixed(2));

      // Prepopulate default shares
      const initialShares: Record<string, number> = {};
      const initialStrings: Record<string, string> = {};
      const base = Math.floor(parsed.totalCents / Math.max(1, activeMembers.length));
      const rem = parsed.totalCents % Math.max(1, activeMembers.length);
      activeMembers.forEach((m, i) => {
        const cents = base + (i < rem ? 1 : 0);
        initialShares[m.user_id] = cents;
        initialStrings[m.user_id] = (cents / 100).toFixed(2);
      });
      setCustomSharesCents(initialShares);
      setShareInputStrings(initialStrings);

      if (!paidByUserId && activeMembers.length > 0) {
        setPaidByUserId(currentUserId || activeMembers[0].user_id);
      }
    } catch (err: any) {
      console.error('Receipt parse failed:', err);
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail || err?.response?.data?.message || err?.message || '';

      const isQuota = status === 429 || /429|resource_exhausted|quota|rate limit/i.test(String(detail));
      const isUnavailable = status === 503 || /503|unavailable|busy|high demand/i.test(String(detail));

      let title = "The bill couldn't be parsed right now";
      let message = "We couldn't extract items from this image right now. You can try scanning again or enter your bill details manually.";

      if (isQuota) {
        title = "AI Vision Quota Reached";
        message = "The daily AI vision processing quota has been reached. You can enter your bill details manually to split right now, or try scanning again later.";
      } else if (isUnavailable) {
        title = "AI Service Temporarily Busy";
        message = "The AI vision model is currently experiencing high demand. You can enter your bill details manually or try scanning again in a moment.";
      } else if (err?.code === 'ERR_NETWORK' || !err?.response) {
        title = "Vision Service Offline";
        message = "Could not connect to the AI vision service. You can enter your bill details manually to continue splitting with your party.";
      }

      setParseError({
        title,
        message,
        isQuota,
        rawDetail: typeof detail === 'string' ? detail : JSON.stringify(detail),
      });
      setErrorMsg(message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleEnterManually = () => {
    setParseError(null);
    setErrorMsg(null);
    setIsCustomManual(true);
    setShareInputStrings({});
    setTotalInputString('');
    setItemPriceInputs({});

    const initialShares: Record<string, number> = {};
    activeMembers.forEach((m) => {
      initialShares[m.user_id] = 0;
    });
    setCustomSharesCents(initialShares);

    const manualBill = {
      merchant: 'Manual Expense',
      currency: currency,
      currencySymbol: getCurrencySymbol(currency),
      totalCents: 0,
      taxCents: 0,
      tipCents: 0,
      roundOffCents: 0,
      fallbackPriceUsed: false,
      items: [],
    };

    setExtractedReceipt(manualBill);

    if (!paidByUserId && activeMembers.length > 0) {
      setPaidByUserId(currentUserId || activeMembers[0].user_id);
    }
  };

  const handleRetryScan = () => {
    setParseError(null);
    setErrorMsg(null);
    setExtractedReceipt(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Toggle a member in or out of an item split
  const toggleItemMember = (itemIdx: number, userId: string) => {
    if (!extractedReceipt) return;
    setIsCustomManual(false); // item claim drives the split
    setShareInputStrings({});
    setExtractedReceipt((prev) => {
      if (!prev) return prev;
      const nextItems = [...prev.items];
      const currentClaimed = nextItems[itemIdx].claimedByUserIds;
      const alreadyClaimed = currentClaimed.includes(userId);

      let updatedClaimed: string[];
      if (alreadyClaimed) {
        updatedClaimed = currentClaimed.filter((id) => id !== userId);
        if (updatedClaimed.length === 0) {
          updatedClaimed = [userId]; // maintain at least one claimant
        }
      } else {
        updatedClaimed = [...currentClaimed, userId];
      }

      nextItems[itemIdx] = {
        ...nextItems[itemIdx],
        claimedByUserIds: updatedClaimed,
      };

      return { ...prev, items: nextItems };
    });
  };

  // Split all items with everyone
  const splitAllWithEveryone = () => {
    if (!extractedReceipt) return;
    setIsCustomManual(false);
    setShareInputStrings({});
    setExtractedReceipt((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((it) => ({
          ...it,
          claimedByUserIds: [...allUserIds],
        })),
      };
    });
  };

  // Line item and bill total editing handlers
  const handleBillTotalChange = (val: string) => {
    setTotalInputString(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      const cents = Math.round(num * 100);
      setExtractedReceipt((prev) => (prev ? { ...prev, totalCents: cents } : null));
    }
  };

  const handleBillTotalBlur = () => {
    if (extractedReceipt) {
      setTotalInputString((extractedReceipt.totalCents / 100).toFixed(2));
    }
  };

  const handleUpdateItemName = (idx: number, newName: string) => {
    setExtractedReceipt((prev) => {
      if (!prev) return prev;
      const nextItems = [...prev.items];
      nextItems[idx] = { ...nextItems[idx], name: newName };
      return { ...prev, items: nextItems };
    });
  };

  const handleUpdateItemPrice = (idx: number, val: string) => {
    setItemPriceInputs((prev) => ({ ...prev, [idx]: val }));
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      const cents = Math.round(num * 100);
      setExtractedReceipt((prev) => {
        if (!prev) return prev;
        const nextItems = [...prev.items];
        nextItems[idx] = { ...nextItems[idx], priceCents: cents };
        return { ...prev, items: nextItems };
      });
    }
  };

  const handleItemPriceBlur = (idx: number) => {
    if (extractedReceipt && extractedReceipt.items[idx]) {
      setItemPriceInputs((prev) => ({
        ...prev,
        [idx]: (extractedReceipt.items[idx].priceCents / 100).toFixed(2),
      }));
    }
  };

  const handleDeleteItem = (idx: number) => {
    setExtractedReceipt((prev) => {
      if (!prev) return prev;
      const nextItems = prev.items.filter((_, i) => i !== idx);
      return { ...prev, items: nextItems };
    });
    setItemPriceInputs((prev) => {
      const copy = { ...prev };
      delete copy[idx];
      return copy;
    });
  };

  const handleAddNewItem = () => {
    setExtractedReceipt((prev) => {
      if (!prev) return prev;
      const newItem: ExtractedItemDraft = {
        name: `Item #${prev.items.length + 1}`,
        priceCents: 0,
        claimedByUserIds: [...allUserIds],
      };
      return { ...prev, items: [...prev.items, newItem] };
    });
  };

  // Mismatch calculations
  const itemsSubtotalCents = extractedReceipt?.items.reduce((sum, it) => sum + (it.priceCents || 0), 0) || 0;
  const itemsPlusTaxTipCents = itemsSubtotalCents + (extractedReceipt?.taxCents || 0) + (extractedReceipt?.tipCents || 0);
  const mismatchCents = extractedReceipt ? extractedReceipt.totalCents - itemsPlusTaxTipCents : 0;
  const mismatchThreshold = extractedReceipt ? Math.min(100, Math.round(extractedReceipt.totalCents * 0.01)) : 100;
  const hasMismatchNotice = Boolean(
    extractedReceipt && (
      extractedReceipt.fallbackPriceUsed ||
      (extractedReceipt.totalCents > 0 && Math.abs(mismatchCents) > mismatchThreshold)
    )
  );

  // Active shares computation
  const activeShares = useMemo(() => {
    if (splitMode === 'EQUAL') {
      const shares: Record<string, number> = {};
      const count = Math.max(1, activeMembers.length);
      const base = extractedReceipt ? Math.floor(extractedReceipt.totalCents / count) : 0;
      const rem = extractedReceipt ? extractedReceipt.totalCents % count : 0;
      activeMembers.forEach((m, idx) => {
        shares[m.user_id] = base + (idx < rem ? 1 : 0);
      });
      return shares;
    }

    if (isCustomManual) {
      return customSharesCents;
    }

    return computeItemizedShares();
  }, [splitMode, isCustomManual, customSharesCents, extractedReceipt, activeMembers]);

  // Handle manual typed share edits
  const handleCustomShareInputChange = (userId: string, valueStr: string) => {
    setIsCustomManual(true);
    setShareInputStrings((prev) => ({
      ...prev,
      [userId]: valueStr,
    }));

    const parsedNum = parseFloat(valueStr);
    if (!isNaN(parsedNum) && parsedNum >= 0) {
      const newCents = Math.round(parsedNum * 100);
      setCustomSharesCents((prev) => {
        const updated = { ...prev, [userId]: newCents };
        // Ensure other members have defaults if missing
        activeMembers.forEach((m) => {
          if (updated[m.user_id] === undefined) {
            updated[m.user_id] = activeShares[m.user_id] || 0;
          }
        });
        return updated;
      });
    }
  };

  const handleCustomShareInputBlur = (userId: string) => {
    setCustomSharesCents((prevCents) => {
      const cents = prevCents[userId] ?? (activeShares[userId] || 0);
      setShareInputStrings((prev) => ({
        ...prev,
        [userId]: (cents / 100).toFixed(2),
      }));
      return prevCents;
    });
  };

  const handleAutoBalanceRemainder = () => {
    if (!extractedReceipt) return;
    setIsCustomManual(true);
    const total = extractedReceipt.totalCents;
    
    setCustomSharesCents((prev) => {
      const currentShares = { ...prev };
      activeMembers.forEach((m) => {
        if (currentShares[m.user_id] === undefined) {
          currentShares[m.user_id] = activeShares[m.user_id] || 0;
        }
      });

      const currentSum = Object.values(currentShares).reduce((acc, v) => acc + v, 0);
      const diff = total - currentSum;
      if (diff === 0) return currentShares;

      // Find member with highest share to absorb difference cleanly
      let targetUserId = activeMembers[0]?.user_id;
      let maxVal = -1;
      activeMembers.forEach((m) => {
        if ((currentShares[m.user_id] || 0) > maxVal) {
          maxVal = currentShares[m.user_id] || 0;
          targetUserId = m.user_id;
        }
      });

      if (targetUserId) {
        currentShares[targetUserId] = Math.max(0, (currentShares[targetUserId] || 0) + diff);
      }

      // Sync string inputs
      const newStrings: Record<string, string> = {};
      activeMembers.forEach((m) => {
        newStrings[m.user_id] = ((currentShares[m.user_id] || 0) / 100).toFixed(2);
      });
      setShareInputStrings(newStrings);

      return currentShares;
    });
  };

  const handleResetCustomToEqual = () => {
    if (!extractedReceipt) return;
    setIsCustomManual(false);
    const count = Math.max(1, activeMembers.length);
    const base = Math.floor(extractedReceipt.totalCents / count);
    const rem = extractedReceipt.totalCents % count;

    const resetShares: Record<string, number> = {};
    const resetStrings: Record<string, string> = {};
    activeMembers.forEach((m, idx) => {
      const cents = base + (idx < rem ? 1 : 0);
      resetShares[m.user_id] = cents;
      resetStrings[m.user_id] = (cents / 100).toFixed(2);
    });

    setCustomSharesCents(resetShares);
    setShareInputStrings(resetStrings);
  };

  const handleZeroOutTraveler = (userId: string) => {
    setIsCustomManual(true);
    setCustomSharesCents((prev) => ({
      ...prev,
      [userId]: 0,
    }));
    setShareInputStrings((prev) => ({
      ...prev,
      [userId]: '0.00',
    }));
  };

  const handleAssignRemainderToTraveler = (userId: string) => {
    if (!extractedReceipt) return;
    setIsCustomManual(true);
    const total = extractedReceipt.totalCents;
    
    setCustomSharesCents((prev) => {
      const current = { ...prev };
      activeMembers.forEach((m) => {
        if (current[m.user_id] === undefined) {
          current[m.user_id] = activeShares[m.user_id] || 0;
        }
      });
      let sumOther = 0;
      activeMembers.forEach((m) => {
        if (m.user_id !== userId) {
          sumOther += current[m.user_id] || 0;
        }
      });
      const remainder = Math.max(0, total - sumOther);
      current[userId] = remainder;

      const newStrings: Record<string, string> = {};
      activeMembers.forEach((m) => {
        newStrings[m.user_id] = ((current[m.user_id] || 0) / 100).toFixed(2);
      });
      setShareInputStrings(newStrings);

      return current;
    });
  };

  // Discrepancy calculations for manual custom mode
  const totalAllocatedCents = useMemo(() => {
    return activeMembers.reduce((sum, m) => sum + (activeShares[m.user_id] || 0), 0);
  }, [activeMembers, activeShares]);

  const discrepancyCents = useMemo(() => {
    if (!extractedReceipt) return 0;
    return extractedReceipt.totalCents - totalAllocatedCents;
  }, [extractedReceipt, totalAllocatedCents]);

  const handleConfirm = async () => {
    if (!extractedReceipt) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const formattedCustomSplits = activeMembers.map((m) => ({
        user_id: m.user_id,
        owes_cents: activeShares[m.user_id] || 0,
      }));

      await onConfirmExpense(
        extractedReceipt.merchant,
        extractedReceipt.totalCents,
        splitMode === 'EQUAL' ? 'EQUAL' : 'ITEMIZED',
        extractedReceipt.items,
        extractedReceipt.taxCents,
        extractedReceipt.tipCents,
        paidByUserId,
        formattedCustomSplits
      );

      // On success: clear state and close
      setExtractedReceipt(null);
      setErrorMsg(null);
      setCustomSharesCents({});
      setShareInputStrings({});
      setItemPriceInputs({});
      setTotalInputString(null);
      setIsCustomManual(false);
      onClose();
    } catch (err: any) {
      // On failure: KEEP the modal open with all claims and typed amounts intact!
      console.error('Failed to commit expense:', err);
      const message = err?.message || 'Failed to split and save bill. Please check values and try again.';
      setErrorMsg(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isConfirmDisabled = isSubmitting || !extractedReceipt || extractedReceipt.totalCents <= 0 || (splitMode === 'ITEMIZED' && isCustomManual && discrepancyCents !== 0);

  if (!isOpen) return null;

  const memberCount = Math.max(1, activeMembers.length);
  const curSymbol = extractedReceipt?.currencySymbol || getCurrencySymbol(currency);
  const perPersonEqualCents = extractedReceipt 
    ? Math.round(extractedReceipt.totalCents / memberCount) 
    : 0;

  return (
    <AnimatePresence>
      <div 
        data-modal-open="true"
        data-lenis-prevent="true"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 overflow-hidden select-none"
      >
        <motion.div
          data-modal-open="true"
          data-lenis-prevent="true"
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xl overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between p-4 sm:p-5 border-b border-[var(--border)] bg-[var(--surface-elevated)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--canvas)] border border-[var(--border)] flex items-center justify-center">
                <ReceiptIcon className="w-4 h-4 text-[var(--text)]" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-display font-bold text-[var(--text)] m-0">
                  {extractedReceipt ? 'Review & Split Scanned Bill' : 'Upload Receipt'}
                </h3>
                <p className="text-xs text-[var(--muted)] font-mono m-0 mt-0.5">
                  {extractedReceipt 
                    ? `${activeMembers.length} party members • Custom split configuration` 
                    : 'Auto-scan paper bills, extract line items, and assign shares'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Body: strict scroll containment with no leaking to window */}
          <div 
            data-lenis-prevent="true"
            onWheel={(e) => e.stopPropagation()}
            className="p-4 sm:p-6 flex-1 min-h-0 overflow-y-auto overscroll-contain"
            style={{ overscrollBehavior: 'contain' }}
          >
            {errorMsg && !parseError && (
              <div className="flex items-center gap-2 text-xs font-mono text-[var(--owes)] bg-[var(--owes)]/10 px-3.5 py-2.5 rounded-xl border border-[var(--owes)]/20 mb-4">
                <AlertCircle className="w-4 h-4 shrink-0 text-[var(--owes)]" />
                <span>{errorMsg}</span>
              </div>
            )}
            {parseError && !extractedReceipt ? (
              /* State: Dedicated Bill Parse Failure / Quota Screen */
              <div className="rounded-2xl border border-[var(--owes)]/30 bg-[var(--canvas)] p-6 sm:p-10 text-center space-y-6">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--owes)]/10 border border-[var(--owes)]/30 flex items-center justify-center">
                  <AlertCircle className="w-7 h-7 text-[var(--owes)]" />
                </div>

                <div className="space-y-2 max-w-lg mx-auto">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--owes)]/10 border border-[var(--owes)]/30 text-xs font-mono font-semibold text-[var(--owes)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--owes)] animate-pulse" />
                    <span>{parseError.isQuota ? 'AI QUOTA REACHED' : 'PARSING UNAVAILABLE'}</span>
                  </div>

                  <h4 className="text-lg sm:text-xl font-display font-bold text-[var(--text)] m-0">
                    {parseError.title}
                  </h4>

                  <p className="text-xs sm:text-sm text-[var(--muted)] font-body leading-relaxed m-0">
                    {parseError.message}
                  </p>

                  {parseError.rawDetail && (
                    <div className="pt-2 text-xs font-mono text-[var(--muted)] bg-[var(--surface)] p-2.5 rounded-lg border border-[var(--border)] max-w-md mx-auto truncate text-left">
                      <span className="text-[var(--text)] font-semibold">Service note:</span> {parseError.rawDetail}
                    </div>
                  )}
                </div>

                {/* Actions: Exactly ONE Primary Button */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleEnterManually}
                    icon={<Edit3 className="w-4 h-4" />}
                    className="w-full sm:w-auto px-5"
                  >
                    Enter Bill Manually
                  </Button>

                  <Button
                    variant="secondary"
                    size="md"
                    onClick={handleRetryScan}
                    icon={<RefreshCw className="w-4 h-4" />}
                    className="w-full sm:w-auto px-5"
                  >
                    Try Scanning Again
                  </Button>

                  <Button
                    variant="ghost"
                    size="md"
                    onClick={() => {
                      setParseError(null);
                      setErrorMsg(null);
                      onClose();
                    }}
                    className="w-full sm:w-auto px-4"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : !extractedReceipt ? (
              /* State 1: Dropzone & Scan State */
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file && fileInputRef.current) {
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(file);
                    fileInputRef.current.files = dataTransfer.files;
                    handleFileUpload({ target: fileInputRef.current } as any);
                  }
                }}
                onClick={() => !isScanning && fileInputRef.current?.click()}
                className={`relative rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-all overflow-hidden ${
                  dragOver
                    ? 'border-white/50 bg-[var(--surface-elevated)]'
                    : 'border-[var(--border)] hover:border-white/25 bg-[var(--canvas)] cursor-pointer'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isScanning}
                />

                {isScanning ? (
                  /* Optical Scan Animation with Moving Laser Bar */
                  <div className="py-6 flex flex-col items-center justify-center space-y-6">
                    <div className="relative w-48 sm:w-56 p-4 rounded-xl bg-[var(--receipt-paper)] text-[var(--receipt-ink)] font-mono text-xs shadow-2xl overflow-hidden select-none">
                      {/* Scanning Laser Beam (respects prefers-reduced-motion) */}
                      <motion.div
                        className="absolute left-0 right-0 h-[2px] bg-[var(--settled)] shadow-[0_0_8px_var(--settled)]"
                        animate={prefersReducedMotion ? { top: '50%' } : { top: ['0%', '100%', '0%'] }}
                        transition={prefersReducedMotion ? { duration: 0 } : { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                      />

                      <div className="text-center font-bold tracking-widest uppercase border-b border-[var(--receipt-ink)]/20 pb-1 mb-2 opacity-75">
                        SCANNING TICKET
                      </div>
                      <div className="space-y-1 opacity-80 text-left">
                        <div className="flex justify-between py-0.5">
                          <span>Item 01</span>
                          <span>240.00</span>
                        </div>
                        <div className="flex justify-between py-0.5">
                          <span>Item 02</span>
                          <span>490.00</span>
                        </div>
                        <div className="flex justify-between py-0.5">
                          <span>GST Tax</span>
                          <span>120.00</span>
                        </div>
                        <div className="border-t border-[var(--receipt-ink)] pt-1 flex justify-between font-bold">
                          <span>TOTAL</span>
                          <span>850.00</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-center">
                      <div className="text-sm font-display font-bold text-[var(--text)]">
                        Analyzing Bill & Extracting Items...
                      </div>
                      <p className="text-xs text-[var(--muted)] font-mono max-w-sm mx-auto m-0">
                        Scanning merchant header, line items, and totals in {currency}.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Tactile Upload Brief */
                  <div className="flex flex-col items-center justify-center space-y-3 py-4">
                    <div className="w-12 h-12 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] flex items-center justify-center">
                      <Upload className="w-5 h-5 text-[var(--text)]" />
                    </div>

                    <div className="space-y-1">
                      <div className="text-sm font-display font-semibold text-[var(--text)]">
                        Drop receipt image here or click to browse
                      </div>
                      <p className="text-xs text-[var(--muted)] font-body max-w-sm mx-auto m-0">
                        Supports PNG, JPG, or PDF captures of dining, lodging, or travel expenses.
                      </p>
                    </div>

                    <div className="text-xs font-mono text-[var(--muted)] pt-2">
                      Target Currency: <span className="text-[var(--text)] font-semibold">{currency}</span>
                    </div>

                    {errorMsg && (
                      <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--owes)] bg-[var(--owes)]/10 px-3 py-1.5 rounded-lg border border-[var(--owes)]/20 mt-3">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{errorMsg}</span>
                      </div>
                    )}

                    <div className="pt-3 border-t border-[var(--border)] w-full flex items-center justify-center gap-2 text-xs font-mono text-[var(--muted)]">
                      <span>Prefer not to scan a photo?</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEnterManually();
                        }}
                        className="text-[var(--text)] font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Enter Bill Manually</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* State 2: Parsed Receipt Review & Asymmetric Split Cockpit */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left: The Signature Physical Paper Receipt (live real-time update) */}
                <div className="lg:col-span-5 flex justify-center py-1">
                  <PaperReceipt
                    merchantName={extractedReceipt.merchant}
                    receiptNumber="#SCAN-LIVE"
                    date={new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    currency={extractedReceipt.currency}
                    items={extractedReceipt.items}
                    taxCents={extractedReceipt.taxCents}
                    tipCents={extractedReceipt.tipCents}
                    roundOffCents={extractedReceipt.roundOffCents || (Math.abs(mismatchCents) <= 100 ? mismatchCents : 0)}
                    totalCents={extractedReceipt.totalCents}
                    members={activeMembers}
                    memberSplits={activeMembers.map((m) => ({
                      user_id: m.user_id,
                      name: m.name,
                      owes_cents: splitMode === 'EQUAL' 
                        ? perPersonEqualCents 
                        : (activeShares[m.user_id] || 0),
                    }))}
                    splitType={splitMode === 'EQUAL' ? 'EQUAL' : 'CUSTOM'}
                    rotateDeg={-0.6}
                    interactive={false}
                  />
                </div>

                {/* Right: Bill Settlement & Traveler Assignment Cockpit */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Notice: Significant Mismatch Banner (when items + tax + tip differ by >1% from total) */}
                  {hasMismatchNotice && (
                    <div className="p-3.5 rounded-xl bg-[var(--owes)]/10 border border-[var(--owes)]/30 text-xs font-mono text-[var(--owes)] flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[var(--owes)]" />
                      <div className="space-y-1">
                        <div className="font-semibold leading-relaxed">
                          Items and tax add up to {curSymbol}{(itemsPlusTaxTipCents / 100).toFixed(2)}, but the bill total is {curSymbol}{(extractedReceipt.totalCents / 100).toFixed(2)}. {curSymbol}{(Math.abs(mismatchCents) / 100).toFixed(2)} is not matched to any item.
                        </div>
                        <div className="text-xs text-[var(--muted)]">
                          You can edit the bill total or individual line items below to reconcile before confirming.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bill Overview & Editable Total Header */}
                  <div className="p-3.5 rounded-xl bg-[var(--canvas)] border border-[var(--border)] flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-mono text-[var(--muted)] uppercase tracking-wider font-semibold">
                        MERCHANT & BILL TOTAL
                      </div>
                      <input
                        type="text"
                        value={extractedReceipt.merchant}
                        onChange={(e) => setExtractedReceipt((prev) => (prev ? { ...prev, merchant: e.target.value } : null))}
                        placeholder="e.g. Restaurant, Hotel, Cab"
                        aria-label="Merchant or bill title"
                        className="text-sm font-display font-bold text-[var(--text)] bg-transparent border-b border-transparent hover:border-[var(--border)] focus:border-white/40 focus:outline-none transition-colors w-full sm:w-auto mt-0.5"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-[var(--muted)]">Total:</span>
                      <div className="flex items-center gap-1 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg px-2.5 py-1">
                        <span className="text-xs font-mono font-bold text-[var(--text)]">{curSymbol}</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={totalInputString ?? (extractedReceipt.totalCents / 100).toFixed(2)}
                          onChange={(e) => handleBillTotalChange(e.target.value)}
                          onBlur={handleBillTotalBlur}
                          aria-label="Edit bill total"
                          className="w-24 bg-transparent text-xs font-mono font-bold text-[var(--text)] text-right focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Who Paid Section */}
                  <div className="p-4 rounded-xl bg-[var(--canvas)] border border-[var(--border)] space-y-2">
                    <div className="text-xs font-mono text-[var(--muted)] uppercase tracking-wider font-semibold flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[var(--text)]" />
                      <span>Who Paid The Bill?</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {activeMembers.map((m) => {
                        const isSelected = paidByUserId === m.user_id;
                        const isSelf = m.user_id === currentUserId;
                        const tag = getMemberTagColor(m.user_id);
                        return (
                          <button
                            key={m.user_id}
                            type="button"
                            onClick={() => setPaidByUserId(m.user_id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer ${
                              isSelected
                                ? 'bg-[var(--surface-elevated)] border border-white/30 text-[var(--text)] font-semibold shadow-sm'
                                : 'bg-[var(--canvas)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
                            }`}
                          >
                            <span
                              style={{
                                backgroundColor: tag.bg,
                                color: tag.text,
                                borderColor: tag.border,
                              }}
                              className="w-5 h-5 rounded-md text-xs font-bold border flex items-center justify-center shrink-0"
                            >
                              {m.name.slice(0, 2).toUpperCase()}
                            </span>
                            <span className="truncate max-w-[120px]">{m.name}</span>
                            {isSelf && <span className="text-xs text-[var(--muted)] font-normal">(You)</span>}
                            {isSelected && <Check className="w-3 h-3 text-[var(--text)] shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Split Method Toggle */}
                  <div className="space-y-1.5">
                    <div className="text-xs font-mono text-[var(--muted)] uppercase tracking-wider font-semibold">
                      Split Method
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSplitMode('EQUAL');
                          setIsCustomManual(false);
                          setShareInputStrings({});
                        }}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-mono font-medium transition-colors cursor-pointer ${
                          splitMode === 'EQUAL'
                            ? 'bg-[var(--surface-elevated)] border-white/30 text-[var(--text)] shadow-sm'
                            : 'bg-[var(--canvas)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
                        }`}
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Split Equally ({activeMembers.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSplitMode('ITEMIZED');
                          if (Object.keys(shareInputStrings).length === 0) {
                            const newStrings: Record<string, string> = {};
                            activeMembers.forEach((m) => {
                              newStrings[m.user_id] = ((activeShares[m.user_id] || perPersonEqualCents) / 100).toFixed(2);
                            });
                            setShareInputStrings(newStrings);
                          }
                        }}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-mono font-medium transition-colors cursor-pointer ${
                          splitMode === 'ITEMIZED'
                            ? 'bg-[var(--surface-elevated)] border-white/30 text-[var(--text)] shadow-sm'
                            : 'bg-[var(--canvas)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
                        }`}
                      >
                        <ListFilter className="w-3.5 h-3.5" />
                        <span>Custom Split</span>
                      </button>
                    </div>
                  </div>

                  {/* Mode Content */}
                  {splitMode === 'EQUAL' ? (
                    /* Equal Split Breakdown */
                    <div className="p-4 rounded-xl bg-[var(--canvas)] border border-[var(--border)] space-y-3">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-[var(--muted)]">EACH PERSON OWES</span>
                        <span className="text-base font-bold text-[var(--text)] tabular-nums">
                          {curSymbol}{(perPersonEqualCents / 100).toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--muted)] font-body m-0">
                        Total {curSymbol}{(extractedReceipt.totalCents / 100).toFixed(2)} is split equally across all {activeMembers.length} active travelers.
                      </p>
                    </div>
                  ) : (
                    /* Custom Split & Line Items Configuration */
                    <div className="space-y-4">
                      {/* Manual Custom Traveler Shares Box */}
                      <div className="p-3.5 sm:p-4 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border)] space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-[var(--text)] font-semibold uppercase tracking-wider">
                              Per-Traveler Share
                            </span>
                            <span className="text-xs text-[var(--muted)]">
                              (Type exact amounts below)
                            </span>
                          </div>
                          <div className="text-xs font-bold text-[var(--text)] tabular-nums font-mono">
                            {curSymbol}{(extractedReceipt.totalCents / 100).toFixed(2)} Total
                          </div>
                        </div>

                        {/* Interactive Traveler Shares Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {activeMembers.map((m) => {
                            const tag = getMemberTagColor(m.user_id);
                            const userShareCents = activeShares[m.user_id] || 0;
                            const inputVal = shareInputStrings[m.user_id] ?? ((userShareCents / 100).toFixed(2));

                            return (
                              <div
                                key={m.user_id}
                                className="flex items-center justify-between p-2 rounded-xl bg-[var(--canvas)] border border-[var(--border)] gap-2"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    style={{
                                      backgroundColor: tag.bg,
                                      color: tag.text,
                                      borderColor: tag.border,
                                    }}
                                    className="w-5 h-5 rounded-md text-xs font-bold border flex items-center justify-center shrink-0"
                                  >
                                    {m.name.slice(0, 2).toUpperCase()}
                                  </span>
                                  <div className="min-w-0">
                                    <div className="truncate max-w-[85px] font-body text-xs font-semibold">{m.name}</div>
                                    <div className="flex items-center gap-1.5 pt-0.5">
                                      <button
                                        type="button"
                                        onClick={() => handleZeroOutTraveler(m.user_id)}
                                        className="text-xs font-mono text-[var(--muted)] hover:text-[var(--owes)] cursor-pointer underline font-medium"
                                      >
                                        Zero
                                      </button>
                                      {discrepancyCents > 0 && (
                                        <button
                                          type="button"
                                          onClick={() => handleAssignRemainderToTraveler(m.user_id)}
                                          className="text-xs font-mono text-[var(--settled)] hover:underline cursor-pointer font-medium"
                                        >
                                          +Rem
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="text-xs sm:text-sm text-[var(--muted)] font-mono font-medium">{curSymbol}</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={inputVal}
                                    onChange={(e) => handleCustomShareInputChange(m.user_id, e.target.value)}
                                    onBlur={() => handleCustomShareInputBlur(m.user_id)}
                                    className="w-20 px-2 py-1 rounded bg-[var(--canvas)] border border-[var(--border)] text-xs font-mono text-right text-[var(--text)] tabular-nums font-bold focus:border-white/40 focus:outline-none"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Allocation Math Status Bar */}
                        <div className="pt-2 border-t border-[var(--border)] flex flex-wrap items-center justify-between text-sm font-mono gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[var(--muted)]">Allocated:</span>
                            <span className="font-bold tabular-nums text-[var(--text)]">
                              {curSymbol}{(totalAllocatedCents / 100).toFixed(2)}
                            </span>
                            {discrepancyCents === 0 ? (
                              <span className="text-[var(--settled)] font-semibold flex items-center gap-1">
                                <Check className="w-3 h-3" /> Exact Match
                              </span>
                            ) : discrepancyCents > 0 ? (
                              <span className="text-[var(--owes)] font-semibold">
                                ({curSymbol}{(discrepancyCents / 100).toFixed(2)} remaining)
                              </span>
                            ) : (
                              <span className="text-[var(--owes)] font-semibold">
                                ({curSymbol}{(Math.abs(discrepancyCents) / 100).toFixed(2)} over total)
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            {discrepancyCents !== 0 && (
                              <button
                                type="button"
                                onClick={handleAutoBalanceRemainder}
                                className="text-[var(--text)] hover:underline cursor-pointer font-bold"
                              >
                                Fill Remainder
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={handleResetCustomToEqual}
                              className="text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
                            >
                              Reset
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Line Items Assignment Section (with editable item names and prices) */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono pt-1">
                          <span className="text-[var(--muted)] uppercase">EDIT & ASSIGN ITEMS TO TRAVELERS:</span>
                          <button
                            type="button"
                            onClick={splitAllWithEveryone}
                            className="text-xs text-[var(--text)] hover:underline cursor-pointer font-mono font-medium"
                          >
                            Reset All to Everyone
                          </button>
                        </div>

                        {extractedReceipt.items.length > 0 ? (
                          <div 
                            data-lenis-prevent="true"
                            className="space-y-2 max-h-[260px] overflow-y-auto overscroll-contain pr-1.5"
                            style={{ overscrollBehavior: 'contain' }}
                          >
                            {extractedReceipt.items.map((item, itemIdx) => {
                              return (
                                <div
                                  key={itemIdx}
                                  className="p-3 rounded-xl bg-[var(--canvas)] border border-[var(--border)] space-y-2"
                                >
                                  {/* Editable Item Header */}
                                  <div className="flex items-center justify-between text-sm font-mono gap-2">
                                    <div className="flex-1 min-w-0">
                                      <input
                                        type="text"
                                        value={item.name}
                                        onChange={(e) => handleUpdateItemName(itemIdx, e.target.value)}
                                        placeholder="Item name"
                                        aria-label={`Item ${itemIdx + 1} name`}
                                        className="w-full bg-transparent border-b border-transparent hover:border-[var(--border)] focus:border-white/40 text-sm font-mono text-[var(--text)] py-0.5 focus:outline-none font-medium truncate"
                                      />
                                      {(item.quantity || item.qty || 1) > 1 && item.unitPriceCents ? (
                                        <div className="text-xs sm:text-sm text-[var(--muted)] font-mono font-medium">
                                          {(item.quantity || item.qty)} x @ {curSymbol}{(item.unitPriceCents / 100).toFixed(2)} = {curSymbol}{(item.priceCents / 100).toFixed(2)}
                                        </div>
                                      ) : null}
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span className="text-sm text-[var(--muted)] font-mono">{curSymbol}</span>
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={itemPriceInputs[itemIdx] ?? (item.priceCents / 100).toFixed(2)}
                                        onChange={(e) => handleUpdateItemPrice(itemIdx, e.target.value)}
                                        onBlur={() => handleItemPriceBlur(itemIdx)}
                                        aria-label={`Item ${itemIdx + 1} price`}
                                        className="w-20 bg-[var(--surface-elevated)] border border-[var(--border)] rounded px-1.5 py-0.5 text-sm font-mono font-bold text-right text-[var(--text)] tabular-nums focus:border-white/40 focus:outline-none"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteItem(itemIdx)}
                                        title="Delete item"
                                        aria-label={`Delete ${item.name}`}
                                        className="p-1 text-[var(--muted)] hover:text-[var(--owes)] cursor-pointer transition-colors"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Claim chips */}
                                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                                    {activeMembers.map((m) => {
                                      const isClaimed = item.claimedByUserIds.includes(m.user_id);
                                      const tag = getMemberTagColor(m.user_id);
                                      return (
                                        <button
                                          key={m.user_id}
                                          type="button"
                                          onClick={() => toggleItemMember(itemIdx, m.user_id)}
                                          className={`px-2.5 py-1 rounded-lg text-xs sm:text-sm font-mono transition-colors cursor-pointer flex items-center gap-1.5 ${
                                            isClaimed
                                              ? 'bg-[var(--surface-elevated)] border border-white/20 text-[var(--text)]'
                                              : 'bg-transparent border border-dashed border-[var(--border)] text-[var(--muted)] opacity-60 hover:opacity-100'
                                          }`}
                                        >
                                          <span
                                            style={{
                                              backgroundColor: tag.bg,
                                              color: tag.text,
                                              borderColor: tag.border,
                                            }}
                                            className="w-5 h-5 rounded-md text-xs font-bold border flex items-center justify-center shrink-0"
                                          >
                                            {m.name.slice(0, 2).toUpperCase()}
                                          </span>
                                          <span className="truncate max-w-[90px]">{m.name}</span>
                                          {isClaimed && <Check className="w-2.5 h-2.5 text-[var(--text)]" />}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-3 rounded-xl bg-[var(--canvas)] border border-[var(--border)] text-center text-xs font-mono text-[var(--muted)]">
                            No individual line items. Total bill will split equally across travelers.
                          </div>
                        )}

                        {/* Add Item Action & Subtotals */}
                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={handleAddNewItem}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-[var(--border)] text-sm font-mono text-[var(--muted)] hover:text-[var(--text)] hover:border-white/30 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Line Item</span>
                          </button>
                          <div className="text-xs font-mono text-[var(--muted)]">
                            Items: {curSymbol}{(itemsSubtotalCents / 100).toFixed(2)}
                            {extractedReceipt.taxCents > 0 && ` • Tax: ${curSymbol}${(extractedReceipt.taxCents / 100).toFixed(2)}`}
                            {extractedReceipt.tipCents > 0 && ` • Tip: ${curSymbol}${(extractedReceipt.tipCents / 100).toFixed(2)}`}
                            {(extractedReceipt.roundOffCents !== 0 || (Math.abs(mismatchCents) <= 100 && mismatchCents !== 0)) && (
                              ` • Round-off: ${(extractedReceipt.roundOffCents || mismatchCents) > 0 ? '+' : '-'}${curSymbol}${(Math.abs(extractedReceipt.roundOffCents || mismatchCents) / 100).toFixed(2)}`
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer: Exactly ONE Lime-filled primary button */}
          <div className="shrink-0 flex items-center justify-between p-4 sm:p-5 border-t border-[var(--border)] bg-[var(--surface-elevated)]">
            <button
              type="button"
              onClick={() => {
                setParseError(null);
                setExtractedReceipt(null);
                setErrorMsg(null);
                setCustomSharesCents({});
                setShareInputStrings({});
                setItemPriceInputs({});
                setTotalInputString(null);
                setIsCustomManual(false);
              }}
              className="flex items-center gap-1.5 text-xs font-mono text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{extractedReceipt || parseError ? 'Start Over' : 'Cancel'}</span>
            </button>

            {extractedReceipt ? (
              <Button
                variant="primary"
                size="md"
                disabled={isConfirmDisabled}
                onClick={handleConfirm}
              >
                <span>{isSubmitting ? 'Splitting & Saving...' : 'Confirm & Split Bill'}</span>
              </Button>
            ) : parseError ? (
              <Button
                variant="primary"
                size="md"
                onClick={handleEnterManually}
                icon={<Edit3 className="w-4 h-4" />}
              >
                <span>Enter Manually</span>
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="md"
                onClick={onClose}
              >
                <span>Close</span>
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

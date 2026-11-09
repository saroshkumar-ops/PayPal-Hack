import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Users, 
  Plus, 
  Trash2, 
  ArrowRight, 
  Check, 
  ReceiptText, 
  Compass,
  AlertTriangle 
} from 'lucide-react';
import { Button } from '../ui/Button';
import { getCurrencySymbol } from '../../lib/currency';
import { formatPartyName } from '../../lib/formatters';
import type { UserPartyItem } from '../../api/userPartyService';

interface AllPartiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  parties: UserPartyItem[];
  activeTripId: string | null;
  onSelectParty: (tripId: string) => void;
  onDeleteParty: (tripId: string) => Promise<void>;
  onOpenCreateParty: () => void;
}

export const AllPartiesModal: React.FC<AllPartiesModalProps> = ({
  isOpen,
  onClose,
  parties,
  activeTripId,
  onSelectParty,
  onDeleteParty,
  onOpenCreateParty,
}) => {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Keyboard accessibility: dismiss on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (deleteConfirmId) {
          setDeleteConfirmId(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, deleteConfirmId]);

  const handleDelete = async (tripId: string) => {
    setIsDeleting(true);
    try {
      await onDeleteParty(tripId);
      setDeleteConfirmId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="all-parties-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-[0_24px_64px_rgba(0,0,0,0.9)] overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between p-5 border-b border-[var(--border)] bg-[var(--surface-elevated)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center">
                <Compass className="w-4 h-4 text-[var(--muted)]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 id="all-parties-title" className="text-base font-display font-bold text-[var(--text)] m-0">
                    My Parties
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-xs font-mono text-[var(--muted)]">
                    {parties.length}
                  </span>
                </div>
                <p className="text-xs text-[var(--muted)] font-body m-0 mt-0.5">
                  Manage your trips, switch active party, or create a new one
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCreateParty();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface)] hover:bg-white/10 border border-[var(--border)] text-xs font-mono font-medium text-[var(--text)] transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[var(--muted)]" />
                <span className="hidden sm:inline">New Party</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-white/6 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body: Party List */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-3.5 max-h-[calc(90vh-140px)]">
            {parties.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-[var(--canvas)] border border-dashed border-[var(--border)] space-y-4">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center">
                  <Users className="w-6 h-6 text-[var(--muted)]" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-display font-bold text-[var(--text)] m-0">
                    No Parties Yet
                  </h4>
                  <p className="text-xs text-[var(--muted)] font-body max-w-sm mx-auto m-0">
                    Create your first party to add friends, itemize scanned receipts, and split costs effortlessly.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => {
                    onClose();
                    onOpenCreateParty();
                  }}
                  icon={<Plus className="w-4 h-4" />}
                >
                  Create Your First Party
                </Button>
              </div>
            ) : (
              parties.map((party) => {
                const isActive = party.trip_id === activeTripId;
                const isConfirmingDelete = deleteConfirmId === party.trip_id;
                const cur = getCurrencySymbol(party.currency || 'INR');
                const totalSpendFormatted = party.totalSpendCents !== undefined
                  ? `${cur}${(party.totalSpendCents / 100).toFixed(2)}`
                  : `${cur}0.00`;

                return (
                  <div
                    key={party.trip_id}
                    className={`rounded-2xl border transition-all overflow-hidden ${
                      isActive
                        ? 'bg-[var(--surface-elevated)] border-white/30 shadow-[0_4px_20px_rgba(0,0,0,0.4)]'
                        : 'bg-[var(--canvas)] border-[var(--border)] hover:border-white/20'
                    }`}
                  >
                    <div className="p-4 sm:p-5 flex flex-col gap-3">
                      {/* Top Row: Name, Status Chip, Delete Button */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-display font-bold text-sm sm:text-base text-[var(--text)] truncate">
                              {formatPartyName(party.name, party.trip_id)}
                            </span>
                            {isActive && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-xs font-mono font-semibold text-[var(--text)]">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                Active
                              </span>
                            )}
                            {party.role === 'organizer' && (
                              <span className="px-2 py-0.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-xs font-mono text-[var(--muted)]">
                                Organizer
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-mono text-[var(--muted)] truncate m-0">
                            ID: {party.trip_id} · Currency: {party.currency || 'INR'}
                          </p>
                        </div>

                        {/* Delete Action Button */}
                        {!isConfirmingDelete && (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(party.trip_id)}
                            title="Delete Party"
                            aria-label={`Delete party ${party.name}`}
                            className="p-2 rounded-xl text-[var(--muted)] hover:text-[var(--owes)] hover:bg-[var(--owes)]/10 transition-colors cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Inline Delete Confirmation Banner */}
                      {isConfirmingDelete && (
                        <div className="p-3.5 rounded-xl bg-[var(--owes)]/10 border border-[var(--owes)]/30 space-y-2.5">
                          <div className="flex items-center gap-2 text-xs font-mono text-[var(--owes)] font-semibold">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>Delete this party from your account?</span>
                          </div>
                          <p className="text-xs font-body text-[var(--muted)] m-0">
                            This will remove the party and its local cache from your account.
                          </p>
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleDelete(party.trip_id)}
                              disabled={isDeleting}
                              className="px-3 py-1.5 rounded-lg bg-[var(--owes)] text-black text-xs font-mono font-bold hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                            >
                              {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              disabled={isDeleting}
                              className="px-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] text-xs font-mono hover:bg-white/10 transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Bottom Row: Stats and Switch Button */}
                      {!isConfirmingDelete && (
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border)]">
                          {/* Metrics chips */}
                          <div className="flex items-center gap-3 sm:gap-4 text-xs font-mono text-[var(--muted)]">
                            <span className="flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5" />
                              <strong className="text-[var(--text)] font-semibold">{party.membersCount || 1}</strong> {party.membersCount === 1 ? 'member' : 'members'}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <ReceiptText className="w-3.5 h-3.5" />
                              <strong className="text-[var(--text)] font-semibold">{party.expensesCount || 0}</strong> {party.expensesCount === 1 ? 'bill' : 'bills'}
                            </span>
                            <span className="hidden sm:inline text-[var(--text)] font-semibold">
                              Total: {totalSpendFormatted}
                            </span>
                          </div>

                          {/* Open / Select Action */}
                          {isActive ? (
                            <span className="inline-flex items-center gap-1 text-xs font-mono text-[var(--settled)] font-semibold">
                              <Check className="w-3.5 h-3.5" />
                              Currently Open
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                onSelectParty(party.trip_id);
                                onClose();
                              }}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--surface-elevated)] hover:bg-white/10 border border-[var(--border)] text-xs font-mono font-semibold text-[var(--text)] transition-all cursor-pointer"
                            >
                              <span>Open Party</span>
                              <ArrowRight className="w-3.5 h-3.5 text-[var(--muted)]" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 p-4 border-t border-[var(--border)] bg-[var(--surface-elevated)] flex items-center justify-between">
            <span className="text-xs font-mono text-[var(--muted)]">
              {parties.length} {parties.length === 1 ? 'party connected' : 'parties connected'}
            </span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
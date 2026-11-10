import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, ArrowRight, DollarSign, IndianRupee, Plus, UserPlus } from 'lucide-react';
import { Button } from '../ui/Button';

export interface PartyMemberDraft {
  name: string;
  handle?: string;
  paypal_email?: string;
}

interface CreatePartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizerName?: string;
  onCreateParty: (name: string, currency: 'USD' | 'INR', members?: PartyMemberDraft[]) => Promise<void>;
}

export const CreatePartyModal: React.FC<CreatePartyModalProps> = ({
  isOpen,
  onClose,
  organizerName = 'You',
  onCreateParty,
}) => {
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'INR'>('INR');
  const [members, setMembers] = useState<PartyMemberDraft[]>([]);
  const [friendName, setFriendName] = useState('');
  const [friendEmail, setFriendEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  const handleAddFriend = () => {
    const trimmedName = friendName.trim();
    if (!trimmedName) return;

    // Check if already in list
    if (members.some(m => m.name.toLowerCase() === trimmedName.toLowerCase())) {
      setErrorMsg(`"${trimmedName}" is already added.`);
      return;
    }

    const trimmedEmail = friendEmail.trim();
    const handle = trimmedEmail.startsWith('@') 
      ? trimmedEmail 
      : `@${trimmedName.toLowerCase().replace(/\s+/g, '')}`;

    setMembers(prev => [
      ...prev,
      {
        name: trimmedName,
        handle: handle,
        paypal_email: trimmedEmail.includes('@') && !trimmedEmail.startsWith('@') ? trimmedEmail : undefined,
      }
    ]);

    setFriendName('');
    setFriendEmail('');
    setErrorMsg(null);
  };

  const handleRemoveFriend = (index: number) => {
    setMembers(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please enter a trip name.');
      return;
    }
    setErrorMsg(null);
    setIsLoading(true);
    try {
      await onCreateParty(name.trim(), currency, members);
      setName('');
      setMembers([]);
      setFriendName('');
      setFriendEmail('');
      onClose();
    } catch {
      setErrorMsg('Failed to create trip. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-trip-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-[0_24px_64px_rgba(0,0,0,0.9)] overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between p-5 border-b border-[var(--border)] bg-[var(--surface-elevated)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center">
                <Users className="w-4 h-4 text-[var(--muted)]" />
              </div>
              <div>
                <h3 id="create-trip-title" className="text-base font-display font-bold text-[var(--text)] m-0">
                  New Trip
                </h3>
                <p className="text-xs text-[var(--muted)] font-body m-0 mt-0.5">
                  Create a trip and add friends to split expenses
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-white/6 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 overflow-y-auto">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-[var(--owes)]/10 border border-[var(--owes)]/30 text-xs font-mono text-[var(--owes)]">
                {errorMsg}
              </div>
            )}

            {/* Trip Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--text)] font-body">Trip Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Goa Trip 2026, Tokyo Food Tour"
                className="w-full bg-[var(--canvas)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text)] font-body focus:outline-none focus:border-white/30 transition-colors"
                autoFocus
                required
              />
            </div>

            {/* Currency Selector */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--text)] font-body">Currency</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCurrency('INR')}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-mono font-medium transition-all cursor-pointer ${
                    currency === 'INR'
                      ? 'bg-[var(--surface-elevated)] border-white/30 text-[var(--text)] font-semibold'
                      : 'bg-[var(--canvas)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  <IndianRupee className="w-4 h-4" />
                  <span>Rupees (INR)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency('USD')}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-mono font-medium transition-all cursor-pointer ${
                    currency === 'USD'
                      ? 'bg-[var(--surface-elevated)] border-white/30 text-[var(--text)] font-semibold'
                      : 'bg-[var(--canvas)] border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]'
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Dollars (USD)</span>
                </button>
              </div>
            </div>

            {/* Trip Members / Add Friends Section */}
            <div className="space-y-2.5 pt-1 border-t border-[var(--border)]">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-[var(--text)] font-body flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-[var(--muted)]" />
                  <span>Add Friends to Trip</span>
                </label>
                <span className="text-sm font-mono text-[var(--muted)]">
                  {members.length + 1} Total {members.length === 0 ? 'Member' : 'Members'}
                </span>
              </div>

              {/* Add Friend Inputs */}
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={friendName}
                  onChange={(e) => setFriendName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddFriend();
                    }
                  }}
                  placeholder="Friend's Name"
                  className="flex-1 bg-[var(--canvas)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text)] font-body focus:outline-none focus:border-white/30"
                />
                <input
                  type="text"
                  value={friendEmail}
                  onChange={(e) => setFriendEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddFriend();
                    }
                  }}
                  placeholder="PayPal Email or @handle"
                  className="w-full sm:w-48 bg-[var(--canvas)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm text-[var(--text)] font-mono focus:outline-none focus:border-white/30"
                />
                <button
                  type="button"
                  onClick={handleAddFriend}
                  disabled={!friendName.trim()}
                  className="px-4 py-2.5 rounded-xl bg-[var(--surface-elevated)] hover:bg-white/10 border border-[var(--border)] text-sm font-mono font-medium text-[var(--text)] transition-colors cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1 shrink-0"
                >
                  <Plus className="w-4 h-4 text-[var(--muted)]" />
                  <span>Add</span>
                </button>
              </div>

              {/* Added Members Chips List */}
              <div className="flex flex-wrap gap-2 pt-1">
                {/* Current User (Organizer) Chip: neutral off-white marker */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border)] text-sm font-mono text-[var(--text)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
                  <span>{organizerName} (Organizer)</span>
                </div>

                {/* Added Friends Chips */}
                {members.map((m, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--canvas)] border border-[var(--border)] text-sm font-mono text-[var(--text)]"
                  >
                    <span>{m.name}</span>
                    {m.handle && (
                      <span className="text-sm text-[var(--muted)] font-mono">{m.handle}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveFriend(idx)}
                      className="text-[var(--muted)] hover:text-[var(--text)] ml-0.5 cursor-pointer"
                      title="Remove"
                      aria-label={`Remove ${m.name}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions: ONE Lime-filled button for primary submit */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
              <Button variant="ghost" size="md" onClick={onClose} type="button">
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                disabled={isLoading}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                {isLoading ? 'Creating...' : `Create Trip (${members.length + 1} ${members.length === 0 ? 'Member' : 'Members'})`}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, ArrowRight, Mail, AtSign, User } from 'lucide-react';
import { Button } from '../ui/Button';
import { formatPartyName } from '../../lib/formatters';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripName?: string;
  onAddMember: (name: string, handle?: string, paypalEmail?: string) => Promise<void>;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  tripName,
  onAddMember,
}) => {
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please enter a member name.');
      return;
    }
    setErrorMsg(null);
    setIsLoading(true);
    try {
      await onAddMember(name.trim(), handle.trim() || undefined, paypalEmail.trim() || undefined);
      setName('');
      setHandle('');
      setPaypalEmail('');
      onClose();
    } catch {
      setErrorMsg('Failed to add member. Please try again.');
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
        aria-labelledby="add-member-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md rounded-3xl bg-[var(--surface)] border border-[var(--border)] shadow-[0_24px_64px_rgba(0,0,0,0.9)] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-[var(--border)] bg-[var(--surface-elevated)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center">
                <UserPlus className="w-4 h-4 text-[var(--muted)]" />
              </div>
              <div>
                <h3 id="add-member-title" className="text-base font-display font-bold text-[var(--text)] m-0">
                  Add Member
                </h3>
                <p className="text-[11px] text-[var(--muted)] font-body m-0 mt-0.5">
                  Add a friend to {formatPartyName(tripName) || 'this trip'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              aria-label="Close add member dialog"
              className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-white/6 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-[var(--owes)]/10 border border-[var(--owes)]/30 text-xs font-mono text-[var(--owes)]">
                {errorMsg}
              </div>
            )}

            {/* Friend's Name */}
            <div className="space-y-1.5">
              <label className="text-xs text-[var(--muted)] font-body flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[var(--muted)]" />
                <span>Friend's Name</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[var(--canvas)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text)] font-body focus:outline-none focus:border-white/30 transition-colors"
                autoFocus
                required
              />
            </div>

            {/* Handle / Username */}
            <div className="space-y-1.5">
              <label className="text-xs text-[var(--muted)] font-body flex items-center gap-1.5">
                <AtSign className="w-3.5 h-3.5 text-[var(--muted)]" />
                <span>Username (optional)</span>
              </label>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                className="w-full bg-[var(--canvas)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text)] font-mono focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>

            {/* PayPal Email */}
            <div className="space-y-1.5">
              <label className="text-xs text-[var(--muted)] font-body flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[var(--muted)]" />
                <span>PayPal Email (optional)</span>
              </label>
              <input
                type="email"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
                className="w-full bg-[var(--canvas)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--text)] font-mono focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>

            {/* Actions: One single lime button for primary submit */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
              <Button variant="ghost" size="md" onClick={onClose} type="button">
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                disabled={isLoading || !name.trim()}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                {isLoading ? 'Adding...' : 'Add Member'}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

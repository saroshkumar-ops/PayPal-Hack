import React, { useState } from 'react';
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
    } catch (err: any) {
      setErrorMsg('Failed to create trip. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg rounded-3xl bg-[#0F1117] border border-white/12 shadow-[0_24px_64px_rgba(0,0,0,0.9)] overflow-hidden my-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-white/8 bg-[#07080D]/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#171A23] border border-white/10 flex items-center justify-center">
                <Users className="w-4 h-4 text-[#C6FF3D]" />
              </div>
              <div>
                <h3 className="text-base font-display font-bold text-[#EDEEF2] m-0">
                  New Trip
                </h3>
                <p className="text-[11px] text-[#8A8FA3] font-body m-0 mt-0.5">
                  Create a trip and add friends to split expenses
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#8A8FA3] hover:text-[#EDEEF2] hover:bg-white/6 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-[#FF5C7A]/10 border border-[#FF5C7A]/30 text-xs font-mono text-[#FF5C7A]">
                {errorMsg}
              </div>
            )}

            {/* Trip Name */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#8A8FA3] font-body">Trip Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#07080D] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#EDEEF2] font-body focus:outline-none focus:border-[#C6FF3D] transition-colors"
                autoFocus
                required
              />
            </div>

            {/* Currency Selector */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#8A8FA3] font-body">Currency</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCurrency('INR')}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-mono font-medium transition-all cursor-pointer ${
                    currency === 'INR'
                      ? 'bg-[#171A23] border-[#C6FF3D] text-[#C6FF3D]'
                      : 'bg-[#07080D] border-white/8 text-[#8A8FA3] hover:text-[#EDEEF2]'
                  }`}
                >
                  <IndianRupee className="w-3.5 h-3.5" />
                  <span>Rupees (INR)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency('USD')}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-mono font-medium transition-all cursor-pointer ${
                    currency === 'USD'
                      ? 'bg-[#171A23] border-[#C6FF3D] text-[#C6FF3D]'
                      : 'bg-[#07080D] border-white/8 text-[#8A8FA3] hover:text-[#EDEEF2]'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Dollars (USD)</span>
                </button>
              </div>
            </div>

            {/* Trip Members / Add Friends Section */}
            <div className="space-y-2 pt-1 border-t border-white/8">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#EDEEF2] font-body flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-[#C6FF3D]" />
                  <span>Add Friends to Trip</span>
                </label>
                <span className="text-[10px] font-mono text-[#8A8FA3]">
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
                  className="flex-1 bg-[#07080D] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#EDEEF2] font-body focus:outline-none focus:border-[#C6FF3D]"
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
                  className="w-full sm:w-40 bg-[#07080D] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#EDEEF2] font-mono focus:outline-none focus:border-[#C6FF3D]"
                />
                <button
                  type="button"
                  onClick={handleAddFriend}
                  disabled={!friendName.trim()}
                  className="px-3.5 py-2 rounded-xl bg-[#171A23] hover:bg-[#C6FF3D]/10 border border-white/10 hover:border-[#C6FF3D]/30 text-xs font-mono font-medium text-[#C6FF3D] transition-colors cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>

              {/* Added Members Chips List */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {/* Current User (Organizer) Chip */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#171A23] border border-[#C6FF3D]/30 text-xs font-mono text-[#C6FF3D]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C6FF3D]" />
                  <span>{organizerName} (Organizer)</span>
                </div>

                {/* Added Friends Chips */}
                {members.map((m, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#07080D] border border-white/10 text-xs font-mono text-[#EDEEF2]"
                  >
                    <span>{m.name}</span>
                    {m.handle && (
                      <span className="text-[10px] text-[#8A8FA3]">{m.handle}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveFriend(idx)}
                      className="text-[#8A8FA3] hover:text-[#FF5C7A] ml-0.5 cursor-pointer"
                      title="Remove"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/8">
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

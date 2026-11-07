import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, ArrowRight, DollarSign, IndianRupee } from 'lucide-react';
import { Button } from '../ui/Button';

interface CreatePartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateParty: (name: string, currency: 'USD' | 'INR') => Promise<void>;
}

export const CreatePartyModal: React.FC<CreatePartyModalProps> = ({
  isOpen,
  onClose,
  onCreateParty,
}) => {
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'INR'>('INR');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please enter a party name.');
      return;
    }
    setErrorMsg(null);
    setIsLoading(true);
    try {
      await onCreateParty(name.trim(), currency);
      setName('');
      onClose();
    } catch (err: any) {
      setErrorMsg('Failed to create party. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md rounded-3xl bg-[#0F1117] border border-white/12 shadow-[0_24px_64px_rgba(0,0,0,0.9)] overflow-hidden"
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
                  Create a trip to track and split expenses
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

            {/* Party Name */}
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
                {isLoading ? 'Creating...' : 'Create Trip'}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

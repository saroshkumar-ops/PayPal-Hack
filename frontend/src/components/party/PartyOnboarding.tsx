import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Trash2, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle,
  Flame,
  Shield,
  Smile
} from 'lucide-react';
import { Logo } from '../common/Logo';
import { Button } from '../ui/Button';
import { tripService, memberService, ledgerService } from '../../api/services';
import type { TripLedger, RoastConsent } from '../../types';

interface PartyOnboardingProps {
  onPartyCreated: (ledger: TripLedger, tripId: string) => void;
  onBackToIntro?: () => void;
}

interface FriendMemberInput {
  id: string;
  name: string;
  handle: string;
  paypalEmail: string;
  roastConsent: RoastConsent;
}

export const PartyOnboarding: React.FC<PartyOnboardingProps> = ({ 
  onPartyCreated,
  onBackToIntro 
}) => {
  const [partyName, setPartyName] = useState('');
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');

  // Organizer details
  const [organizerName, setOrganizerName] = useState('');
  const [organizerHandle, setOrganizerHandle] = useState('');
  const [organizerEmail, setOrganizerEmail] = useState('');
  const [organizerRoastConsent, setOrganizerRoastConsent] = useState<RoastConsent>('SPICY');

  // Friends / Party Members
  const [friends, setFriends] = useState<FriendMemberInput[]>([
    {
      id: 'friend_1',
      name: '',
      handle: '',
      paypalEmail: '',
      roastConsent: 'SPICY',
    },
    {
      id: 'friend_2',
      name: '',
      handle: '',
      paypalEmail: '',
      roastConsent: 'MILD',
    },
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const addFriendRow = () => {
    setFriends(prev => [
      ...prev,
      {
        id: `friend_${Date.now()}`,
        name: '',
        handle: '',
        paypalEmail: '',
        roastConsent: 'SPICY',
      },
    ]);
  };

  const removeFriendRow = (id: string) => {
    if (friends.length <= 1) return;
    setFriends(prev => prev.filter(f => f.id !== id));
  };

  const updateFriend = (id: string, field: keyof FriendMemberInput, value: string) => {
    setFriends(prev =>
      prev.map(f => (f.id === id ? { ...f, [field]: value } : f))
    );
  };

  const handleLaunchParty = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!partyName.trim()) {
      setErrorMsg('Please enter a party or trip name.');
      return;
    }
    if (!organizerName.trim()) {
      setErrorMsg('Please enter your name as the party organizer.');
      return;
    }

    const validFriends = friends.filter(f => f.name.trim().length > 0);
    if (validFriends.length === 0) {
      setErrorMsg('Please add at least 1 friend to your party.');
      return;
    }

    setIsLoading(true);

    try {
      const safeSlug = partyName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 16);
      const tripId = `party_${safeSlug}_${Date.now().toString(36)}`;

      // 1. Create Trip
      await tripService.createTrip({
        trip_id: tripId,
        name: partyName.trim(),
        currency: currency,
      });

      // 2. Register Organizer
      const safeOrgSlug = organizerName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const organizerUserId = `user_${safeOrgSlug}_${Date.now().toString(36).slice(-4)}`;
      const cleanOrgHandle = organizerHandle.trim()
        ? (organizerHandle.trim().startsWith('@') ? organizerHandle.trim() : `@${organizerHandle.trim()}`)
        : `@${safeOrgSlug}`;

      await memberService.addMember(tripId, {
        user_id: organizerUserId,
        name: organizerName.trim(),
        handle: cleanOrgHandle,
        paypal_email: organizerEmail.trim() || `${safeOrgSlug}@personal.example.com`,
        role: 'ORGANIZER',
        roast_consent: organizerRoastConsent,
      });

      // 3. Register Friends
      for (let i = 0; i < validFriends.length; i++) {
        const friend = validFriends[i];
        const safeFriendSlug = friend.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const friendUserId = `user_${safeFriendSlug}_${(i + 1).toString().padStart(2, '0')}`;
        const cleanFriendHandle = friend.handle.trim()
          ? (friend.handle.trim().startsWith('@') ? friend.handle.trim() : `@${friend.handle.trim()}`)
          : `@${safeFriendSlug}`;

        await memberService.addMember(tripId, {
          user_id: friendUserId,
          name: friend.name.trim(),
          handle: cleanFriendHandle,
          paypal_email: friend.paypalEmail.trim() || `${safeFriendSlug}@personal.example.com`,
          role: 'MEMBER',
          roast_consent: friend.roastConsent,
        });
      }

      // 4. Retrieve fresh ledger
      const newLedger = await ledgerService.getLedger(tripId);
      onPartyCreated(newLedger, tripId);
    } catch (err: any) {
      console.error('Failed to initialize party:', err);
      setErrorMsg('Failed to initialize party in the database. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-8 sm:py-12 px-4 select-none">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-3xl bg-[#0F1117] border border-white/10 shadow-[0_24px_64px_rgba(0,0,0,0.85)] p-6 sm:p-10 space-y-8"
      >
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/8 pb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Logo size="md" />
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono text-[#C6FF3D] bg-[#C6FF3D]/10 border border-[#C6FF3D]/30 font-bold uppercase">
                Party Setup
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-[#EDEEF2] tracking-tight m-0">
              Create Your Travel Party
            </h1>
            <p className="text-xs sm:text-sm text-[#8A8FA3] font-body m-0">
              Configure members, frontpayer, and currency for automated double-entry ledger calculation.
            </p>
          </div>

          {onBackToIntro && (
            <button
              type="button"
              onClick={onBackToIntro}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#171A23] hover:bg-white/8 border border-white/10 text-xs font-mono text-[#8A8FA3] hover:text-[#EDEEF2] transition-colors cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-[#FF5C7A]/10 border border-[#FF5C7A]/30 text-xs font-mono text-[#FF5C7A] flex items-center gap-2">
            <span>•</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLaunchParty} className="space-y-8">
          {/* STEP 1: PARTY IDENTITY */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono text-[#C6FF3D] uppercase tracking-wider">
              <span>01</span>
              <span className="text-[#8A8FA3]">•</span>
              <span>PARTY DETAILS</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-[#EDEEF2] font-body">
                  Party Name *
                </label>
                <input
                  type="text"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  className="w-full bg-[#07080D] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-[#EDEEF2] font-body focus:outline-none focus:border-[#C6FF3D]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#EDEEF2] font-body">
                  Ledger Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as 'INR' | 'USD')}
                  className="w-full bg-[#07080D] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[#EDEEF2] font-mono focus:outline-none focus:border-[#C6FF3D]"
                >
                  <option value="INR">INR (₹) - Indian Rupee</option>
                  <option value="USD">USD ($) - US Dollar</option>
                </select>
              </div>
            </div>
          </div>

          {/* STEP 2: ORGANIZER (YOU) */}
          <div className="space-y-4 pt-2 border-t border-white/6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono text-[#C6FF3D] uppercase tracking-wider">
                <span>02</span>
                <span className="text-[#8A8FA3]">•</span>
                <span>YOU (ORGANIZER & BENEFICIARY)</span>
              </div>
              <span className="text-[10px] font-mono text-[#8A8FA3]">Receives Pooled Funds</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#07080D] border border-white/8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-[#8A8FA3] font-body">Your Name *</label>
                <input
                  type="text"
                  value={organizerName}
                  onChange={(e) => setOrganizerName(e.target.value)}
                  className="w-full bg-[#0F1117] border border-white/8 rounded-lg px-3 py-2 text-xs text-[#EDEEF2] font-body focus:outline-none focus:border-[#C6FF3D]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-[#8A8FA3] font-body">Handle</label>
                <input
                  type="text"
                  value={organizerHandle}
                  onChange={(e) => setOrganizerHandle(e.target.value)}
                  className="w-full bg-[#0F1117] border border-white/8 rounded-lg px-3 py-2 text-xs text-[#EDEEF2] font-mono focus:outline-none focus:border-[#C6FF3D]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-[#8A8FA3] font-body">PayPal Email</label>
                <input
                  type="email"
                  value={organizerEmail}
                  onChange={(e) => setOrganizerEmail(e.target.value)}
                  className="w-full bg-[#0F1117] border border-white/8 rounded-lg px-3 py-2 text-xs text-[#EDEEF2] font-mono focus:outline-none focus:border-[#C6FF3D]"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-[#8A8FA3] font-body">
                  {organizerRoastConsent === 'SPICY' && <Flame className="w-3.5 h-3.5 text-[#FF5C7A]" />}
                  {organizerRoastConsent === 'MILD' && <Smile className="w-3.5 h-3.5 text-[#FFC439]" />}
                  {organizerRoastConsent === 'NO_ROAST' && <Shield className="w-3.5 h-3.5 text-[#8A8FA3]" />}
                  <span>Roast Consent</span>
                </div>
                <select
                  value={organizerRoastConsent}
                  onChange={(e) => setOrganizerRoastConsent(e.target.value as RoastConsent)}
                  className="w-full bg-[#0F1117] border border-white/8 rounded-lg px-3 py-2 text-xs text-[#EDEEF2] font-mono focus:outline-none focus:border-[#C6FF3D]"
                >
                  <option value="SPICY">Spicy (High Heat)</option>
                  <option value="MILD">Mild (Courteous)</option>
                  <option value="NO_ROAST">No Roast (Formal)</option>
                </select>
              </div>
            </div>
          </div>

          {/* STEP 3: PARTY MEMBERS */}
          <div className="space-y-4 pt-2 border-t border-white/6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono text-[#C6FF3D] uppercase tracking-wider">
                <span>03</span>
                <span className="text-[#8A8FA3]">•</span>
                <span>PARTY FRIENDS ({friends.length} MEMBERS)</span>
              </div>

              <button
                type="button"
                onClick={addFriendRow}
                className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[#171A23] hover:bg-white/8 border border-white/10 text-xs font-mono text-[#C6FF3D] transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Friend</span>
              </button>
            </div>

            <div className="space-y-3">
              {friends.map((friend, idx) => (
                <div
                  key={friend.id}
                  className="p-3.5 rounded-2xl bg-[#07080D] border border-white/8 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                >
                  <div className="sm:col-span-3 space-y-1">
                    <span className="text-[10px] font-mono text-[#8A8FA3]">Friend #{idx + 1} Name *</span>
                    <input
                      type="text"
                      value={friend.name}
                      onChange={(e) => updateFriend(friend.id, 'name', e.target.value)}
                      className="w-full bg-[#0F1117] border border-white/8 rounded-lg px-3 py-1.5 text-xs text-[#EDEEF2] font-body focus:outline-none focus:border-[#C6FF3D]"
                      required
                    />
                  </div>

                  <div className="sm:col-span-3 space-y-1">
                    <span className="text-[10px] font-mono text-[#8A8FA3]">Handle</span>
                    <input
                      type="text"
                      value={friend.handle}
                      onChange={(e) => updateFriend(friend.id, 'handle', e.target.value)}
                      className="w-full bg-[#0F1117] border border-white/8 rounded-lg px-3 py-1.5 text-xs text-[#EDEEF2] font-mono focus:outline-none focus:border-[#C6FF3D]"
                    />
                  </div>

                  <div className="sm:col-span-3 space-y-1">
                    <span className="text-[10px] font-mono text-[#8A8FA3]">PayPal Email</span>
                    <input
                      type="email"
                      value={friend.paypalEmail}
                      onChange={(e) => updateFriend(friend.id, 'paypalEmail', e.target.value)}
                      className="w-full bg-[#0F1117] border border-white/8 rounded-lg px-3 py-1.5 text-xs text-[#EDEEF2] font-mono focus:outline-none focus:border-[#C6FF3D]"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <span className="text-[10px] font-mono text-[#8A8FA3]">Roast Consent</span>
                    <select
                      value={friend.roastConsent}
                      onChange={(e) => updateFriend(friend.id, 'roastConsent', e.target.value as RoastConsent)}
                      className="w-full bg-[#0F1117] border border-white/8 rounded-lg px-2.5 py-1.5 text-xs text-[#EDEEF2] font-mono focus:outline-none focus:border-[#C6FF3D]"
                    >
                      <option value="SPICY">Spicy</option>
                      <option value="MILD">Mild</option>
                      <option value="NO_ROAST">No Roast</option>
                    </select>
                  </div>

                  <div className="sm:col-span-1 flex items-center justify-end sm:justify-center pt-2 sm:pt-4">
                    <button
                      type="button"
                      onClick={() => removeFriendRow(friend.id)}
                      disabled={friends.length <= 1}
                      title="Remove Friend"
                      className="p-1.5 rounded-lg text-[#8A8FA3] hover:text-[#FF5C7A] hover:bg-white/4 disabled:opacity-20 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="pt-4 border-t border-white/8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-mono text-[#8A8FA3]">
              <CheckCircle className="w-4 h-4 text-[#C6FF3D]" />
              <span>Double-entry matrix initialized with {friends.filter(f => f.name.trim()).length + 1} travelers</span>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={isLoading}
              icon={<ArrowRight className="w-4 h-4" />}
              className="w-full sm:w-auto text-sm font-display font-bold shadow-[0_0_24px_rgba(198,255,61,0.25)]"
            >
              {isLoading ? 'Initializing Treasury Matrix...' : 'Initialize Party & Enter Terminal'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

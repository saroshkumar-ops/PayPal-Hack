import { tripService, ledgerService } from './services';
import type { AuthResponseDto, TripResponse } from '../types';

export interface UserPartyItem {
  trip_id: string;
  name: string;
  currency: string;
  status: string;
  created_at?: string;
  membersCount?: number;
  expensesCount?: number;
  totalSpendCents?: number;
  role?: 'organizer' | 'member';
}

const getStorageKey = (userId: string) => `user_trips_${userId}`;
const getEmailStorageKey = (email?: string) => email ? `user_trips_${email.toLowerCase().trim()}` : null;
const getActiveTripKey = (userId: string) => `active_trip_${userId}`;
const getSummaryKey = (tripId: string) => `user_party_summary_${tripId}`;

export const userPartyService = {
  /**
   * Get all parties associated with the authenticated user.
   * Discovers trips stored in localStorage for this user credentials,
   * plus any trips from the backend where the user is an enrolled participant.
   */
  getUserParties: async (user: AuthResponseDto): Promise<UserPartyItem[]> => {
    if (!user || !user.user_id) return [];

    // 1. Gather stored trip IDs from user-keyed localStorage
    const userKey = getStorageKey(user.user_id);
    const emailKey = getEmailStorageKey(user.email);

    const storedUserTrips: string[] = JSON.parse(localStorage.getItem(userKey) || '[]');
    const storedEmailTrips: string[] = emailKey ? JSON.parse(localStorage.getItem(emailKey) || '[]') : [];

    const tripIdSet = new Set<string>([...storedUserTrips, ...storedEmailTrips]);

    // 2. Discover any backend trips where this user is an enrolled member
    try {
      const allBackendTrips: TripResponse[] = await tripService.getAllTrips();
      if (allBackendTrips && allBackendTrips.length > 0) {
        for (const bt of allBackendTrips) {
          if (!bt.trip_id) continue;
          // If already in set, continue
          if (tripIdSet.has(bt.trip_id)) continue;

          // Check if user is a member of this trip
          try {
            const l = await ledgerService.getLedger(bt.trip_id);
            if (l && l.members && l.members.some(m => 
              m.user_id === user.user_id || 
              (user.email && m.paypal_email && m.paypal_email.toLowerCase() === user.email.toLowerCase()) ||
              (user.handle && m.handle && m.handle.toLowerCase() === user.handle.toLowerCase())
            )) {
              tripIdSet.add(bt.trip_id);
            }
          } catch {
            // Ignore individual trip fetch errors
          }
        }
      }
    } catch (err) {
      console.warn('Backend trips scan error:', err);
    }

    // 3. For each trip ID, build rich party summary item
    const partyItems: UserPartyItem[] = [];
    const validTripIds: string[] = [];

    for (const tripId of Array.from(tripIdSet)) {
      try {
        // Check cache first for rapid rendering
        const cachedRaw = localStorage.getItem(getSummaryKey(tripId));
        let partyItem: UserPartyItem | null = cachedRaw ? JSON.parse(cachedRaw) : null;

        // Fetch fresh ledger data
        try {
          const ledger = await ledgerService.getLedger(tripId);
          if (ledger && ledger.trip_id) {
            const totalSpend = (ledger.expenses || []).reduce((acc, exp) => acc + (exp.amount_cents || 0), 0);
            const userMember = (ledger.members || []).find(m => m.user_id === user.user_id);

            partyItem = {
              trip_id: ledger.trip_id,
              name: ledger.trip_name || ledger.name || partyItem?.name || `Party ${tripId}`,
              currency: ledger.currency || partyItem?.currency || 'INR',
              status: 'ACTIVE',
              created_at: partyItem?.created_at || new Date().toISOString(),
              membersCount: ledger.members?.length || 1,
              expensesCount: ledger.expenses?.length || 0,
              totalSpendCents: totalSpend,
              role: userMember?.role === 'organizer' ? 'organizer' : 'member',
            };

            localStorage.setItem(getSummaryKey(tripId), JSON.stringify(partyItem));
          }
        } catch {
          // Keep cached summary if available
        }

        if (partyItem) {
          partyItems.push(partyItem);
          validTripIds.push(tripId);
        }
      } catch (err) {
        console.warn(`Error resolving party ${tripId}:`, err);
      }
    }

    // 4. Save synced trip IDs back to user's storage
    localStorage.setItem(userKey, JSON.stringify(validTripIds));
    if (emailKey) {
      localStorage.setItem(emailKey, JSON.stringify(validTripIds));
    }

    return partyItems;
  },

  /**
   * Associate a newly created or joined party with this user's credentials.
   */
  saveUserParty: (userId: string, email: string | undefined, trip: UserPartyItem): void => {
    if (!userId || !trip.trip_id) return;

    const userKey = getStorageKey(userId);
    const existing: string[] = JSON.parse(localStorage.getItem(userKey) || '[]');
    if (!existing.includes(trip.trip_id)) {
      existing.push(trip.trip_id);
      localStorage.setItem(userKey, JSON.stringify(existing));
    }

    const emailKey = getEmailStorageKey(email);
    if (emailKey) {
      const existingEmail: string[] = JSON.parse(localStorage.getItem(emailKey) || '[]');
      if (!existingEmail.includes(trip.trip_id)) {
        existingEmail.push(trip.trip_id);
        localStorage.setItem(emailKey, JSON.stringify(existingEmail));
      }
    }

    localStorage.setItem(getActiveTripKey(userId), trip.trip_id);
    localStorage.setItem(getSummaryKey(trip.trip_id), JSON.stringify(trip));
  },

  /**
   * Delete a party from the user's account and clean up client-side caches.
   */
  deleteUserParty: async (userId: string, email: string | undefined, tripId: string): Promise<void> => {
    if (!userId || !tripId) return;

    // 1. Remove from user storage keys
    const userKey = getStorageKey(userId);
    const existing: string[] = JSON.parse(localStorage.getItem(userKey) || '[]');
    const updated = existing.filter(id => id !== tripId);
    localStorage.setItem(userKey, JSON.stringify(updated));

    const emailKey = getEmailStorageKey(email);
    if (emailKey) {
      const existingEmail: string[] = JSON.parse(localStorage.getItem(emailKey) || '[]');
      const updatedEmail = existingEmail.filter(id => id !== tripId);
      localStorage.setItem(emailKey, JSON.stringify(updatedEmail));
    }

    // 2. Clear active trip if it was the deleted one
    const activeKey = getActiveTripKey(userId);
    if (localStorage.getItem(activeKey) === tripId) {
      if (updated.length > 0) {
        localStorage.setItem(activeKey, updated[0]);
      } else {
        localStorage.removeItem(activeKey);
      }
    }

    if (localStorage.getItem('active_trip_id') === tripId) {
      if (updated.length > 0) {
        localStorage.setItem('active_trip_id', updated[0]);
      } else {
        localStorage.removeItem('active_trip_id');
      }
    }

    // 3. Remove summary cache
    localStorage.removeItem(getSummaryKey(tripId));
  },

  /**
   * Get active trip ID saved for a specific user.
   */
  getActiveTripId: (userId: string): string | null => {
    return localStorage.getItem(getActiveTripKey(userId)) || localStorage.getItem('active_trip_id');
  },

  /**
   * Set active trip ID for a specific user.
   */
  setActiveTripId: (userId: string, tripId: string): void => {
    localStorage.setItem(getActiveTripKey(userId), tripId);
    localStorage.setItem('active_trip_id', tripId);
  },
};

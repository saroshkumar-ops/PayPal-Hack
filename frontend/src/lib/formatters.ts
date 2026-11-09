/**
 * Human-friendly display formatting utilities.
 * Ensures raw backend database IDs, hashes, and snake_case constants are
 * never shown directly to users.
 */

/**
 * Format a trip/party name cleanly.
 * Converts "patiala" -> "Patiala"
 * Converts "party_patiala_mw6ejx4u" -> "Patiala"
 * Converts "party_rv_mw67jla2" -> "RV"
 * Converts "trip_bali_2026" -> "Bali Villa 2026" (or clean title)
 */
export function formatPartyName(name?: string, fallbackId?: string): string {
  if (name && name.trim().length > 0) {
    const trimmed = name.trim();
    // If name is already human friendly, just capitalize
    if (!trimmed.includes('_') || trimmed.includes(' ')) {
      return toTitleCase(trimmed);
    }
  }

  const raw = (name && name.trim().length > 0) ? name : (fallbackId || 'Trip');

  // Strip prefixes like party_ or trip_
  let cleaned = raw
    .replace(/^(party|trip)_/i, '')
    // Strip trailing random alphanumeric hashes (e.g. _mw6ejx4u)
    .replace(/_[a-z0-9]{6,12}$/i, '')
    .replace(/_/g, ' ')
    .trim();

  if (!cleaned) {
    cleaned = 'Trip';
  }

  // Common acronyms like RV
  if (cleaned.toLowerCase() === 'rv') {
    return 'RV Trip';
  }

  return toTitleCase(cleaned);
}

/**
 * Format an internal expense ID into a short, clean receipt reference.
 * "exp_8e56e6b1" -> "#8E56"
 */
export function formatExpenseId(id?: string): string {
  if (!id) return '#0000';
  const clean = id.replace(/^exp_/i, '');
  return `#${clean.slice(0, 4).toUpperCase()}`;
}

/**
 * Format an internal order reference into a human transaction ID.
 * "order_party_patiala_..._exp_8e56e6b1" -> "#ORD-8E56"
 */
export function formatReferenceId(ref?: string): string {
  if (!ref) return '#ORD';
  const parts = ref.split('_');
  const last = parts[parts.length - 1];
  return `#ORD-${last.slice(0, 4).toUpperCase()}`;
}

/**
 * Format raw category strings into natural readable titles.
 * "FOOD" -> "Food & Dining"
 */
export function formatCategoryName(category?: string): string {
  if (!category) return 'General';
  const upper = category.toUpperCase().trim();
  switch (upper) {
    case 'FOOD':
      return 'Food & Dining';
    case 'TRANSPORT':
    case 'TRAVEL':
      return 'Travel & Transport';
    case 'ACCOMMODATION':
    case 'HOTEL':
    case 'LODGING':
      return 'Accommodation';
    case 'ENTERTAINMENT':
      return 'Entertainment';
    case 'SHOPPING':
      return 'Shopping';
    case 'UTILITIES':
      return 'Utilities';
    case 'OTHER':
    default:
      return toTitleCase(category.replace(/_/g, ' '));
  }
}

/**
 * Convert a string to Title Case.
 */
export function toTitleCase(str: string): string {
  if (!str) return '';
  return str
    .split(' ')
    .map(word => {
      if (!word) return '';
      // Acronym check
      if (word.toUpperCase() === 'RV' || word.toUpperCase() === 'USD' || word.toUpperCase() === 'INR') {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

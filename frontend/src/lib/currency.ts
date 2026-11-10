/**
 * Currency utility helpers for formatted display.
 */
export function getCurrencySymbol(currency?: string): string {
  if (!currency) return '₹';
  const code = currency.toUpperCase().trim();
  switch (code) {
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    case 'INR':
      return '₹';
    case 'JPY':
      return '¥';
    case 'CAD':
      return 'CA$';
    case 'AUD':
      return 'AU$';
    default:
      return code;
  }
}

export function formatCurrencyAmount(amountCents: number, currency: string = 'INR'): string {
  const symbol = getCurrencySymbol(currency);
  const amount = (amountCents / 100).toFixed(2);
  return `${symbol}${amount}`;
}

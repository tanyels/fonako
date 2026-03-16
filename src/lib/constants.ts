/** Shared constants for Göstergeç */

// Pagination
export const PAGE_SIZE = 25

// Cache
export const FUND_RETURNS_CACHE_TTL = 30 * 60 * 1000 // 30 minutes (data updates daily)
export const INFLATION_CACHE_TTL = 60 * 60 * 1000 // 1 hour

// Inflation fallbacks (annual rates, used when DB has no data)
export const FALLBACK_TR_INFLATION = 44.4
export const FALLBACK_US_INFLATION = 2.8

// BES fund detection — checks category first, falls back to name
export function isBESFund(name: string, category?: string): boolean {
  if (category === 'Emeklilik') return true
  const upper = name.toUpperCase()
  return upper.includes('EMEKLİLİK') || upper.includes('EMEKLILIK')
}

export interface LiveRates {
  usdTry: number
  eurTry: number
  goldTry: number  // per gram in TRY
  goldUsd: number  // XAU/USD per ounce
  timestamp: Date
}

/**
 * Fetches live exchange rates from free APIs
 * Updates every minute for real-time display
 */
export async function fetchLiveRates(): Promise<LiveRates> {
  try {
    // Fetch exchange rates from frankfurter.app (free, no key required)
    const forexResponse = await fetch(
      'https://api.frankfurter.app/latest?from=USD&to=TRY,EUR'
    )
    const forexData = await forexResponse.json()

    // For gold, we'll use a placeholder until we set up a real API
    // Options: metals.live, goldapi.io (free tier), or calculate from XAU/USD
    const goldUsd = 2650 // Placeholder - will fetch from API
    // Convert XAU/USD to per-gram TRY, with ~3% domestic premium
    // (import duty, bank margin, local demand premium in Turkish market)
    const DOMESTIC_GOLD_PREMIUM = 1.03
    const goldTry = (goldUsd * forexData.rates.TRY / 31.1035) * DOMESTIC_GOLD_PREMIUM

    return {
      usdTry: forexData.rates.TRY,
      eurTry: forexData.rates.TRY / forexData.rates.EUR,
      goldTry,
      goldUsd,
      timestamp: new Date(),
    }
  } catch (error) {
    console.error('Failed to fetch live rates:', error)
    // Return fallback values
    return {
      usdTry: 34.5,
      eurTry: 37.2,
      goldTry: 2850,
      goldUsd: 2650,
      timestamp: new Date(),
    }
  }
}

/**
 * Fetches historical rates from TCMB or our Supabase cache
 */
export async function fetchHistoricalRates(
  startDate: string,
  endDate: string
): Promise<Array<{ date: string; usdTry: number; eurTry: number; goldTry: number }>> {
  // This will query our Supabase database
  // For now, return placeholder
  return []
}

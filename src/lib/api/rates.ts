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
    // Fetch exchange rates and gold price in parallel
    const [forexResponse, goldResponse] = await Promise.all([
      fetch('https://api.frankfurter.app/latest?from=USD&to=TRY,EUR'),
      fetch('https://api.gold-api.com/price/XAU'),
    ])

    const forexData = await forexResponse.json()

    // Parse gold price with fallback
    let goldUsd = 5000 // Last-resort fallback
    if (goldResponse.ok) {
      const goldData = await goldResponse.json()
      if (goldData.price && goldData.price > 0) {
        goldUsd = goldData.price
      }
    }

    const usdTry = forexData.rates.TRY
    const goldTry = goldUsd * usdTry / 31.1035 // Convert oz to gram

    return {
      usdTry,
      eurTry: usdTry / forexData.rates.EUR,
      goldTry,
      goldUsd,
      timestamp: new Date(),
    }
  } catch (error) {
    console.error('Failed to fetch live rates:', error)
    // Return fallback values
    return {
      usdTry: 44,
      eurTry: 50,
      goldTry: 7100,
      goldUsd: 5000,
      timestamp: new Date(),
    }
  }
}

export interface PreviousClose {
  usdTry: number
  eurTry: number
  goldTry: number
  goldUsd: number
}

/**
 * Fetches yesterday's closing rates from exchange_rates table.
 */
export async function fetchPreviousClose(): Promise<PreviousClose | null> {
  try {
    const { supabase } = await import('./supabase')
    // Use local date (not UTC) so Turkey timezone doesn't skip a day
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    const { data } = await supabase
      .from('exchange_rates')
      .select('usd_try, eur_try, gold_try_gram, gold_usd_oz')
      .lt('date', today)
      .order('date', { ascending: false })
      .limit(1)

    if (!data || data.length === 0) return null

    return {
      usdTry: data[0].usd_try,
      eurTry: data[0].eur_try,
      goldTry: data[0].gold_try_gram,
      goldUsd: data[0].gold_usd_oz,
    }
  } catch {
    return null
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

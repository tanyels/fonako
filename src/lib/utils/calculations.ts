import { getFundPrices, getExchangeRates } from '@/lib/api/supabase'
import { getLocalDateString } from '@/lib/utils/date'

export interface RealReturns {
  tryReturn: number      // Nominal TL return (%)
  usdReturn: number      // USD-adjusted return (%)
  eurReturn: number      // EUR-adjusted return (%)
  goldReturn: number     // Gold-adjusted return (%)
  startValue: number     // Starting amount in TL
  endValueTry: number    // Ending value in TL
  endValueUsd: number    // Ending value in USD equivalent
}

interface CalculateParams {
  fundCode: string
  startDate: string
  endDate?: string       // Defaults to today
  amountTry: number
}

/**
 * Calculates real returns of a fund against multiple currencies
 * This is the core calculation that powers the entire app
 */
export async function calculateRealReturns(params: CalculateParams): Promise<RealReturns> {
  const { fundCode, startDate, amountTry } = params
  const endDate = params.endDate || getLocalDateString()

  try {
    // Fetch fund prices and exchange rates in parallel
    const [fundPrices, exchangeRates] = await Promise.all([
      getFundPrices(fundCode, startDate, endDate),
      getExchangeRates(startDate, endDate),
    ])

    if (fundPrices.length < 2 || exchangeRates.length < 2) {
      throw new Error('Insufficient data for calculation')
    }

    // Align dates: fund prices and exchange rates may start/end on different days
    // (e.g., weekends, holidays). Use the overlapping date range.
    const actualStart = fundPrices[0].date > exchangeRates[0].date
      ? fundPrices[0].date
      : exchangeRates[0].date
    const actualEnd = fundPrices[fundPrices.length - 1].date < exchangeRates[exchangeRates.length - 1].date
      ? fundPrices[fundPrices.length - 1].date
      : exchangeRates[exchangeRates.length - 1].date

    // Find the closest data points at or after actualStart, and at or before actualEnd
    const startFundIdx = fundPrices.findIndex((p) => p.date >= actualStart)
    const endFundIdx = findLastIndex(fundPrices, (p) => p.date <= actualEnd)
    const startRateIdx = exchangeRates.findIndex((r) => r.date >= actualStart)
    const endRateIdx = findLastIndex(exchangeRates, (r) => r.date <= actualEnd)

    if (startFundIdx < 0 || endFundIdx < 0 || startRateIdx < 0 || endRateIdx < 0 || startFundIdx >= endFundIdx) {
      throw new Error('Insufficient overlapping data between fund prices and exchange rates')
    }

    // Get start and end values using aligned dates
    const startFundPrice = fundPrices[startFundIdx].price_try
    const endFundPrice = fundPrices[endFundIdx].price_try

    const startRates = exchangeRates[startRateIdx]
    const endRates = exchangeRates[endRateIdx]

    // Calculate fund units purchased
    const units = amountTry / startFundPrice

    // Calculate end values
    const endValueTry = units * endFundPrice

    // TL nominal return
    const tryReturn = ((endValueTry - amountTry) / amountTry) * 100

    // Convert to USD at start and end
    const startValueUsd = amountTry / startRates.usd_try
    const endValueUsd = endValueTry / endRates.usd_try
    const usdReturn = ((endValueUsd - startValueUsd) / startValueUsd) * 100

    // Convert to EUR at start and end
    const startValueEur = amountTry / startRates.eur_try
    const endValueEur = endValueTry / endRates.eur_try
    const eurReturn = ((endValueEur - startValueEur) / startValueEur) * 100

    // Convert to gold at start and end (in grams)
    const startValueGold = amountTry / startRates.gold_try_gram
    const endValueGold = endValueTry / endRates.gold_try_gram
    const goldReturn = ((endValueGold - startValueGold) / startValueGold) * 100

    return {
      tryReturn,
      usdReturn,
      eurReturn,
      goldReturn,
      startValue: amountTry,
      endValueTry,
      endValueUsd,
    }
  } catch (error) {
    console.error('Calculation failed:', error)
    throw error instanceof Error
      ? error
      : new Error('Veri çekilemedi. Lütfen daha sonra tekrar deneyin.')
  }
}

/**
 * Calculates what the value would be if held as USD/EUR/Gold instead
 */
export function calculateBenchmark(
  amountTry: number,
  benchmark: 'USD' | 'EUR' | 'GOLD',
  startRates: { usd_try: number; eur_try: number; gold_try_gram: number },
  endRates: { usd_try: number; eur_try: number; gold_try_gram: number }
): number {
  switch (benchmark) {
    case 'USD': {
      const usdBought = amountTry / startRates.usd_try
      return usdBought * endRates.usd_try
    }
    case 'EUR': {
      const eurBought = amountTry / startRates.eur_try
      return eurBought * endRates.eur_try
    }
    case 'GOLD': {
      const goldBought = amountTry / startRates.gold_try_gram
      return goldBought * endRates.gold_try_gram
    }
  }
}

/** Finds the last index in an array matching a predicate (Array.findLastIndex polyfill) */
function findLastIndex<T>(arr: T[], predicate: (item: T) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (predicate(arr[i])) return i
  }
  return -1
}

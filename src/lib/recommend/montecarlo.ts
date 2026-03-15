import type { SimulationResult, MonteCarloOutput } from './types'
import type { FundPrice } from '@/lib/api/supabase'

function boxMuller(): number {
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

function calculateMonthlyReturns(prices: FundPrice[]): number[] {
  if (prices.length < 2) return []

  // Group by month
  const byMonth = new Map<string, number[]>()
  prices.forEach((p) => {
    const key = p.date.substring(0, 7) // YYYY-MM
    const arr = byMonth.get(key) || []
    arr.push(p.price_try)
    byMonth.set(key, arr)
  })

  // Get last price of each month
  const months: string[] = []
  const monthlyPrices: number[] = []
  byMonth.forEach((dayPrices, month) => {
    months.push(month)
    monthlyPrices.push(dayPrices[dayPrices.length - 1])
  })

  // Sort by month
  const sorted = months
    .map((m, i) => ({ month: m, price: monthlyPrices[i] }))
    .sort((a, b) => a.month.localeCompare(b.month))

  // Calculate monthly returns
  const returns: number[] = []
  for (let i = 1; i < sorted.length; i++) {
    const ret = (sorted[i].price - sorted[i - 1].price) / sorted[i - 1].price
    returns.push(ret)
  }

  return returns
}

export function runMonteCarlo(
  prices: FundPrice[],
  monthlyInvestment: number,
  durationMonths: number,
  targetAmount: number | null,
): MonteCarloOutput {
  const monthlyReturns = calculateMonthlyReturns(prices)

  if (monthlyReturns.length < 3) {
    return {
      paths: [],
      targetProbability: null,
      expectedRange: { low: 0, mid: 0, high: 0 },
      monthlyReturnMean: 0,
      monthlyReturnStd: 0,
    }
  }

  const mean = monthlyReturns.reduce((s, r) => s + r, 0) / monthlyReturns.length
  const variance = monthlyReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / monthlyReturns.length
  const std = Math.sqrt(variance)

  const numSims = 1000
  // Store final values of each simulation and all paths
  const allPaths: number[][] = []
  let reachedTarget = 0

  for (let sim = 0; sim < numSims; sim++) {
    let portfolio = 0
    const path: number[] = [0]

    for (let m = 0; m < durationMonths; m++) {
      portfolio += monthlyInvestment
      const randomReturn = mean + std * boxMuller()
      portfolio *= 1 + randomReturn
      path.push(portfolio)
    }

    allPaths.push(path)
    if (targetAmount !== null && portfolio >= targetAmount) {
      reachedTarget++
    }
  }

  // Calculate percentiles for each month
  const paths: SimulationResult[] = []
  for (let m = 0; m <= durationMonths; m++) {
    const values = allPaths.map((p) => p[m]).sort((a, b) => a - b)
    paths.push({
      month: m,
      p10: values[Math.floor(numSims * 0.1)],
      p25: values[Math.floor(numSims * 0.25)],
      p50: values[Math.floor(numSims * 0.5)],
      p75: values[Math.floor(numSims * 0.75)],
      p90: values[Math.floor(numSims * 0.9)],
    })
  }

  const finalValues = allPaths.map((p) => p[p.length - 1]).sort((a, b) => a - b)

  return {
    paths,
    targetProbability: targetAmount !== null ? (reachedTarget / numSims) * 100 : null,
    expectedRange: {
      low: finalValues[Math.floor(numSims * 0.1)],
      mid: finalValues[Math.floor(numSims * 0.5)],
      high: finalValues[Math.floor(numSims * 0.9)],
    },
    monthlyReturnMean: mean * 100,
    monthlyReturnStd: std * 100,
  }
}

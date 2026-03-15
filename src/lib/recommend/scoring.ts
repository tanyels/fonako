import type { FundReturn, RiskLevel, Currency, ScoredFund } from './types'

interface ScoringWeights {
  returnW: number
  consistencyW: number
  sizeW: number
  popularityW: number
  riskW: number
}

const WEIGHTS: Record<RiskLevel, ScoringWeights> = {
  low:    { returnW: 0.20, consistencyW: 0.30, sizeW: 0.25, popularityW: 0.15, riskW: -0.10 },
  medium: { returnW: 0.35, consistencyW: 0.25, sizeW: 0.15, popularityW: 0.10, riskW: -0.15 },
  high:   { returnW: 0.50, consistencyW: 0.15, sizeW: 0.05, popularityW: 0.05, riskW: -0.25 },
}

function percentile(values: number[], value: number): number {
  if (values.length === 0) return 50
  const sorted = [...values].sort((a, b) => a - b)
  let rank = 0
  for (const v of sorted) {
    if (v < value) rank++
    else break
  }
  return (rank / sorted.length) * 100
}

function getReturnValue(r: FundReturn, currency: Currency): number | null {
  switch (currency) {
    case 'TL': return r.try_return
    case 'USD': return r.usd_return
    case 'Altın': return r.gold_return
  }
}

export function scoreFunds(
  allReturns: FundReturn[],
  fundDetails: Map<string, { market_cap: number | null; investor_count: number | null }>,
  risk: RiskLevel,
  currency: Currency,
  period: string,
  categoryFilter: string | null,
  fundNames: Map<string, { name: string; category: string }>,
): ScoredFund[] {
  const weights = WEIGHTS[risk]

  // Filter returns for the selected period
  const periodReturns = allReturns.filter((r) => r.period === period)

  // Group all returns by fund_code
  const byFund = new Map<string, FundReturn[]>()
  allReturns.forEach((r) => {
    const arr = byFund.get(r.fund_code) || []
    arr.push(r)
    byFund.set(r.fund_code, arr)
  })

  // Get all return values for percentile calculation
  const allReturnValues = periodReturns
    .map((r) => getReturnValue(r, currency))
    .filter((v): v is number => v !== null)

  const allMarketCaps = Array.from(fundDetails.values())
    .map((d) => d.market_cap)
    .filter((v): v is number => v !== null && v > 0)
    .map((v) => Math.log10(v))

  const allInvestorCounts = Array.from(fundDetails.values())
    .map((d) => d.investor_count)
    .filter((v): v is number => v !== null)

  const results: ScoredFund[] = []

  periodReturns.forEach((fr) => {
    const fundInfo = fundNames.get(fr.fund_code)
    if (!fundInfo) return
    if (categoryFilter && fundInfo.category !== categoryFilter) return

    const returnVal = getReturnValue(fr, currency)
    if (returnVal === null) return

    // 1. Return score
    const returnScore = percentile(allReturnValues, returnVal)

    // 2. Consistency: positive USD return periods / total periods
    const fundAllReturns = byFund.get(fr.fund_code) || []
    const totalPeriods = fundAllReturns.length
    const positivePeriods = fundAllReturns.filter((r) => (r.usd_return ?? 0) > 0).length
    const consistencyScore = totalPeriods > 0 ? (positivePeriods / totalPeriods) * 100 : 50

    // 3. Size (market_cap log-percentile)
    const detail = fundDetails.get(fr.fund_code)
    const sizeScore = detail?.market_cap && detail.market_cap > 0
      ? percentile(allMarketCaps, Math.log10(detail.market_cap))
      : 50

    // 4. Popularity (investor_count percentile)
    const popularityScore = detail?.investor_count
      ? percentile(allInvestorCounts, detail.investor_count)
      : 50

    // 5. Risk penalty: spread of returns across periods
    const returnValues = fundAllReturns
      .map((r) => getReturnValue(r, currency))
      .filter((v): v is number => v !== null)
    let riskPenalty = 0
    if (returnValues.length >= 2) {
      const max = Math.max(...returnValues)
      const min = Math.min(...returnValues)
      const spread = max - min
      // Normalize: higher spread = higher penalty (0-100)
      const allSpreads = Array.from(byFund.values()).map((returns) => {
        const vals = returns.map((r) => getReturnValue(r, currency)).filter((v): v is number => v !== null)
        if (vals.length < 2) return 0
        return Math.max(...vals) - Math.min(...vals)
      })
      riskPenalty = percentile(allSpreads, spread)
    }

    const totalScore =
      weights.returnW * returnScore +
      weights.consistencyW * consistencyScore +
      weights.sizeW * sizeScore +
      weights.popularityW * popularityScore +
      weights.riskW * riskPenalty

    results.push({
      code: fr.fund_code,
      name: fundInfo.name,
      category: fundInfo.category,
      totalScore: Math.max(0, Math.min(100, totalScore)),
      scores: {
        returnScore,
        consistencyScore,
        sizeScore,
        popularityScore,
        riskPenalty,
      },
    })
  })

  return results.sort((a, b) => b.totalScore - a.totalScore).slice(0, 20)
}

import type { FundDetail, FundReturn, PortfolioResult, PortfolioFund } from './types'

function overlapScore(a: Record<string, number>, b: Record<string, number>): number {
  let sum = 0
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  keys.forEach((key) => {
    sum += Math.min(a[key] ?? 0, b[key] ?? 0)
  })
  return sum
}

export function optimizePortfolio(
  fundDetails: FundDetail[],
  fundReturns: FundReturn[],
  riskLevel: number, // 1-5
  maxFunds: number,
  excludedCategories: string[],
): PortfolioResult {
  // Build return lookup: fund_code → best period returns
  const returnMap = new Map<string, { tryR: number; usdR: number }>()
  fundReturns.forEach((fr) => {
    if (fr.period !== '1Y') return
    const existing = returnMap.get(fr.fund_code)
    if (!existing) {
      returnMap.set(fr.fund_code, {
        tryR: fr.try_return ?? 0,
        usdR: fr.usd_return ?? 0,
      })
    }
  })

  // Filter out excluded categories
  const eligible = fundDetails.filter(
    (d) => !excludedCategories.includes(d.category)
  )

  // For each category, pick top 3 by USD return
  const byCategory = new Map<string, FundDetail[]>()
  eligible.forEach((d) => {
    const arr = byCategory.get(d.category) || []
    arr.push(d)
    byCategory.set(d.category, arr)
  })

  const candidates: FundDetail[] = []
  byCategory.forEach((funds, _category) => {
    const sorted = [...funds].sort((a, b) => {
      const aR = returnMap.get(a.fund_code)?.usdR ?? -999
      const bR = returnMap.get(b.fund_code)?.usdR ?? -999
      return bR - aR
    })
    candidates.push(...sorted.slice(0, 3))
  })

  if (candidates.length === 0) {
    return { funds: [], combinedReturnTry: 0, combinedReturnUsd: 0, diversificationScore: 0 }
  }

  // Score each candidate: weighted by risk level
  // Higher risk → more weight on return; lower risk → more weight on consistency/size
  const returnWeight = 0.3 + riskLevel * 0.1 // 0.4 - 0.8
  const overlapWeight = 1 - returnWeight

  // Greedy selection
  const selected: FundDetail[] = []
  const remaining = [...candidates]

  // Pick best fund first
  remaining.sort((a, b) => {
    const aR = returnMap.get(a.fund_code)?.usdR ?? -999
    const bR = returnMap.get(b.fund_code)?.usdR ?? -999
    return bR - aR
  })

  if (remaining.length > 0) {
    selected.push(remaining.shift()!)
  }

  // Greedily add funds with best score (return - overlap)
  while (selected.length < maxFunds && remaining.length > 0) {
    let bestIdx = -1
    let bestScore = -Infinity

    remaining.forEach((candidate, idx) => {
      const ret = returnMap.get(candidate.fund_code)?.usdR ?? 0
      // Average overlap with already selected funds
      let avgOverlap = 0
      if (candidate.asset_allocation) {
        selected.forEach((sel) => {
          if (sel.asset_allocation) {
            avgOverlap += overlapScore(candidate.asset_allocation!, sel.asset_allocation!)
          }
        })
        avgOverlap /= selected.length
      }

      // Category diversity bonus
      const selectedCategories = new Set(selected.map((s) => s.category))
      const diversityBonus = selectedCategories.has(candidate.category) ? 0 : 20

      const score = returnWeight * ret - overlapWeight * avgOverlap + diversityBonus

      if (score > bestScore) {
        bestScore = score
        bestIdx = idx
      }
    })

    if (bestIdx >= 0) {
      selected.push(remaining.splice(bestIdx, 1)[0])
    } else {
      break
    }
  }

  // Build result
  const weight = 1 / selected.length
  const portfolioFunds: PortfolioFund[] = selected.map((d) => {
    const ret = returnMap.get(d.fund_code) ?? { tryR: 0, usdR: 0 }

    // Calculate overlap with other selected funds
    const overlaps: Record<string, number> = {}
    selected.forEach((other) => {
      if (other.fund_code === d.fund_code) return
      if (d.asset_allocation && other.asset_allocation) {
        overlaps[other.fund_code] = overlapScore(d.asset_allocation, other.asset_allocation)
      }
    })

    return {
      code: d.fund_code,
      name: d.name,
      category: d.category,
      weight,
      returnTry: ret.tryR,
      returnUsd: ret.usdR,
      overlapScores: overlaps,
    }
  })

  const combinedReturnTry = portfolioFunds.reduce((s, f) => s + f.weight * f.returnTry, 0)
  const combinedReturnUsd = portfolioFunds.reduce((s, f) => s + f.weight * f.returnUsd, 0)

  // Diversification score: unique categories / total funds * 100
  const uniqueCategories = new Set(portfolioFunds.map((f) => f.category)).size
  const diversificationScore = (uniqueCategories / portfolioFunds.length) * 100

  return {
    funds: portfolioFunds,
    combinedReturnTry,
    combinedReturnUsd,
    diversificationScore,
  }
}

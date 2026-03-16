'use client'

import { useState, useEffect } from 'react'
import { getAllFunds, type Fund } from '@/lib/api/supabase'
import { useTefasFilter } from '@/lib/context/TefasFilterContext'

// ── Shared types ──

export interface FundReturn {
  fund_code: string
  period: string
  try_return: number | null
  usd_return: number | null
  eur_return: number | null
  gold_return: number | null
}

export interface FundDetail {
  fund_code: string
  name: string
  category: string
  manager: string
  is_tefas: boolean
  market_cap: number | null
  investor_count: number | null
  asset_allocation: Record<string, number> | null
}

export type RiskLevel = 'low' | 'medium' | 'high'
export type Currency = 'TL' | 'USD' | 'Altın'
export type Period = '1Y' | '3Y' | '5Y' | '10Y'
export type MacroDirection = 'up' | 'stable' | 'down'

export interface ScoredFund {
  code: string
  name: string
  category: string
  totalScore: number
  scores: {
    returnScore: number
    consistencyScore: number
    sizeScore: number
    popularityScore: number
    riskPenalty: number
  }
}

export interface SimulationResult {
  month: number
  p10: number
  p25: number
  p50: number
  p75: number
  p90: number
}

export interface MonteCarloOutput {
  paths: SimulationResult[]
  targetProbability: number | null
  expectedRange: { low: number; mid: number; high: number }
  monthlyReturnMean: number
  monthlyReturnStd: number
}

export interface PortfolioFund {
  code: string
  name: string
  category: string
  weight: number
  returnTry: number
  returnUsd: number
  overlapScores: Record<string, number>
}

export interface PortfolioResult {
  funds: PortfolioFund[]
  combinedReturnTry: number
  combinedReturnUsd: number
  diversificationScore: number
}

export interface ProfileResult {
  profileName: string
  profileDescription: string
  score: number
  rules: Record<string, string>
  matchedFunds: { code: string; name: string; category: string; returnUsd: number }[]
}

export interface MacroCategoryScore {
  category: string
  score: number
  reasons: string[]
}

// ── Hooks ──

export function useFundBatchLookup(overrideIncludeAll?: boolean): {
  lookup: Map<string, Fund>
  loading: boolean
} {
  const { showOnlyTefas } = useTefasFilter()
  const [allFunds, setAllFunds] = useState<Fund[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAllFunds()
      .then((funds) => {
        setAllFunds(funds)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const shouldFilter = showOnlyTefas && !overrideIncludeAll
  const lookup = new Map<string, Fund>()
  allFunds.forEach((f) => {
    if (!shouldFilter || f.is_tefas) {
      lookup.set(f.code, f)
    }
  })

  return { lookup, loading }
}

export function useFundLookup(overrideIncludeAll?: boolean): {
  funds: Fund[]
  loading: boolean
} {
  const { showOnlyTefas } = useTefasFilter()
  const [allFunds, setAllFunds] = useState<Fund[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAllFunds()
      .then((data) => {
        setAllFunds(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const shouldFilter = showOnlyTefas && !overrideIncludeAll
  const funds = shouldFilter ? allFunds.filter((f) => f.is_tefas) : allFunds

  return { funds, loading }
}

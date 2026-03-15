'use client'

import { useState, useEffect } from 'react'
import { getAllFunds, type Fund } from '@/lib/api/supabase'

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

export function useFundBatchLookup(): {
  lookup: Map<string, Fund>
  loading: boolean
} {
  const [lookup, setLookup] = useState<Map<string, Fund>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAllFunds()
      .then((funds) => {
        const map = new Map<string, Fund>()
        funds.forEach((f) => map.set(f.code, f))
        setLookup(map)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return { lookup, loading }
}

export function useFundLookup(): {
  funds: Fund[]
  loading: boolean
} {
  const [funds, setFunds] = useState<Fund[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAllFunds()
      .then((data) => {
        setFunds(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return { funds, loading }
}

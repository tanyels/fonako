'use client'

import { useState, useEffect } from 'react'
import { getFundReturns } from '@/lib/api/fundReturnsCache'
import { supabase } from '@/lib/api/supabase'

interface CategoryInfo {
  name: string
  slug: string
  fundCount: number
  avgUsdReturn: number
}

export interface HomeData {
  totalFunds: number
  usdLossPercentage: number
  avgTryReturn: number
  avgUsdReturn: number
  categories: CategoryInfo[]
  lastUpdated: string | null
  loading: boolean
  error: boolean
}

// Module-level cache + inflight deduplication
let cachedData: Omit<HomeData, 'loading' | 'error'> | null = null
let cacheTime = 0
let inflightPromise: Promise<Omit<HomeData, 'loading' | 'error'>> | null = null
const CACHE_TTL = 30 * 60 * 1000 // 30 min

async function fetchLastUpdated(): Promise<string | null> {
  try {
    // Use fund_returns.calculated_at — fund_prices is too large and times out
    const { data } = await supabase
      .from('fund_returns')
      .select('calculated_at')
      .order('calculated_at', { ascending: false })
      .limit(1)
    if (!data?.[0]?.calculated_at) return null
    return data[0].calculated_at.split('T')[0]
  } catch {
    return null
  }
}

async function fetchCategoryMapping(): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  try {
    // Query supabase directly — the /api/funds route caps at 200
    let offset = 0
    const pageSize = 1000
    while (true) {
      const { data } = await supabase
        .from('funds')
        .select('code, category')
        .range(offset, offset + pageSize - 1)
      if (!data || data.length === 0) break
      data.forEach((f: { code: string; category: string }) => map.set(f.code, f.category))
      if (data.length < pageSize) break
      offset += pageSize
    }
  } catch {
    // ignore
  }
  return map
}

async function loadHomeData(): Promise<Omit<HomeData, 'loading' | 'error'>> {
  const [returns, categoryMap, lastUpdated] = await Promise.all([
    getFundReturns('1Y'),
    fetchCategoryMapping(),
    fetchLastUpdated(),
  ])

  const totalFunds = returns.length
  const usdLossCount = returns.filter((r) => (r.usd_return ?? 0) < 0).length
  const usdLossPercentage = totalFunds > 0 ? Math.round((usdLossCount / totalFunds) * 100) : 0

  const sumTry = returns.reduce((s, r) => s + (r.try_return ?? 0), 0)
  const sumUsd = returns.reduce((s, r) => s + (r.usd_return ?? 0), 0)
  const avgTryReturn = totalFunds > 0 ? sumTry / totalFunds : 0
  const avgUsdReturn = totalFunds > 0 ? sumUsd / totalFunds : 0

  // Group by category
  const catMap = new Map<string, { sum: number; count: number }>()
  returns.forEach((r) => {
    const cat = categoryMap.get(r.fund_code)
    if (!cat) return
    const existing = catMap.get(cat)
    if (existing) {
      existing.sum += r.usd_return ?? 0
      existing.count++
    } else {
      catMap.set(cat, { sum: r.usd_return ?? 0, count: 1 })
    }
  })

  const categories: CategoryInfo[] = []
  catMap.forEach((val, name) => {
    categories.push({
      name,
      slug: name,
      fundCount: val.count,
      avgUsdReturn: val.sum / val.count,
    })
  })
  // Sort by fund count descending
  categories.sort((a, b) => b.fundCount - a.fundCount)

  return { totalFunds, usdLossPercentage, avgTryReturn, avgUsdReturn, categories, lastUpdated }
}

/**
 * Shared hook for homepage data. Uses module-level cache and inflight
 * deduplication so multiple consumers don't trigger parallel fetches.
 */
export function useHomeData(): HomeData {
  const [data, setData] = useState<Omit<HomeData, 'loading' | 'error'> | null>(cachedData)
  const [loading, setLoading] = useState(!cachedData)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (cachedData && Date.now() - cacheTime < CACHE_TTL) {
      setData(cachedData)
      setLoading(false)
      return
    }

    let cancelled = false

    // Reuse inflight promise if another instance already started the fetch
    if (!inflightPromise) {
      inflightPromise = loadHomeData().finally(() => {
        inflightPromise = null
      })
    }

    inflightPromise
      .then((result) => {
        cachedData = result
        cacheTime = Date.now()
        if (!cancelled) {
          setData(result)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true)
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [])

  return {
    totalFunds: data?.totalFunds ?? 0,
    usdLossPercentage: data?.usdLossPercentage ?? 0,
    avgTryReturn: data?.avgTryReturn ?? 0,
    avgUsdReturn: data?.avgUsdReturn ?? 0,
    categories: data?.categories ?? [],
    lastUpdated: data?.lastUpdated ?? null,
    loading,
    error,
  }
}

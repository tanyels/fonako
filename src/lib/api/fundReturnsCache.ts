import { supabase } from './supabase'
import { FUND_RETURNS_CACHE_TTL } from '@/lib/constants'

/**
 * Module-level cache for fund_returns queries.
 * Shared across all components on the same page to prevent duplicate fetches.
 */

interface FundReturnRow {
  fund_code: string
  period: string
  try_return: number | null
  usd_return: number | null
  eur_return: number | null
  gold_return: number | null
  sp500_return: number | null
}

interface CacheEntry {
  data: FundReturnRow[]
  fetchedAt: number
}

const cache = new Map<string, CacheEntry>()
const inflight = new Map<string, Promise<FundReturnRow[]>>()
const CACHE_TTL = FUND_RETURNS_CACHE_TTL

/**
 * Get fund_returns for a specific period, with caching and deduplication.
 */
export async function getFundReturns(period: string, limit?: number): Promise<FundReturnRow[]> {
  const key = `period:${period}:${limit ?? 'all'}`

  // Check cache
  const cached = cache.get(key)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.data
  }

  // Deduplicate in-flight requests
  const existing = inflight.get(key)
  if (existing) return existing

  const promise = (async () => {
    // Paginate to get all rows (Supabase max-rows default is 1000)
    const allData: FundReturnRow[] = []
    const pageSize = 1000
    const maxRows = limit || 10000
    let offset = 0

    while (offset < maxRows) {
      const batchLimit = Math.min(pageSize, maxRows - offset)
      const { data } = await supabase
        .from('fund_returns')
        .select('fund_code, period, try_return, usd_return, eur_return, gold_return, sp500_return')
        .eq('period', period)
        .order('usd_return', { ascending: false })
        .range(offset, offset + batchLimit - 1)

      const batch = (data || []) as FundReturnRow[]
      allData.push(...batch)
      if (batch.length < batchLimit) break
      offset += pageSize
    }

    cache.set(key, { data: allData, fetchedAt: Date.now() })
    inflight.delete(key)
    return allData
  })()

  inflight.set(key, promise)
  return promise
}

/**
 * Get all fund_returns across all periods, with caching.
 */
export async function getAllFundReturns(): Promise<FundReturnRow[]> {
  const key = 'all'

  const cached = cache.get(key)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.data
  }

  const existing = inflight.get(key)
  if (existing) return existing

  const promise = (async () => {
    // Paginate to get all rows (Supabase default limit is 1000)
    const allData: FundReturnRow[] = []
    let offset = 0
    const pageSize = 1000
    while (true) {
      const { data } = await supabase
        .from('fund_returns')
        .select('fund_code, period, try_return, usd_return, eur_return, gold_return, sp500_return')
        .range(offset, offset + pageSize - 1)
      const batch = (data || []) as FundReturnRow[]
      allData.push(...batch)
      if (batch.length < pageSize) break
      offset += pageSize
    }

    cache.set(key, { data: allData, fetchedAt: Date.now() })
    inflight.delete(key)
    return allData
  })()

  inflight.set(key, promise)
  return promise
}

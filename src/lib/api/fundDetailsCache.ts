import { getAllFundDetailsWithAllocation } from './supabase'
import type { FundDetail } from '@/lib/recommend/types'

const TTL = 30 * 60 * 1000 // 30 minutes

let cache: Map<string, FundDetail> | null = null
let cacheTime = 0
let inflight: Promise<Map<string, FundDetail>> | null = null

async function fetchAndCache(): Promise<Map<string, FundDetail>> {
  const rows = await getAllFundDetailsWithAllocation()
  const map = new Map<string, FundDetail>()
  rows.forEach((r) => map.set(r.fund_code, r))
  cache = map
  cacheTime = Date.now()
  inflight = null
  return map
}

export async function getCachedFundDetails(): Promise<Map<string, FundDetail>> {
  if (cache && Date.now() - cacheTime < TTL) {
    return cache
  }
  if (inflight) {
    return inflight
  }
  inflight = fetchAndCache()
  return inflight
}

export function invalidateFundDetailsCache(): void {
  cache = null
  cacheTime = 0
}

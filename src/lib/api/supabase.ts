import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface FundPrice {
  id: number
  fund_code: string
  date: string
  price_try: number
  created_at: string
}

export interface ExchangeRate {
  id: number
  date: string
  usd_try: number
  eur_try: number
  gold_try_gram: number
  gold_usd_oz: number
  created_at: string
}

export interface Fund {
  code: string
  name: string
  category: string
  manager: string
  inception_date: string
}

export interface SP500Price {
  id: number
  date: string
  close_usd: number
  created_at: string
}

export interface InflationData {
  source: string
  year_month: string
  index_value: number | null
  monthly_change: number | null
  annual_change: number | null
}

export interface FundDetails {
  fund_code: string
  market_cap: number | null
  number_of_shares: number | null
  number_of_investors: number | null
  asset_allocation: Record<string, number>
  updated_at: string
}

// Query functions
export async function getFundPrices(
  fundCode: string,
  startDate: string,
  endDate: string
): Promise<FundPrice[]> {
  const { data, error } = await supabase
    .from('fund_prices')
    .select('*')
    .eq('fund_code', fundCode)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
    .limit(2000)

  if (error) throw error
  return data || []
}

export async function getExchangeRates(
  startDate: string,
  endDate: string
): Promise<ExchangeRate[]> {
  const { data, error } = await supabase
    .from('exchange_rates')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
    .limit(2000)

  if (error) throw error
  return data || []
}

export async function getSP500Prices(
  startDate: string,
  endDate: string
): Promise<SP500Price[]> {
  const { data, error } = await supabase
    .from('sp500_prices')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
    .limit(2000)

  if (error) throw error
  return data || []
}

export async function getAllFunds(): Promise<Fund[]> {
  const allFunds: Fund[] = []
  let offset = 0
  const pageSize = 1000
  while (true) {
    const { data, error } = await supabase
      .from('funds')
      .select('*')
      .order('name', { ascending: true })
      .range(offset, offset + pageSize - 1)
    if (error) throw error
    const batch = data || []
    allFunds.push(...batch)
    if (batch.length < pageSize) break
    offset += pageSize
  }
  return allFunds
}

// ── Inflation data queries ──

/**
 * Get cumulative inflation for a source over a number of months.
 * For index-based sources (tuik, fed, konut): ratio of latest to N-months-ago index.
 * For rate-based sources (enag): compound monthly changes.
 */
export async function getInflationForPeriod(
  source: string,
  months: number
): Promise<number | null> {
  const { data, error } = await supabase
    .from('inflation_data')
    .select('year_month, index_value, monthly_change')
    .eq('source', source)
    .order('year_month', { ascending: false })
    .limit(months + 1)

  if (error || !data || data.length < 2) return null

  // Sort ascending
  const sorted = [...data].sort((a, b) => a.year_month.localeCompare(b.year_month))

  if (source === 'enag') {
    // Compound monthly changes (take the last `months` entries)
    const recent = sorted.slice(-months)
    let product = 1
    for (const row of recent) {
      if (row.monthly_change != null) {
        product *= (1 + row.monthly_change / 100)
      }
    }
    return (product - 1) * 100
  }

  // Index-based: ratio of last to first
  const latest = sorted[sorted.length - 1]
  const start = sorted[0]
  if (latest.index_value && start.index_value && start.index_value > 0) {
    return ((latest.index_value / start.index_value) - 1) * 100
  }

  return null
}

/**
 * Get the latest annual (12-month rolling) inflation rate for a source.
 */
export async function getLatestAnnualInflation(
  source: string
): Promise<number | null> {
  const { data, error } = await supabase
    .from('inflation_data')
    .select('annual_change')
    .eq('source', source)
    .order('year_month', { ascending: false })
    .limit(1)

  if (error || !data || data.length === 0) return null
  return data[0].annual_change
}

/**
 * Get inflation rates for all benchmarks for a given number of months.
 * Returns a map of source -> cumulative inflation %.
 */
export async function getAllInflationRates(
  months: number
): Promise<Record<string, number>> {
  const sources = ['tuik', 'enag', 'fed', 'konut']
  const results: Record<string, number> = {}

  const promises = sources.map(async (source) => {
    const rate = await getInflationForPeriod(source, months)
    if (rate !== null) {
      results[source] = rate
    }
  })

  await Promise.all(promises)
  return results
}

export interface FundReturnRow {
  fund_code: string
  period: string
  try_return: number | null
  usd_return: number | null
  eur_return: number | null
  gold_return: number | null
  sp500_return: number | null
}

export async function getFundReturn(code: string, period: string): Promise<FundReturnRow | null> {
  const { data, error } = await supabase
    .from('fund_returns')
    .select('fund_code, period, try_return, usd_return, eur_return, gold_return, sp500_return')
    .eq('fund_code', code)
    .eq('period', period)
    .single()

  if (error || !data) return null
  return data
}

export async function getFundDetails(code: string): Promise<FundDetails | null> {
  const { data, error } = await supabase
    .from('fund_details')
    .select('*')
    .eq('fund_code', code)
    .single()

  if (error || !data) return null
  return data
}

export async function getAllFundDetails(): Promise<FundDetails[]> {
  const all: FundDetails[] = []
  let offset = 0
  const pageSize = 1000
  while (true) {
    const { data, error } = await supabase
      .from('fund_details')
      .select('fund_code, market_cap, number_of_shares, number_of_investors, updated_at')
      .range(offset, offset + pageSize - 1)
    if (error) break
    const batch = (data || []) as FundDetails[]
    all.push(...batch)
    if (batch.length < pageSize) break
    offset += pageSize
  }
  return all
}

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
  is_tefas: boolean
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

  if (error) throw error
  return data || []
}

export async function getAllFunds(): Promise<Fund[]> {
  const all: Fund[] = []
  const batchSize = 1000
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('funds')
      .select('*')
      .order('name', { ascending: true })
      .range(from, from + batchSize - 1)

    if (error) throw error
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < batchSize) break
    from += batchSize
  }

  return all
}

// ── Fund Returns ──

export interface FundReturn {
  id: number
  fund_code: string
  period: string
  try_return: number | null
  usd_return: number | null
  eur_return: number | null
  gold_return: number | null
  calculated_at: string
}

export async function getFundReturns(period: string): Promise<FundReturn[]> {
  const { data, error } = await supabase
    .from('fund_returns')
    .select('*')
    .eq('period', period)

  if (error) throw error
  return data || []
}

export async function getAllFundReturns(): Promise<FundReturn[]> {
  const all: FundReturn[] = []
  const batchSize = 1000
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('fund_returns')
      .select('*')
      .order('fund_code', { ascending: true })
      .range(from, from + batchSize - 1)

    if (error) throw error
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < batchSize) break
    from += batchSize
  }

  return all
}

// ── Fund Details with Asset Allocation ──

export interface FundDetailRow {
  fund_code: string
  market_cap: number | null
  investor_count: number | null
  asset_allocation: Record<string, number> | null
}

export async function getAllFundDetails(): Promise<Fund[]> {
  return getAllFunds()
}

export async function getAllFundDetailsWithAllocation(): Promise<
  { fund_code: string; name: string; category: string; manager: string; is_tefas: boolean; market_cap: number | null; investor_count: number | null; asset_allocation: Record<string, number> | null }[]
> {
  // Fetch funds and fund_details in parallel
  const [funds, details] = await Promise.all([
    getAllFunds(),
    fetchFundDetails(),
  ])

  const detailMap = new Map<string, FundDetailRow>()
  details.forEach((d) => detailMap.set(d.fund_code, d))

  return funds.map((f) => {
    const d = detailMap.get(f.code)
    return {
      fund_code: f.code,
      name: f.name,
      category: f.category,
      manager: f.manager,
      is_tefas: f.is_tefas,
      market_cap: d?.market_cap ?? null,
      investor_count: d?.investor_count ?? null,
      asset_allocation: d?.asset_allocation ?? null,
    }
  })
}

async function fetchFundDetails(): Promise<FundDetailRow[]> {
  // Paginate in batches of 500
  const all: FundDetailRow[] = []
  let from = 0
  const batchSize = 500

  while (true) {
    const { data, error } = await supabase
      .from('fund_details')
      .select('fund_code, market_cap, investor_count, asset_allocation')
      .order('fund_code', { ascending: true })
      .range(from, from + batchSize - 1)

    if (error) {
      // Table may not exist yet — return empty
      console.warn('fund_details fetch failed:', error.message)
      return []
    }
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < batchSize) break
    from += batchSize
  }

  return all
}

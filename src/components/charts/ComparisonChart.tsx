'use client'

import { useState, useEffect } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { supabase } from '@/lib/api/supabase'

interface ComparisonChartProps {
  fundCode: string
  benchmark: 'USD' | 'EUR' | 'GOLD' | 'SP500'
  startDate: string
  amount: number
}

interface ChartPoint {
  date: string
  fund: number
  benchmark: number
}

export function ComparisonChart({ fundCode, benchmark, startDate, amount }: ComparisonChartProps) {
  const [data, setData] = useState<ChartPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!fundCode) {
      setData([])
      setLoading(false)
      return
    }

    setLoading(true)
    const endDate = new Date().toISOString().split('T')[0]

    const pricesQuery = supabase
      .from('fund_prices')
      .select('date, price_try')
      .eq('fund_code', fundCode)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })
      .limit(3000)

    const ratesQuery = supabase
      .from('exchange_rates')
      .select('date, usd_try, eur_try, gold_try_gram')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })
      .limit(3000)

    const sp500Query = benchmark === 'SP500'
      ? supabase
          .from('sp500_prices')
          .select('date, close_usd')
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: true })
          .limit(3000)
      : null

    Promise.all([
      pricesQuery,
      ratesQuery,
      sp500Query ?? Promise.resolve({ data: null }),
    ]).then(([pricesRes, ratesRes, sp500Res]: any[]) => {
      const prices = pricesRes.data || []
      const rates = ratesRes.data || []
      const sp500Data = sp500Res?.data || []

      if (prices.length < 2 || rates.length < 2) {
        setData([])
        setLoading(false)
        return
      }

      // Build rate lookup by date
      const rateLookup: Record<string, typeof rates[number]> = {}
      for (const r of rates) {
        rateLookup[r.date] = r
      }

      // Get starting values
      const startPrice = prices[0].price_try
      const units = amount / startPrice

      // Find closest rate for start date
      let startRate = rates[0]
      for (const r of rates) {
        if (r.date <= prices[0].date) startRate = r
        else break
      }

      // For SP500 benchmark
      let sp500Lookup: Record<string, number> = {}
      let sp500UnitsBought = 0
      if (benchmark === 'SP500' && sp500Data.length >= 2) {
        for (const s of sp500Data) {
          sp500Lookup[s.date] = s.close_usd
        }
        const startSP500Usd = sp500Data[0].close_usd
        const usdAtStart = amount / startRate.usd_try
        sp500UnitsBought = usdAtStart / startSP500Usd
      }

      // For USD/EUR/GOLD benchmark
      const rateKey = benchmark === 'USD' ? 'usd_try' : benchmark === 'EUR' ? 'eur_try' : 'gold_try_gram'
      const assetBought = benchmark !== 'SP500' ? amount / startRate[rateKey] : 0

      // Sample ~60 points max
      const step = Math.max(1, Math.floor(prices.length / 60))
      const points: ChartPoint[] = []
      let rateIdx = 0
      let sp500Idx = 0

      for (let i = 0; i < prices.length; i += step) {
        const p = prices[i]

        // Advance rate pointer (both sorted by date)
        while (rateIdx + 1 < rates.length && rates[rateIdx + 1].date <= p.date) {
          rateIdx++
        }
        const lastRate = rates[rateIdx]

        if (benchmark === 'SP500' && sp500Data.length > 0) {
          while (sp500Idx + 1 < sp500Data.length && sp500Data[sp500Idx + 1].date <= p.date) {
            sp500Idx++
          }
        }
        const lastSP500Price = sp500Data.length > 0 ? sp500Data[sp500Idx].close_usd : 0

        const fundValue = Math.round(units * p.price_try)
        let benchmarkValue: number
        if (benchmark === 'SP500') {
          benchmarkValue = Math.round(sp500UnitsBought * lastSP500Price * lastRate.usd_try)
        } else {
          benchmarkValue = Math.round(assetBought * lastRate[rateKey])
        }

        points.push({
          date: p.date.slice(0, 7),
          fund: fundValue,
          benchmark: benchmarkValue,
        })
      }

      // Always include last point
      const lastPrice = prices[prices.length - 1]
      if (points.length === 0 || points[points.length - 1].date !== lastPrice.date.slice(0, 7)) {
        // Advance pointers to last price date
        while (rateIdx + 1 < rates.length && rates[rateIdx + 1].date <= lastPrice.date) {
          rateIdx++
        }
        const finalRate = rates[rateIdx]
        let finalSP500Price = sp500Data.length > 0 ? sp500Data[sp500Idx].close_usd : 0
        if (benchmark === 'SP500' && sp500Data.length > 0) {
          while (sp500Idx + 1 < sp500Data.length && sp500Data[sp500Idx + 1].date <= lastPrice.date) {
            sp500Idx++
          }
          finalSP500Price = sp500Data[sp500Idx].close_usd
        }

        let lastBenchmarkValue: number
        if (benchmark === 'SP500') {
          lastBenchmarkValue = Math.round(sp500UnitsBought * finalSP500Price * finalRate.usd_try)
        } else {
          lastBenchmarkValue = Math.round(assetBought * finalRate[rateKey])
        }

        points.push({
          date: lastPrice.date.slice(0, 7),
          fund: Math.round(units * lastPrice.price_try),
          benchmark: lastBenchmarkValue,
        })
      }

      setData(points)
      setLoading(false)
    }).catch(() => {
      setData([])
      setLoading(false)
    })
  }, [fundCode, benchmark, startDate, amount])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-subtle animate-pulse">
        Grafik yükleniyor...
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-subtle">
        Bu dönem için yeterli veri yok
      </div>
    )
  }

  const benchmarkLabel = {
    USD: 'USD Tutsaydınız',
    EUR: 'EUR Tutsaydınız',
    GOLD: 'Altın Tutsaydınız',
    SP500: 'S&P 500 Tutsaydınız',
  }[benchmark]

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12 }}
          tickLine={false}
          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border-default)',
            borderRadius: '8px',
            color: 'var(--body)',
          }}
          formatter={(value: number) => [
            `${value.toLocaleString('tr-TR')} ₺`,
          ]}
        />
        <Legend />
        <Area
          type="monotone"
          dataKey="fund"
          name="Fon Değeri"
          stroke="#6b7280"
          fill="#e5e7eb"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="benchmark"
          name={benchmarkLabel}
          stroke="#10b981"
          fill="#d1fae5"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

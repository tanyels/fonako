'use client'

import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { supabase } from '@/lib/api/supabase'

interface PerformanceChartProps {
  fundCode: string
  period: '1Y' | '3Y' | '5Y' | '10Y'
}

const PERIOD_DAYS: Record<string, number> = {
  '1Y': 365,
  '3Y': 1095,
  '5Y': 1825,
  '10Y': 3650,
}

interface ChartPoint {
  date: string
  try: number
  usd: number
  eur: number
  gold: number
}

export function PerformanceChart({ fundCode, period }: PerformanceChartProps) {
  const [data, setData] = useState<ChartPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!fundCode) return
    setLoading(true)

    const days = PERIOD_DAYS[period] || 365
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const endDate = new Date().toISOString().split('T')[0]

    Promise.all([
      supabase
        .from('fund_prices')
        .select('date, price_try')
        .eq('fund_code', fundCode)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })
        .limit(3000),
      supabase
        .from('exchange_rates')
        .select('date, usd_try, eur_try, gold_try_gram')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })
        .limit(3000),
    ]).then(([pricesRes, ratesRes]) => {
      const prices = pricesRes.data || []
      const rates = ratesRes.data || []

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
      let startRate = rates[0]

      // Find closest rate for start date
      for (const r of rates) {
        if (r.date <= prices[0].date) startRate = r
        else break
      }

      const startUsd = startPrice / startRate.usd_try
      const startEur = startPrice / startRate.eur_try
      const startGold = startPrice / startRate.gold_try_gram

      // Sample ~60 points max for smooth chart
      const step = Math.max(1, Math.floor(prices.length / 60))
      const points: ChartPoint[] = []
      let lastRate = startRate

      for (let i = 0; i < prices.length; i += step) {
        const p = prices[i]
        // Find closest rate
        if (rateLookup[p.date]) {
          lastRate = rateLookup[p.date]
        } else {
          // Find nearest previous rate
          for (const r of rates) {
            if (r.date <= p.date) lastRate = r
            else break
          }
        }

        const curUsd = p.price_try / lastRate.usd_try
        const curEur = p.price_try / lastRate.eur_try
        const curGold = p.price_try / lastRate.gold_try_gram

        points.push({
          date: p.date.slice(0, 7), // YYYY-MM
          try: Math.round(((p.price_try / startPrice) * 100) * 10) / 10,
          usd: Math.round(((curUsd / startUsd) * 100) * 10) / 10,
          eur: Math.round(((curEur / startEur) * 100) * 10) / 10,
          gold: Math.round(((curGold / startGold) * 100) * 10) / 10,
        })
      }

      // Always include last point
      const lastPrice = prices[prices.length - 1]
      if (points.length === 0 || points[points.length - 1].date !== lastPrice.date.slice(0, 7)) {
        if (rateLookup[lastPrice.date]) lastRate = rateLookup[lastPrice.date]
        const curUsd = lastPrice.price_try / lastRate.usd_try
        const curEur = lastPrice.price_try / lastRate.eur_try
        const curGold = lastPrice.price_try / lastRate.gold_try_gram
        points.push({
          date: lastPrice.date.slice(0, 7),
          try: Math.round(((lastPrice.price_try / startPrice) * 100) * 10) / 10,
          usd: Math.round(((curUsd / startUsd) * 100) * 10) / 10,
          eur: Math.round(((curEur / startEur) * 100) * 10) / 10,
          gold: Math.round(((curGold / startGold) * 100) * 10) / 10,
        })
      }

      setData(points)
      setLoading(false)
    }).catch(() => {
      setData([])
      setLoading(false)
    })
  }, [fundCode, period])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 animate-pulse">
        Grafik yükleniyor...
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        Bu dönem için yeterli veri yok
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12 }}
          tickLine={false}
          tickFormatter={(value) => `${value}`}
          domain={['dataMin - 5', 'dataMax + 5']}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
          }}
          formatter={(value: number, name: string) => [
            `${value.toFixed(1)}`,
            name,
          ]}
          labelFormatter={(label) => `Tarih: ${label}`}
        />
        <Legend />
        <Line type="monotone" dataKey="try" name="TL" stroke="#6b7280" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="usd" name="USD" stroke="#10b981" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="eur" name="EUR" stroke="#3b82f6" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="gold" name="Altın" stroke="#f59e0b" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { FUNDS } from '@/lib/data/funds'
import { ComparisonChart, type ChartDataPoint } from '@/components/charts/ComparisonChart'
import { useTefasFilter } from '@/lib/context/TefasFilterContext'
import { TefasToggle } from '@/components/ui/TefasToggle'
import { getFundPrices, getExchangeRates } from '@/lib/api/supabase'
import { calculateBenchmark } from '@/lib/utils/calculations'
import { getLocalDateString } from '@/lib/utils/date'

type Benchmark = 'USD' | 'EUR' | 'GOLD' | 'SP500'

export function ComparisonTool() {
  const [selectedFund, setSelectedFund] = useState('')
  const [benchmark, setBenchmark] = useState<Benchmark>('USD')
  const [startDate, setStartDate] = useState('2024-01-01')
  const [amount, setAmount] = useState('100000')
  const { showOnlyTefas } = useTefasFilter()
  const filteredFunds = showOnlyTefas ? FUNDS.filter((f) => f.is_tefas) : FUNDS

  const [fundFinalValue, setFundFinalValue] = useState<number | null>(null)
  const [benchmarkFinalValue, setBenchmarkFinalValue] = useState<number | null>(null)
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fund = filteredFunds.find((f) => f.code === selectedFund) ?? FUNDS.find((f) => f.code === selectedFund)
  const amountNum = parseFloat(amount) || 0

  const fetchComparison = useCallback(async () => {
    if (!selectedFund || amountNum <= 0) return

    setLoading(true)
    setError('')
    try {
      const endDate = getLocalDateString()
      const [prices, rates] = await Promise.all([
        getFundPrices(selectedFund, startDate, endDate),
        getExchangeRates(startDate, endDate),
      ])

      if (prices.length < 2 || rates.length < 2) {
        setError('Yeterli veri bulunamadı. Tarih aralığını kontrol edin.')
        setLoading(false)
        return
      }

      const startPrice = prices[0].price_try
      const units = amountNum / startPrice

      // Build rate lookup by date for benchmark
      const rateByDate = new Map<string, typeof rates[0]>()
      rates.forEach((r) => rateByDate.set(r.date, r))

      const startRates = rates[0]
      const endRates = rates[rates.length - 1]

      // Build chart data — sample monthly
      const points: ChartDataPoint[] = []
      const seenMonths = new Set<string>()

      for (const p of prices) {
        const month = p.date.substring(0, 7)
        if (seenMonths.has(month)) continue
        seenMonths.add(month)

        const fundValue = units * p.price_try
        // Find closest rate on or before this date
        const rate = rateByDate.get(p.date) || findClosestRate(rates, p.date)
        if (!rate) continue

        const benchType = benchmark === 'SP500' ? 'USD' : benchmark
        const benchValue = calculateBenchmark(
          amountNum,
          benchType,
          { usd_try: startRates.usd_try, eur_try: startRates.eur_try, gold_try_gram: startRates.gold_try_gram },
          { usd_try: rate.usd_try, eur_try: rate.eur_try, gold_try_gram: rate.gold_try_gram },
        )

        points.push({
          date: month,
          fund: Math.round(fundValue),
          benchmark: Math.round(benchValue),
        })
      }

      setChartData(points)

      // Final values
      const endFundValue = units * prices[prices.length - 1].price_try
      setFundFinalValue(Math.round(endFundValue))

      const benchType = benchmark === 'SP500' ? 'USD' : benchmark
      const endBench = calculateBenchmark(
        amountNum,
        benchType,
        { usd_try: startRates.usd_try, eur_try: startRates.eur_try, gold_try_gram: startRates.gold_try_gram },
        { usd_try: endRates.usd_try, eur_try: endRates.eur_try, gold_try_gram: endRates.gold_try_gram },
      )
      setBenchmarkFinalValue(Math.round(endBench))
    } catch {
      setError('Veri çekilemedi. Lütfen daha sonra tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }, [selectedFund, benchmark, startDate, amountNum])

  useEffect(() => {
    if (selectedFund) {
      fetchComparison()
    }
  }, [selectedFund, benchmark, startDate, amountNum, fetchComparison])

  const difference = fundFinalValue !== null && benchmarkFinalValue !== null
    ? fundFinalValue - benchmarkFinalValue
    : null

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="mb-4">
          <TefasToggle />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Fund Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Fon</label>
            <select
              value={selectedFund}
              onChange={(e) => setSelectedFund(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700 bg-white font-medium focus:ring-2 focus:ring-slate-400"
            >
              <option value="">Seçin...</option>
              {filteredFunds.map((f) => (
                <option key={f.code} value={f.code}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Benchmark Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Karşılaştır</label>
            <select
              value={benchmark}
              onChange={(e) => setBenchmark(e.target.value as Benchmark)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700 bg-white font-medium focus:ring-2 focus:ring-slate-400"
            >
              <option value="USD">USD tutmak</option>
              <option value="EUR">EUR tutmak</option>
              <option value="GOLD">Altın tutmak</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Başlangıç</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700 bg-white focus:ring-2 focus:ring-slate-400"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Tutar (TL)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700 bg-white focus:ring-2 focus:ring-slate-400"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {fund && fundFinalValue !== null && benchmarkFinalValue !== null && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-600 mb-1">{fund.name}</p>
              <p className="text-3xl font-bold text-slate-800">
                {fundFinalValue.toLocaleString('tr-TR')} ₺
              </p>
              <p className="text-sm text-slate-500">Bugünkü değer</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-600 mb-1">{benchmark} tutsaydınız</p>
              <p className="text-3xl font-bold text-slate-800">
                {benchmarkFinalValue.toLocaleString('tr-TR')} ₺
              </p>
              <p className="text-sm text-slate-500">Bugünkü değer</p>
            </div>

            <div className={`rounded-xl p-6 shadow-sm ${difference! >= 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
              <p className="text-sm font-medium text-slate-600 mb-1">Fark</p>
              <p className={`text-3xl font-bold ${difference! >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {difference! >= 0 ? '+' : ''}{difference!.toLocaleString('tr-TR')} ₺
              </p>
              <p className="text-sm text-slate-500">
                {difference! >= 0 ? 'Fon daha iyi' : `${benchmark} daha iyi`}
              </p>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Değer Karşılaştırması</h3>
            <div className="h-80">
              <ComparisonChart
                data={chartData}
                benchmark={benchmark}
              />
            </div>
          </div>
        </>
      )}

      {fund && loading && (
        <div className="text-center py-16 text-slate-500 font-medium">
          Hesaplanıyor...
        </div>
      )}

      {!fund && (
        <div className="text-center py-16 text-slate-500 font-medium">
          Karşılaştırma için bir fon seçin / Select a fund to compare
        </div>
      )}
    </div>
  )
}

/** Find the closest exchange rate on or before a given date */
function findClosestRate<T extends { date: string }>(rates: T[], targetDate: string): T | null {
  let closest: T | null = null
  for (const r of rates) {
    if (r.date <= targetDate) closest = r
    else break
  }
  return closest
}

'use client'

import { useState, useEffect } from 'react'
import { useFundLookup } from '@/lib/hooks/useFundLookup'
import { FundSearch } from './FundSearch'
import { ComparisonChart } from '@/components/charts/ComparisonChart'
import { calculateRealReturns, calculateBenchmark } from '@/lib/utils/calculations'
import { getExchangeRates, getSP500Prices } from '@/lib/api/supabase'

type Benchmark = 'USD' | 'EUR' | 'GOLD' | 'SP500'

interface ComparisonResults {
  fundFinalValue: number
  benchmarkFinalValue: number
}

const BENCHMARK_LABELS: Record<Benchmark, string> = {
  USD: 'USD',
  EUR: 'EUR',
  GOLD: 'Altın',
  SP500: 'S&P 500',
}

export function ComparisonTool() {
  const [selectedFund, setSelectedFund] = useState('')
  const [benchmark, setBenchmark] = useState<Benchmark>('USD')
  const [startDate, setStartDate] = useState('2020-01-01')
  const [amount, setAmount] = useState('100000')

  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<ComparisonResults | null>(null)

  const fund = useFundLookup(selectedFund || undefined)

  useEffect(() => {
    if (!fund) {
      setResults(null)
      return
    }

    const amountTry = parseFloat(amount)
    if (!amountTry || amountTry <= 0) {
      setResults(null)
      return
    }

    let cancelled = false
    setLoading(true)

    const endDate = new Date().toISOString().split('T')[0]

    Promise.all([
      calculateRealReturns({
        fundCode: fund.code,
        startDate,
        endDate,
        amountTry,
      }),
      getExchangeRates(startDate, endDate),
      benchmark === 'SP500' ? getSP500Prices(startDate, endDate) : Promise.resolve([]),
    ])
      .then(([realReturns, exchangeRates, sp500Prices]) => {
        if (cancelled) return

        if (exchangeRates.length < 2) {
          setResults(null)
          setLoading(false)
          return
        }

        const startRates = exchangeRates[0]
        const endRates = exchangeRates[exchangeRates.length - 1]

        const sp500Data = benchmark === 'SP500' && sp500Prices.length >= 2
          ? { startPrice: sp500Prices[0].close_usd, endPrice: sp500Prices[sp500Prices.length - 1].close_usd }
          : undefined

        const benchmarkValue = calculateBenchmark(
          amountTry,
          benchmark,
          startRates,
          endRates,
          sp500Data
        )

        setResults({
          fundFinalValue: Math.round(realReturns.endValueTry),
          benchmarkFinalValue: Math.round(benchmarkValue),
        })
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setResults(null)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [fund, benchmark, startDate, amount])

  const fundFinalValue = results?.fundFinalValue ?? 0
  const benchmarkFinalValue = results?.benchmarkFinalValue ?? 0
  const difference = fundFinalValue - benchmarkFinalValue

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Fund Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Fon</label>
            <FundSearch value={selectedFund} onChange={setSelectedFund} placeholder="Fon ara..." />
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
              <option value="SP500">S&P 500 yatırımı</option>
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

      {/* Results */}
      {fund && (
        <>
          {/* Loading */}
          {loading && (
            <div className="text-center py-12 text-slate-500 animate-pulse font-medium">
              Hesaplanıyor...
            </div>
          )}

          {/* Summary Cards */}
          {!loading && results && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-600 mb-1">{fund.name}</p>
                <p className="text-3xl font-bold text-slate-800">
                  {fundFinalValue.toLocaleString('tr-TR')} ₺
                </p>
                <p className="text-sm text-slate-500">Bugünkü değer</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                <p className="text-sm font-medium text-slate-600 mb-1">{BENCHMARK_LABELS[benchmark]} tutsaydınız</p>
                <p className="text-3xl font-bold text-slate-800">
                  {benchmarkFinalValue.toLocaleString('tr-TR')} ₺
                </p>
                <p className="text-sm text-slate-500">Bugünkü değer</p>
              </div>

              <div className={`rounded-xl p-6 shadow-sm ${difference >= 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                <p className="text-sm font-medium text-slate-600 mb-1">Fark</p>
                <p className={`text-3xl font-bold ${difference >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {difference >= 0 ? '+' : ''}{difference.toLocaleString('tr-TR')} ₺
                </p>
                <p className="text-sm text-slate-500">
                  {difference >= 0 ? 'Fon daha iyi' : `${BENCHMARK_LABELS[benchmark]} daha iyi`}
                </p>
              </div>
            </div>
          )}

          {/* Chart */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Değer Karşılaştırması</h3>
            <div className="h-80">
              <ComparisonChart
                fundCode={fund.code}
                benchmark={benchmark}
                startDate={startDate}
                amount={parseFloat(amount) || 100000}
              />
            </div>
          </div>
        </>
      )}

      {!fund && (
        <div className="text-center py-16 text-slate-500 font-medium">
          Karşılaştırma için bir fon seçin / Select a fund to compare
        </div>
      )}
    </div>
  )
}

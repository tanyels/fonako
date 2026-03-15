'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getFundReturns } from '@/lib/api/fundReturnsCache'
import { getAllFundDetails, getInflationForPeriod, type FundDetails } from '@/lib/api/supabase'
import { useFundBatchLookup } from '@/lib/hooks/useFundLookup'
import { PAGE_SIZE } from '@/lib/constants'

type Period = '1M' | '6M' | '1Y' | '2Y' | '3Y' | '5Y' | '10Y'
type SortBy = 'usd' | 'eur' | 'gold' | 'try' | 'sp500' | 'market_cap' | 'investors'
type SortDir = 'desc' | 'asc'
type BenchmarkKey = 'nominal' | 'tuik' | 'enag' | 'fed' | 'konut'

interface Benchmark {
  key: BenchmarkKey
  label: string
  fallbackRate: number
  currency: 'try' | 'usd'
}

const BENCHMARKS: Benchmark[] = [
  { key: 'nominal', label: 'Ham Getiri', fallbackRate: 0, currency: 'try' },
  { key: 'tuik', label: 'TÜİK TL', fallbackRate: 44.4, currency: 'try' },
  { key: 'enag', label: 'ENAG TL', fallbackRate: 72.0, currency: 'try' },
  { key: 'fed', label: 'FED/BEA USD', fallbackRate: 2.8, currency: 'usd' },
  { key: 'konut', label: 'TCMB Konut', fallbackRate: 32.0, currency: 'try' },
]

interface RawReturn {
  code: string
  tryReturn: number
  usdReturn: number
  eurReturn: number
  goldReturn: number
  sp500Return: number
}

const PERIODS: { key: Period; label: string; months: number }[] = [
  { key: '1M', label: '1 Ay', months: 1 },
  { key: '6M', label: '6 Ay', months: 6 },
  { key: '1Y', label: '1 Yıl', months: 12 },
  { key: '2Y', label: '2 Yıl', months: 24 },
  { key: '3Y', label: '3 Yıl', months: 36 },
  { key: '5Y', label: '5 Yıl', months: 60 },
  { key: '10Y', label: '10 Yıl', months: 120 },
]

function realReturn(nominal: number, inflation: number): number {
  return ((1 + nominal / 100) / (1 + inflation / 100) - 1) * 100
}

function formatMarketCap(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B ₺`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}M ₺`
  return `${(value / 1000).toFixed(0)}K ₺`
}

function formatInvestors(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toLocaleString('tr-TR')
}

export function FundLeaderboard() {
  const [rawData, setRawData] = useState<RawReturn[]>([])
  const [detailsMap, setDetailsMap] = useState<Map<string, FundDetails>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [period, setPeriod] = useState<Period>('1Y')
  const [sortBy, setSortBy] = useState<SortBy>('usd')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [category, setCategory] = useState<string>('all')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [benchmark, setBenchmark] = useState<BenchmarkKey>('nominal')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [inflationRate, setInflationRate] = useState<number | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const currentBenchmark = BENCHMARKS.find((b) => b.key === benchmark)!
  const currentPeriod = PERIODS.find((p) => p.key === period)!

  const codes = rawData.map((r) => r.code)
  const nameMap = useFundBatchLookup(codes)

  // Fetch fund details once
  useEffect(() => {
    getAllFundDetails().then((details) => {
      const map = new Map<string, FundDetails>()
      details.forEach((d) => map.set(d.fund_code, d))
      setDetailsMap(map)
    }).catch(() => {})
  }, [])

  // Fetch inflation rate for benchmark
  useEffect(() => {
    if (benchmark === 'nominal') {
      setInflationRate(0)
      return
    }
    let cancelled = false
    getInflationForPeriod(benchmark, currentPeriod.months)
      .then((rate) => { if (!cancelled) setInflationRate(rate) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [benchmark, currentPeriod.months])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(false)
    setVisibleCount(PAGE_SIZE)
    try {
      const returns = await getFundReturns(period, 3000)
      setRawData(returns.map((r) => ({
        code: r.fund_code,
        tryReturn: r.try_return ?? 0,
        usdReturn: r.usd_return ?? 0,
        eurReturn: r.eur_return ?? 0,
        goldReturn: r.gold_return ?? 0,
        sp500Return: r.sp500_return ?? 0,
      })))
    } catch {
      setError(true)
      setRawData([])
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { loadData() }, [loadData])

  function handleSort(col: SortBy) {
    if (sortBy === col) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc')
    } else {
      setSortBy(col)
      setSortDir('desc')
    }
  }

  function getEffectiveRate(): number {
    if (inflationRate !== null) return inflationRate
    const years = currentPeriod.months / 12
    return (Math.pow(1 + currentBenchmark.fallbackRate / 100, years) - 1) * 100
  }

  function getReal(nominal: number): number {
    return realReturn(nominal, getEffectiveRate())
  }

  const isReal = benchmark !== 'nominal'

  const categories = Array.from(
    new Set(rawData.map((r) => nameMap.get(r.code)?.category).filter((c): c is string => !!c))
  ).sort()

  const filtered = category === 'all'
    ? rawData
    : rawData.filter((r) => nameMap.get(r.code)?.category === category)

  const sorted = [...filtered].sort((a, b) => {
    const getVal = (r: RawReturn) => {
      const d = detailsMap.get(r.code)
      switch (sortBy) {
        case 'try': return isReal ? getReal(r.tryReturn) : r.tryReturn
        case 'usd': return isReal ? getReal(r.usdReturn) : r.usdReturn
        case 'eur': return isReal ? getReal(r.eurReturn) : r.eurReturn
        case 'gold': return isReal ? getReal(r.goldReturn) : r.goldReturn
        case 'sp500': return isReal ? getReal(r.sp500Return) : r.sp500Return
        case 'market_cap': return d?.market_cap ?? 0
        case 'investors': return d?.number_of_investors ?? 0
      }
    }
    const diff = getVal(b) - getVal(a)
    return sortDir === 'desc' ? diff : -diff
  })

  const visible = sorted.slice(0, visibleCount)
  const hasMore = visibleCount < sorted.length

  function getBenchmarkDescription(b: Benchmark): string {
    if (b.key === 'nominal') return 'Enflasyon düzeltmesiz ham getiri'
    if (inflationRate !== null && b.key === benchmark) {
      return `${currentPeriod.label} toplam %${inflationRate.toFixed(1)}`
    }
    return `Yıllık %${b.fallbackRate}`
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex rounded-lg border border-slate-300 overflow-hidden">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-2 text-sm font-medium ${
                period === p.key ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Benchmark dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium text-sm hover:bg-slate-50 transition"
          >
            {currentBenchmark.label}
            {isReal && inflationRate !== null && (
              <span className="text-xs text-slate-400">(%{inflationRate.toFixed(1)})</span>
            )}
            <svg className={`w-3.5 h-3.5 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {dropdownOpen && (
            <div className="absolute left-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 min-w-[220px]">
              {BENCHMARKS.map((b) => (
                <button
                  key={b.key}
                  onClick={() => { setBenchmark(b.key); setDropdownOpen(false) }}
                  className={`w-full text-left px-3 py-2.5 hover:bg-slate-100 transition first:rounded-t-lg last:rounded-b-lg ${benchmark === b.key ? 'bg-slate-50 font-semibold' : ''}`}
                >
                  <span className="text-sm font-medium text-slate-800">{b.label}</span>
                  <span className="block text-xs text-slate-400">{getBenchmarkDescription(b)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <select
          value={sortBy}
          onChange={(e) => { setSortBy(e.target.value as SortBy); setSortDir('desc') }}
          className="border border-slate-300 rounded-lg px-3 py-2 text-slate-700 bg-white font-medium text-sm"
        >
          <option value="usd">USD Getirisi</option>
          <option value="eur">EUR Getirisi</option>
          <option value="gold">Altın Getirisi</option>
          <option value="try">TL Getirisi</option>
          <option value="sp500">S&P 500 Getirisi</option>
          <option value="market_cap">Fon Büyüklüğü</option>
          <option value="investors">Yatırımcı Sayısı</option>
        </select>

        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setVisibleCount(PAGE_SIZE) }}
          className="border border-slate-300 rounded-lg px-3 py-2 text-slate-700 bg-white font-medium text-sm"
        >
          <option value="all">Tüm Kategoriler</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto shadow-sm">
        {loading ? (
          <div className="animate-pulse p-4 space-y-1">
            <div className="h-10 bg-slate-50 rounded mb-2" />
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <div key={i} className="flex gap-4 py-2">
                <div className="w-8 h-5 bg-slate-100 rounded" />
                <div className="flex-1 h-5 bg-slate-100 rounded" />
                <div className="w-16 h-5 bg-slate-100 rounded" />
                <div className="w-16 h-5 bg-slate-100 rounded" />
                <div className="w-16 h-5 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-600 mb-3">Veri yüklenirken hata oluştu.</p>
            <button onClick={loadData} className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition text-sm font-medium">
              Tekrar Dene
            </button>
          </div>
        ) : sorted.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            Bu dönem ve kategori için veri bulunamadı.
          </div>
        ) : (
          <>
            <table className="w-full min-w-[900px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">#</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Fon</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Kategori</th>
                  <SortHeader label="TL" col="try" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label="USD" col="usd" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} highlighted />
                  <SortHeader label="EUR" col="eur" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label="Altın" col="gold" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label="S&P 500" col="sp500" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label="Büyüklük" col="market_cap" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label="Yatırımcı" col="investors" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                </tr>
              </thead>
              <tbody>
                {visible.map((r, i) => {
                  const info = nameMap.get(r.code)
                  const details = detailsMap.get(r.code)
                  return (
                    <tr key={r.code} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-500 font-semibold">{i + 1}</td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <p className="font-semibold text-slate-800 truncate">{info?.name || r.code}</p>
                        <p className="text-sm text-slate-500">{r.code}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 font-medium whitespace-nowrap">{info?.category || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <ReturnValue value={isReal ? getReal(r.tryReturn) : r.tryReturn} />
                      </td>
                      <td className="px-4 py-3 text-right bg-slate-50">
                        <ReturnValue value={isReal ? getReal(r.usdReturn) : r.usdReturn} highlight />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ReturnValue value={isReal ? getReal(r.eurReturn) : r.eurReturn} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ReturnValue value={isReal ? getReal(r.goldReturn) : r.goldReturn} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ReturnValue value={isReal ? getReal(r.sp500Return) : r.sp500Return} />
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-slate-600 font-medium whitespace-nowrap">
                        {details?.market_cap ? formatMarketCap(details.market_cap) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-slate-600 font-medium whitespace-nowrap">
                        {details?.number_of_investors ? formatInvestors(details.number_of_investors) : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {hasMore && (
              <div className="p-4 text-center border-t border-slate-100">
                <button
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition text-sm font-medium"
                >
                  Daha fazla göster ({sorted.length - visibleCount} kaldı)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <p className="text-sm text-slate-500 text-center">
        {isReal
          ? `${currentBenchmark.label} enflasyonuna göre reel getiriler — ${currentPeriod.label} dönemi`
          : `Getiriler ${currentPeriod.label} dönemi için hesaplanmıştır.`
        }
      </p>
    </div>
  )
}

function SortHeader({
  label, col, sortBy, sortDir, onSort, highlighted = false,
}: {
  label: string; col: SortBy; sortBy: SortBy; sortDir: SortDir; onSort: (col: SortBy) => void; highlighted?: boolean
}) {
  const active = sortBy === col
  return (
    <th
      className={`text-right px-4 py-3 text-sm font-semibold cursor-pointer select-none transition-colors hover:bg-slate-100 ${
        highlighted ? 'bg-slate-100 text-slate-700' : 'text-slate-600'
      }`}
      onClick={() => onSort(col)}
    >
      <span className="inline-flex items-center justify-end gap-1">
        {label}
        <span className={`text-xs ${active ? 'text-slate-800' : 'text-slate-300'}`}>
          {active ? (sortDir === 'desc' ? '▼' : '▲') : '▼'}
        </span>
      </span>
    </th>
  )
}

function ReturnValue({ value, highlight = false }: { value: number; highlight?: boolean }) {
  const isPositive = value >= 0
  return (
    <span className={`font-semibold ${highlight ? 'text-lg' : ''} ${isPositive ? 'text-profit' : 'text-loss'}`}>
      {isPositive ? '+' : ''}{value.toFixed(1)}%
    </span>
  )
}

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getFundReturns } from '@/lib/api/fundReturnsCache'
import { getAllFundDetails, getInflationForPeriod, type FundDetails } from '@/lib/api/supabase'
import { useFundBatchLookup } from '@/lib/hooks/useFundLookup'
import { PAGE_SIZE } from '@/lib/constants'

type Period = '1M' | '6M' | '1Y' | '2Y' | '3Y' | '5Y' | '10Y'
type SortBy = 'usd' | 'eur' | 'gold' | 'try' | 'sp500' | 'market_cap' | 'investors'
type SortDir = 'desc' | 'asc'
type BenchmarkKey = 'tuik' | 'enag' | 'fed' | 'konut'

interface Benchmark {
  key: BenchmarkKey
  label: string
  description: string
  fallbackRate: number
}

const BENCHMARKS: Benchmark[] = [
  { key: 'tuik', label: 'TÜİK TÜFE', description: 'Resmi enflasyon', fallbackRate: 44.4 },
  { key: 'enag', label: 'ENAG', description: 'Bağımsız enflasyon', fallbackRate: 72.0 },
  { key: 'fed', label: 'ABD CPI', description: 'Dolar enflasyonu', fallbackRate: 2.8 },
  { key: 'konut', label: 'TCMB Konut', description: 'Konut fiyat endeksi', fallbackRate: 32.0 },
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
  const [isReal, setIsReal] = useState(false)
  const [benchmark, setBenchmark] = useState<BenchmarkKey>('tuik')
  const [inflationRate, setInflationRate] = useState<number | null>(null)
  const [benchmarkOpen, setBenchmarkOpen] = useState(false)
  const benchmarkRef = useRef<HTMLDivElement>(null)

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

  // Fetch inflation rate when real mode is on
  useEffect(() => {
    if (!isReal) return
    let cancelled = false
    getInflationForPeriod(benchmark, currentPeriod.months)
      .then((rate) => { if (!cancelled) setInflationRate(rate) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [isReal, benchmark, currentPeriod.months])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (benchmarkRef.current && !benchmarkRef.current.contains(e.target as Node)) {
        setBenchmarkOpen(false)
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

  function getDisplay(nominal: number): number {
    return isReal ? getReal(nominal) : nominal
  }

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
        case 'try': return getDisplay(r.tryReturn)
        case 'usd': return getDisplay(r.usdReturn)
        case 'eur': return getDisplay(r.eurReturn)
        case 'gold': return getDisplay(r.goldReturn)
        case 'sp500': return getDisplay(r.sp500Return)
        case 'market_cap': return d?.market_cap ?? 0
        case 'investors': return d?.number_of_investors ?? 0
      }
    }
    const diff = getVal(b) - getVal(a)
    return sortDir === 'desc' ? diff : -diff
  })

  const visible = sorted.slice(0, visibleCount)
  const hasMore = visibleCount < sorted.length

  return (
    <div className="space-y-5">
      {/* Row 1: Period + Ham/Reel toggle + Benchmark */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Period pills */}
        <div className="flex rounded-lg border border-border-strong overflow-hidden">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-2 text-sm font-medium ${
                period === p.key ? 'bg-heading text-surface' : 'bg-surface text-body hover:bg-surface-inset'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Ham / Reel toggle */}
        <div className="flex rounded-lg border border-border-strong overflow-hidden">
          <button
            onClick={() => setIsReal(false)}
            className={`px-4 py-2 text-sm font-medium ${
              !isReal ? 'bg-heading text-surface' : 'bg-surface text-body hover:bg-surface-inset'
            }`}
          >
            Ham
          </button>
          <button
            onClick={() => setIsReal(true)}
            className={`px-4 py-2 text-sm font-medium ${
              isReal ? 'bg-heading text-surface' : 'bg-surface text-body hover:bg-surface-inset'
            }`}
          >
            Reel
          </button>
        </div>

        {/* Benchmark selector — only visible when Reel */}
        {isReal && (
          <div className="relative" ref={benchmarkRef}>
            <button
              onClick={() => setBenchmarkOpen(!benchmarkOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border-strong bg-surface text-body font-medium text-sm hover:bg-surface-raised transition"
            >
              {currentBenchmark.label}
              {inflationRate !== null && (
                <span className="text-xs text-subtle">%{inflationRate.toFixed(1)}</span>
              )}
              <svg className={`w-3.5 h-3.5 transition-transform ${benchmarkOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {benchmarkOpen && (
              <div className="absolute left-0 top-full mt-1 bg-surface border border-border-default rounded-lg shadow-lg z-20 min-w-[200px]">
                {BENCHMARKS.map((b) => (
                  <button
                    key={b.key}
                    onClick={() => { setBenchmark(b.key); setBenchmarkOpen(false) }}
                    className={`w-full text-left px-3 py-2.5 hover:bg-surface-inset transition first:rounded-t-lg last:rounded-b-lg ${benchmark === b.key ? 'bg-surface-raised font-semibold' : ''}`}
                  >
                    <span className="text-sm font-medium text-heading">{b.label}</span>
                    <span className="block text-xs text-subtle">{b.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Row 2: Sort + Category */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={sortBy}
          onChange={(e) => { setSortBy(e.target.value as SortBy); setSortDir('desc') }}
          className="border border-border-strong rounded-lg px-3 py-2 text-body bg-surface font-medium text-sm"
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
          className="border border-border-strong rounded-lg px-3 py-2 text-body bg-surface font-medium text-sm"
        >
          <option value="all">Tüm Kategoriler</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        {isReal && inflationRate !== null && (
          <span className="text-xs text-subtle">
            {currentBenchmark.label}: {currentPeriod.label} toplam %{inflationRate.toFixed(1)} enflasyon düşülüyor
          </span>
        )}
      </div>

      {/* Table */}
      <div className="bg-surface border border-border-default rounded-xl overflow-x-auto shadow-sm">
        {loading ? (
          <div className="animate-pulse p-4 space-y-1">
            <div className="h-10 bg-surface-raised rounded mb-2" />
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <div key={i} className="flex gap-4 py-2">
                <div className="w-8 h-5 bg-surface-inset rounded" />
                <div className="flex-1 h-5 bg-surface-inset rounded" />
                <div className="w-16 h-5 bg-surface-inset rounded" />
                <div className="w-16 h-5 bg-surface-inset rounded" />
                <div className="w-16 h-5 bg-surface-inset rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-600 mb-3">Veri yüklenirken hata oluştu.</p>
            <button onClick={loadData} className="px-4 py-2 bg-heading text-surface rounded-lg hover:opacity-90 transition text-sm font-medium">
              Tekrar Dene
            </button>
          </div>
        ) : sorted.length === 0 ? (
          <div className="p-8 text-center text-muted">
            Bu dönem ve kategori için veri bulunamadı.
          </div>
        ) : (
          <>
            <table className="w-full min-w-[900px]">
              <thead className="bg-surface-raised border-b border-border-default">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-body w-10">#</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-body">Fon</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-body">Kategori</th>
                  <ColHeader label="TL" col="try" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <ColHeader label="USD" col="usd" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} highlighted />
                  <ColHeader label="EUR" col="eur" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <ColHeader label="Altın" col="gold" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <ColHeader label="S&P 500" col="sp500" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <ColHeader label="Büyüklük" col="market_cap" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  <ColHeader label="Yatırımcı" col="investors" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                </tr>
              </thead>
              <tbody>
                {visible.map((r, i) => {
                  const info = nameMap.get(r.code)
                  const details = detailsMap.get(r.code)
                  return (
                    <tr key={r.code} className="border-b border-border-default hover:bg-surface-raised">
                      <td className="px-4 py-3 text-subtle font-medium text-sm">{i + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-heading text-sm">{r.code}</p>
                        <p className="text-xs text-subtle leading-snug">{info?.name || ''}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-body font-medium whitespace-nowrap">{info?.category || '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <ReturnValue value={getDisplay(r.tryReturn)} />
                      </td>
                      <td className="px-4 py-3 text-right bg-surface-raised">
                        <ReturnValue value={getDisplay(r.usdReturn)} highlight />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ReturnValue value={getDisplay(r.eurReturn)} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ReturnValue value={getDisplay(r.goldReturn)} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ReturnValue value={getDisplay(r.sp500Return)} />
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-body font-medium whitespace-nowrap">
                        {details?.market_cap ? formatMarketCap(details.market_cap) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-body font-medium whitespace-nowrap">
                        {details?.number_of_investors ? formatInvestors(details.number_of_investors) : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {hasMore && (
              <div className="p-4 text-center border-t border-border-default">
                <button
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  className="px-6 py-2 bg-surface-inset text-body rounded-lg hover:bg-surface-inset transition text-sm font-medium"
                >
                  Daha fazla göster ({sorted.length - visibleCount} kaldı)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <p className="text-sm text-muted text-center">
        {isReal
          ? `${currentBenchmark.label} enflasyonuna göre reel getiriler — ${currentPeriod.label} dönemi`
          : `Nominal getiriler — ${currentPeriod.label} dönemi`
        }
      </p>
    </div>
  )
}

function ColHeader({
  label, col, sortBy, sortDir, onSort, highlighted = false,
}: {
  label: string; col: SortBy; sortBy: SortBy; sortDir: SortDir; onSort: (col: SortBy) => void; highlighted?: boolean
}) {
  const active = sortBy === col
  return (
    <th
      className={`text-right px-4 py-3 text-sm font-semibold cursor-pointer select-none transition-colors hover:bg-surface-inset ${
        highlighted ? 'bg-surface-inset text-body' : 'text-body'
      }`}
      onClick={() => onSort(col)}
    >
      <span className="inline-flex items-center justify-end gap-1">
        {label}
        <span className={`text-xs ${active ? 'text-heading' : 'text-slate-300'}`}>
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

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useFundBatchLookup } from '@/lib/hooks/useFundLookup'
import { supabase, getInflationForPeriod } from '@/lib/api/supabase'
import { isBESFund } from '@/lib/constants'

type SortCol = 'try' | 'usd' | 'gold'
type SortDir = 'desc' | 'asc'

type BenchmarkKey = 'nominal' | 'tuik' | 'enag' | 'fed' | 'konut'
type PeriodKey = '1M' | '6M' | '1Y' | '2Y' | '3Y' | '5Y' | '10Y'

interface Benchmark {
  key: BenchmarkKey
  label: string
  fallbackRate: number   // Fallback annual rate if DB has no data
  currency: 'try' | 'usd'
}

const BENCHMARKS: Benchmark[] = [
  { key: 'nominal', label: 'Ham Getiri', fallbackRate: 0, currency: 'try' },
  { key: 'tuik', label: 'TÜİK TL', fallbackRate: 44.4, currency: 'try' },
  { key: 'enag', label: 'ENAG TL', fallbackRate: 72.0, currency: 'try' },
  { key: 'fed', label: 'FED/BEA USD', fallbackRate: 2.8, currency: 'usd' },
  { key: 'konut', label: 'TCMB Konut', fallbackRate: 32.0, currency: 'try' },
]

const PERIODS: { key: PeriodKey; label: string; months: number }[] = [
  { key: '1M', label: '1 ay', months: 1 },
  { key: '6M', label: '6 ay', months: 6 },
  { key: '1Y', label: '1 yıl', months: 12 },
  { key: '2Y', label: '2 yıl', months: 24 },
  { key: '3Y', label: '3 yıl', months: 36 },
  { key: '5Y', label: '5 yıl', months: 60 },
  { key: '10Y', label: '10 yıl', months: 120 },
]

interface RawReturn {
  code: string
  tryReturn: number
  usdReturn: number
  goldReturn: number
}

interface FundReturn {
  code: string
  name: string
  tryReturn: number
  usdReturn: number
  goldReturn: number
}

function realReturn(nominal: number, inflation: number): number {
  return ((1 + nominal / 100) / (1 + inflation / 100) - 1) * 100
}

export function TopFundsTable() {
  const [rawData, setRawData] = useState<RawReturn[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [sortCol, setSortCol] = useState<SortCol>('usd')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [benchmark, setBenchmark] = useState<BenchmarkKey>('nominal')
  const [period, setPeriod] = useState<PeriodKey>('1Y')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [besOnly, setBesOnly] = useState(false)
  const [inflationRate, setInflationRate] = useState<number | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const currentBenchmark = BENCHMARKS.find((b) => b.key === benchmark)!
  const currentPeriod = PERIODS.find((p) => p.key === period)!

  // Batch lookup names for all fund codes
  const codes = rawData.map((r) => r.code)
  const nameMap = useFundBatchLookup(codes)

  // Build display data with names
  const data: FundReturn[] = rawData.map((r) => ({
    ...r,
    name: nameMap.get(r.code)?.name || r.code,
  }))

  // Fetch inflation rate for current benchmark + period
  useEffect(() => {
    if (benchmark === 'nominal') {
      setInflationRate(0)
      return
    }
    let cancelled = false
    async function fetchRate() {
      const rate = await getInflationForPeriod(benchmark, currentPeriod.months)
      if (!cancelled) {
        setInflationRate(rate)
      }
    }
    fetchRate()
    return () => { cancelled = true }
  }, [benchmark, currentPeriod.months])

  // Fetch fund returns for current period
  const loadTopFunds = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const { data: returns } = await supabase
        .from('fund_returns')
        .select('fund_code, try_return, usd_return, gold_return')
        .eq('period', period)
        .order('usd_return', { ascending: false })
        .limit(500)

      if (returns && returns.length > 0) {
        setRawData(returns.map((r) => ({
          code: r.fund_code,
          tryReturn: r.try_return ?? 0,
          usdReturn: r.usd_return ?? 0,
          goldReturn: r.gold_return ?? 0,
        })))
      } else {
        setRawData([])
      }
    } catch {
      setError(true)
      setRawData([])
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    loadTopFunds()
  }, [loadTopFunds])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSort(col: SortCol) {
    if (sortCol === col) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc')
    } else {
      setSortCol(col)
      setSortDir('desc')
    }
  }

  // Get effective inflation rate: live from DB, or scale fallback
  function getEffectiveRate(): number {
    if (inflationRate !== null) return inflationRate
    // Scale annual fallback to the period
    const years = currentPeriod.months / 12
    return (Math.pow(1 + currentBenchmark.fallbackRate / 100, years) - 1) * 100
  }

  function getRealValue(fund: FundReturn, col: SortCol): number {
    const nominal = col === 'try' ? fund.tryReturn : col === 'usd' ? fund.usdReturn : fund.goldReturn
    return realReturn(nominal, getEffectiveRate())
  }

  // Build description string for dropdown
  function getBenchmarkDescription(b: Benchmark): string {
    if (b.key === 'nominal') return 'Enflasyon düzeltmesiz ham getiri'
    if (inflationRate !== null && b.key === benchmark) {
      return `${currentPeriod.label} toplam %${inflationRate.toFixed(1)}`
    }
    return `Yıllık %${b.fallbackRate}`
  }

  const filtered = besOnly
    ? data.filter((f) => isBESFund(f.name))
    : data

  const sorted = [...filtered]
    .sort((a, b) => {
      const diff = getRealValue(b, sortCol) - getRealValue(a, sortCol)
      return sortDir === 'desc' ? diff : -diff
    })
    .slice(0, 10)

  const arrow = (col: SortCol) => {
    if (sortCol !== col) return <span className="text-slate-300 ml-0.5">&#x25BC;</span>
    return <span className="ml-0.5">{sortDir === 'desc' ? '▼' : '▲'}</span>
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-8 bg-surface-inset rounded" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 text-sm mb-3">Veri yüklenirken hata oluştu.</p>
        <button onClick={loadTopFunds} className="px-4 py-2 bg-heading text-surface rounded-lg hover:opacity-90 transition text-sm font-medium" aria-label="Veriyi yeniden yükle">
          Tekrar Dene
        </button>
      </div>
    )
  }

  return (
    <div className="overflow-hidden">
      {/* Title with benchmark dropdown */}
      <h3 className="text-sm font-bold text-heading mb-1 leading-snug">
        <div className="relative inline-block" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-inset hover:bg-surface-inset text-heading font-bold text-sm transition border border-border-default"
            aria-label="Enflasyon göstergesi seç"
            aria-expanded={dropdownOpen}
          >
            {currentBenchmark.label}
            <svg className={`w-3.5 h-3.5 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {dropdownOpen && (
            <div className="absolute left-0 top-full mt-1 bg-surface border border-border-default rounded-lg shadow-lg z-20 min-w-[180px]">
              {BENCHMARKS.map((b) => (
                <button
                  key={b.key}
                  onClick={() => { setBenchmark(b.key); setDropdownOpen(false) }}
                  className={`w-full text-left px-3 py-2 hover:bg-surface-inset transition first:rounded-t-lg last:rounded-b-lg ${benchmark === b.key ? 'bg-surface-raised font-semibold' : ''}`}
                >
                  <span className="text-sm font-medium text-heading">{b.label}</span>
                  <span className="block text-[10px] text-subtle">{getBenchmarkDescription(b)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {benchmark === 'nominal'
          ? ` son ${currentPeriod.label} en çok kazandıranlar`
          : `'${currentBenchmark.currency === 'usd' ? 'e' : 'a'} göre son ${currentPeriod.label} en çok kazandıranlar`}
      </h3>

      {/* Period selector pills */}
      <div className="flex items-center gap-1 mb-2">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-2.5 py-1 text-xs font-medium rounded-full transition ${
              period === p.key
                ? 'bg-heading text-surface'
                : 'bg-surface-inset text-body hover:bg-surface-inset'
            }`}
            aria-label={`${p.label} dönemini seç`}
            aria-pressed={period === p.key}
          >
            {p.label}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-1.5 text-xs text-muted mb-4 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={besOnly}
          onChange={(e) => setBesOnly(e.target.checked)}
          className="rounded border-border-strong text-body focus:ring-slate-500 w-3.5 h-3.5"
          aria-label="Sadece BES fonlarını göster"
        />
        Sadece BES fonları
      </label>

      {/* Effective rate indicator */}
      {inflationRate !== null && benchmark !== 'nominal' && (
        <div className="text-[10px] text-subtle mb-2">
          {currentBenchmark.label}: son {currentPeriod.label} toplam %{inflationRate.toFixed(1)} enflasyon
        </div>
      )}

      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border-default">
            <th className="text-left py-2 px-1 text-xs font-semibold text-muted w-6">#</th>
            <th className="text-left py-2 px-1 text-xs font-semibold text-muted">Fon</th>
            <SortHeader label="TL" col="try" current={sortCol} arrow={arrow} onClick={handleSort} color="text-body" />
            <SortHeader label="Altın" col="gold" current={sortCol} arrow={arrow} onClick={handleSort} color="text-amber-600" />
            <SortHeader label="USD" col="usd" current={sortCol} arrow={arrow} onClick={handleSort} color="text-blue-600" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((fund, i) => (
            <tr
              key={fund.code}
              className="border-b border-border-default hover:bg-surface-raised transition group"
            >
              <td className="py-2 px-1 text-subtle font-medium">{i + 1}</td>
              <td className="py-2 px-1 relative">
                <span className="font-semibold text-heading cursor-default">{fund.code}</span>
                <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block z-10 bg-slate-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
                  {fund.name}
                </div>
              </td>
              <td className="py-2 px-1 text-right">
                <ReturnBadge value={getRealValue(fund, 'try')} bold={sortCol === 'try'} />
              </td>
              <td className="py-2 px-1 text-right">
                <ReturnBadge value={getRealValue(fund, 'gold')} bold={sortCol === 'gold'} />
              </td>
              <td className="py-2 px-1 text-right">
                <ReturnBadge value={getRealValue(fund, 'usd')} bold={sortCol === 'usd'} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SortHeader({
  label,
  col,
  current,
  arrow,
  onClick,
  color,
}: {
  label: string
  col: SortCol
  current: SortCol
  arrow: (col: SortCol) => JSX.Element
  onClick: (col: SortCol) => void
  color: string
}) {
  const active = current === col
  return (
    <th
      className={`text-right py-2 px-1 text-xs font-semibold cursor-pointer select-none hover:bg-surface-inset transition rounded ${active ? color : 'text-muted'}`}
      onClick={() => onClick(col)}
      aria-label={`${label} sütununa göre sırala`}
      role="button"
      tabIndex={0}
    >
      {label}{arrow(col)}
    </th>
  )
}

function ReturnBadge({ value, bold = false }: { value: number; bold?: boolean }) {
  const positive = value >= 0
  return (
    <span className={`${bold ? 'font-bold' : 'font-medium'} ${positive ? 'text-emerald-600' : 'text-red-600'}`}>
      {positive ? '+' : ''}{value.toFixed(1)}%
    </span>
  )
}


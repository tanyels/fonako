'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { getAllFundReturns } from '@/lib/api/fundReturnsCache'
import { useFundBatchLookup } from '@/lib/hooks/useFundLookup'

type Benchmark = 'usd' | 'eur' | 'gold'

const PERIODS = ['1M', '6M', '1Y', '2Y', '5Y'] as const
type PeriodKey = (typeof PERIODS)[number]

const PERIOD_LABELS: Record<PeriodKey, string> = {
  '1M': '1 Ay', '6M': '6 Ay', '1Y': '1 Yıl', '2Y': '2 Yıl', '5Y': '5 Yıl',
}

interface FundReturnRow {
  fund_code: string
  period: string
  usd_return: number | null
  eur_return: number | null
  gold_return: number | null
}

interface CategoryRow {
  category: string
  usd: Record<PeriodKey, number>
  eur: Record<PeriodKey, number>
  gold: Record<PeriodKey, number>
}

function getGrade(value: number): { grade: string; color: string; bgColor: string } {
  if (value >= 20) return { grade: 'A', color: 'text-white', bgColor: 'bg-emerald-500' }
  if (value >= 10) return { grade: 'B', color: 'text-white', bgColor: 'bg-emerald-400' }
  if (value >= 0) return { grade: 'C', color: 'text-white', bgColor: 'bg-amber-400' }
  if (value >= -15) return { grade: 'D', color: 'text-white', bgColor: 'bg-orange-500' }
  return { grade: 'F', color: 'text-white', bgColor: 'bg-red-500' }
}

export function SectorHeatmap() {
  const [benchmark, setBenchmark] = useState<Benchmark>('usd')
  const [showValues, setShowValues] = useState(false)
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [allCodes, setAllCodes] = useState<string[]>([])
  const rawDataRef = useRef<FundReturnRow[]>([])

  const nameMap = useFundBatchLookup(allCodes)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const returns = await getAllFundReturns()
      rawDataRef.current = returns as FundReturnRow[]
      const codes = Array.from(new Set(returns.map((r) => r.fund_code)))
      setAllCodes(codes)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Compute categories from cached data once nameMap is ready
  useEffect(() => {
    if (allCodes.length === 0 || nameMap.size === 0 || rawDataRef.current.length === 0) return

    const returns = rawDataRef.current
    const catMap = new Map<string, Record<PeriodKey, { usdSum: number; eurSum: number; goldSum: number; count: number }>>()

    for (const r of returns) {
      const period = r.period as PeriodKey
      if (!PERIODS.includes(period)) continue

      const info = nameMap.get(r.fund_code)
      const cat = info?.category || 'Diğer'

      if (!catMap.has(cat)) {
        const empty = {} as Record<PeriodKey, { usdSum: number; eurSum: number; goldSum: number; count: number }>
        PERIODS.forEach((p) => { empty[p] = { usdSum: 0, eurSum: 0, goldSum: 0, count: 0 } })
        catMap.set(cat, empty)
      }

      const entry = catMap.get(cat)![period]
      entry.usdSum += r.usd_return ?? 0
      entry.eurSum += r.eur_return ?? 0
      entry.goldSum += r.gold_return ?? 0
      entry.count += 1
    }

    const rows: CategoryRow[] = []
    catMap.forEach((periods, cat) => {
      const usd = {} as Record<PeriodKey, number>
      const eur = {} as Record<PeriodKey, number>
      const gold = {} as Record<PeriodKey, number>
      PERIODS.forEach((p) => {
        const d = periods[p]
        usd[p] = d.count > 0 ? d.usdSum / d.count : 0
        eur[p] = d.count > 0 ? d.eurSum / d.count : 0
        gold[p] = d.count > 0 ? d.goldSum / d.count : 0
      })
      rows.push({ category: cat, usd, eur, gold })
    })

    rows.sort((a, b) => b.usd['1Y'] - a.usd['1Y'])
    setCategories(rows)
  }, [allCodes, nameMap])

  const benchmarkLabel = benchmark === 'usd' ? 'USD' : benchmark === 'eur' ? 'EUR' : 'Altın'
  const bestCategory = categories.length > 0 ? categories.reduce((best, cat) => cat[benchmark]['1Y'] > best[benchmark]['1Y'] ? cat : best) : null
  const worstCategory = categories.length > 0 ? categories.reduce((worst, cat) => cat[benchmark]['1Y'] < worst[benchmark]['1Y'] ? cat : worst) : null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2">
          {(['usd', 'eur', 'gold'] as const).map((b) => (
            <button key={b} onClick={() => setBenchmark(b)} className={`px-4 py-2 rounded-lg font-medium transition ${benchmark === b ? 'bg-heading text-surface' : 'bg-surface-inset text-body hover:bg-surface-inset'}`}>
              {b === 'usd' ? 'USD' : b === 'eur' ? 'EUR' : 'Altın'}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={showValues} onChange={(e) => setShowValues(e.target.checked)} className="w-4 h-4 rounded border-border-strong" />
          <span className="text-sm text-body">Değerleri göster</span>
        </label>
      </div>

      {bestCategory && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <p className="text-emerald-800">
            <span className="font-semibold">En İyi Kategori (1 Yıl):</span>{' '}
            {bestCategory.category} ({bestCategory[benchmark]['1Y'] >= 0 ? '+' : ''}{bestCategory[benchmark]['1Y'].toFixed(1)}% {benchmarkLabel})
          </p>
        </div>
      )}

      <div className="bg-surface border border-border-default rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="animate-pulse p-4">
            <div className="flex gap-4 mb-2">
              <div className="w-32 h-8 bg-surface-inset rounded" />
              {PERIODS.map((p) => <div key={p} className="w-16 h-8 bg-surface-inset rounded" />)}
            </div>
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex gap-4 py-2">
                <div className="w-32 h-10 bg-surface-inset rounded" />
                {PERIODS.map((p) => <div key={p} className="w-16 h-10 bg-surface-inset rounded" />)}
                <div className="w-16 h-10 bg-surface-inset rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-600 mb-3">Veri yüklenirken hata oluştu.</p>
            <button onClick={load} className="px-4 py-2 bg-heading text-surface rounded-lg hover:opacity-90 transition text-sm font-medium">Tekrar Dene</button>
          </div>
        ) : categories.length === 0 ? (
          <div className="p-8 text-center text-muted">Veri bulunamadı.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-raised">
                  <th className="text-left px-4 py-3 text-sm font-semibold text-body sticky left-0 bg-surface-raised whitespace-nowrap min-w-[140px]">Kategori</th>
                  {PERIODS.map((period) => (
                    <th key={period} className="px-4 py-3 text-sm font-semibold text-body text-center min-w-[80px]">{PERIOD_LABELS[period]}</th>
                  ))}
                  <th className="px-4 py-3 text-sm font-semibold text-body text-center">Ort.</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => {
                  const values = PERIODS.map((p) => cat[benchmark][p])
                  const avgReturn = values.reduce((a, b) => a + b, 0) / values.length
                  const avgGrade = getGrade(avgReturn)
                  return (
                    <tr key={cat.category} className="border-t border-border-default">
                      <td className="px-4 py-3 sticky left-0 bg-surface whitespace-nowrap">
                        <p className="font-medium text-heading">{cat.category}</p>
                      </td>
                      {PERIODS.map((period) => {
                        const value = cat[benchmark][period]
                        const { grade, color, bgColor } = getGrade(value)
                        return (
                          <td key={period} className="px-2 py-2 text-center">
                            <div className={`${bgColor} ${color} rounded-lg py-2 px-1 font-bold`}>
                              {showValues ? <span className="text-sm">{value >= 0 ? '+' : ''}{value.toFixed(0)}%</span> : <span className="text-lg">{grade}</span>}
                            </div>
                          </td>
                        )
                      })}
                      <td className="px-2 py-2 text-center">
                        <div className={`${avgGrade.bgColor} ${avgGrade.color} rounded-lg py-2 px-1 font-bold`}>
                          {showValues ? <span className="text-sm">{avgReturn >= 0 ? '+' : ''}{avgReturn.toFixed(0)}%</span> : <span className="text-lg">{avgGrade.grade}</span>}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-4">
        {[
          { grade: 'A', label: '+20% ve üzeri', color: 'bg-emerald-500' },
          { grade: 'B', label: '+10% ile +20%', color: 'bg-emerald-400' },
          { grade: 'C', label: '0% ile +10%', color: 'bg-amber-400' },
          { grade: 'D', label: '-15% ile 0%', color: 'bg-orange-500' },
          { grade: 'F', label: '-15% altı', color: 'bg-red-500' },
        ].map((item) => (
          <div key={item.grade} className="flex items-center gap-2">
            <span className={`w-8 h-8 ${item.color} rounded text-white font-bold flex items-center justify-center`}>{item.grade}</span>
            <span className="text-sm text-body">{item.label}</span>
          </div>
        ))}
      </div>

      {categories.length > 0 && bestCategory && worstCategory && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <h4 className="font-semibold text-emerald-800 mb-2">En İyi Kategori</h4>
            <p className="text-sm text-emerald-700">{bestCategory.category} son 1 yılda ortalama {bestCategory[benchmark]['1Y'] >= 0 ? '+' : ''}{bestCategory[benchmark]['1Y'].toFixed(1)}% {benchmarkLabel} getiri sağladı.</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-semibold text-amber-800 mb-2">Genel Durum</h4>
            <p className="text-sm text-amber-700">{categories.filter((c) => c[benchmark]['1Y'] >= 0).length} / {categories.length} kategori {benchmarkLabel} bazında pozitif getiri elde etti.</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-semibold text-red-800 mb-2">En Kötü Kategori</h4>
            <p className="text-sm text-red-700">{worstCategory.category} son 1 yılda ortalama {worstCategory[benchmark]['1Y'] >= 0 ? '+' : ''}{worstCategory[benchmark]['1Y'].toFixed(1)}% {benchmarkLabel} getiri sağladı.</p>
          </div>
        </div>
      )}
    </div>
  )
}

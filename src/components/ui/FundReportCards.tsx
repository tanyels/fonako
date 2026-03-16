'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/api/supabase'
import { getFundReturns } from '@/lib/api/fundReturnsCache'
import { useFundBatchLookup } from '@/lib/hooks/useFundLookup'
import { PAGE_SIZE } from '@/lib/constants'

type Grade = 'A' | 'B' | 'C' | 'D' | 'F'
type PeriodKey = '1Y' | '2Y' | '5Y'

interface FundGradeData {
  code: string
  usdReturn: number
  grade: Grade
  trend: 'up' | 'down' | 'stable'
}

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: '1Y', label: '1 Yıl' },
  { key: '2Y', label: '2 Yıl' },
  { key: '5Y', label: '5 Yıl' },
]

function computeGrade(usdReturn: number): Grade {
  if (usdReturn >= 20) return 'A'
  if (usdReturn >= 10) return 'B'
  if (usdReturn >= 0) return 'C'
  if (usdReturn >= -15) return 'D'
  return 'F'
}

const GRADE_CONFIG = {
  A: { color: 'bg-emerald-500', textColor: 'text-emerald-700', bgLight: 'bg-emerald-50', label: 'Mükemmel', description: 'USD bazında pozitif getiri, üst %10' },
  B: { color: 'bg-blue-500', textColor: 'text-blue-700', bgLight: 'bg-blue-50', label: 'İyi', description: 'Minimal USD kaybı, üst %25' },
  C: { color: 'bg-amber-500', textColor: 'text-amber-700', bgLight: 'bg-amber-50', label: 'Ortalama', description: 'Tipik USD kaybı, ortalama performans' },
  D: { color: 'bg-orange-500', textColor: 'text-orange-700', bgLight: 'bg-orange-50', label: 'Zayıf', description: 'Önemli USD kaybı, alt %25' },
  F: { color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-50', label: 'Başarısız', description: 'Ciddi USD kaybı, alt %10' },
}

export function FundReportCards() {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>('1Y')
  const [selectedFund, setSelectedFund] = useState<string | null>(null)
  const [funds, setFunds] = useState<FundGradeData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [detailReturns, setDetailReturns] = useState<Record<PeriodKey, { usd: number; sp500: number }>>({
    '1Y': { usd: 0, sp500: 0 },
    '2Y': { usd: 0, sp500: 0 },
    '5Y': { usd: 0, sp500: 0 },
  })

  const codes = funds.map((f) => f.code)
  const nameMap = useFundBatchLookup(codes)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(false)
    setVisibleCount(PAGE_SIZE)
    try {
      const returns = await getFundReturns(selectedPeriod, 100)

      // Fetch trend comparison period
      const trendPeriod = selectedPeriod === '1Y' ? '2Y' : '1Y'
      const trendReturns = await getFundReturns(trendPeriod)
      const trendMap = new Map<string, number>()
      for (const r of trendReturns) {
        trendMap.set(r.fund_code, r.usd_return ?? 0)
      }

      setFunds(returns.map((r) => {
        const usdReturn = r.usd_return ?? 0
        const grade = computeGrade(usdReturn)
        const trendReturn = trendMap.get(r.fund_code)

        let trend: 'up' | 'down' | 'stable' = 'stable'
        if (trendReturn !== undefined) {
          const trendGrade = computeGrade(trendReturn)
          const gradeOrder = { A: 5, B: 4, C: 3, D: 2, F: 1 }
          if (gradeOrder[grade] > gradeOrder[trendGrade]) trend = 'up'
          else if (gradeOrder[grade] < gradeOrder[trendGrade]) trend = 'down'
        }

        return { code: r.fund_code, usdReturn, grade, trend }
      }))
    } catch {
      setError(true)
      setFunds([])
    } finally {
      setLoading(false)
    }
  }, [selectedPeriod])

  useEffect(() => { loadData() }, [loadData])

  // Load detail for selected fund
  useEffect(() => {
    if (!selectedFund) return
    let cancelled = false

    async function loadDetail() {
      const { data } = await supabase
        .from('fund_returns')
        .select('period, usd_return, sp500_return')
        .eq('fund_code', selectedFund)
        .in('period', ['1Y', '2Y', '5Y'])

      if (cancelled || !data) return
      const result: Record<PeriodKey, { usd: number; sp500: number }> = {
        '1Y': { usd: 0, sp500: 0 },
        '2Y': { usd: 0, sp500: 0 },
        '5Y': { usd: 0, sp500: 0 },
      }
      for (const r of data) {
        if (r.period in result) {
          result[r.period as PeriodKey] = {
            usd: r.usd_return ?? 0,
            sp500: r.sp500_return ?? 0,
          }
        }
      }
      setDetailReturns(result)
    }

    loadDetail()
    return () => { cancelled = true }
  }, [selectedFund])

  const selectedFundData = selectedFund ? funds.find((f) => f.code === selectedFund) : null
  const selectedInfo = selectedFund ? nameMap.get(selectedFund) : null
  const visibleFunds = funds.slice(0, visibleCount)
  const hasMore = visibleCount < funds.length

  return (
    <div className="space-y-6">
      {/* Grade Legend */}
      <div className="bg-surface border border-border-default rounded-xl p-4 shadow-sm">
        <h3 className="font-semibold text-heading mb-3">Not Sistemi / Grading System</h3>
        <div className="flex flex-wrap gap-4">
          {Object.entries(GRADE_CONFIG).map(([grade, config]) => (
            <div key={grade} className="flex items-center gap-2">
              <span className={`w-8 h-8 ${config.color} rounded-lg flex items-center justify-center text-white font-bold`}>{grade}</span>
              <div>
                <p className="text-sm font-medium text-body">{config.label}</p>
                <p className="text-xs text-muted">{config.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2">
        {PERIOD_OPTIONS.map((p) => (
          <button
            key={p.key}
            onClick={() => setSelectedPeriod(p.key)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              selectedPeriod === p.key ? 'bg-heading text-surface' : 'bg-surface-inset text-body hover:bg-surface-inset'
            }`}
            aria-label={`${p.label} dönemini seç`}
            aria-pressed={selectedPeriod === p.key}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Report Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl p-4 bg-surface-raised">
              <div className="flex justify-between mb-3">
                <div className="w-12 h-12 bg-surface-inset rounded-xl" />
                <div className="w-4 h-4 bg-surface-inset rounded" />
              </div>
              <div className="h-4 w-24 bg-surface-inset rounded mb-1" />
              <div className="h-3 w-16 bg-surface-inset rounded mb-2" />
              <div className="h-6 w-20 bg-surface-inset rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <p className="text-red-700 mb-3">Veri yüklenirken hata oluştu.</p>
          <button onClick={loadData} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium" aria-label="Veriyi yeniden yükle">
            Tekrar Dene
          </button>
        </div>
      ) : funds.length === 0 ? (
        <div className="text-center text-muted py-8">Bu dönem için veri bulunamadı.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {visibleFunds.map((fund) => {
              const config = GRADE_CONFIG[fund.grade]
              const info = nameMap.get(fund.code)
              return (
                <div
                  key={fund.code}
                  onClick={() => setSelectedFund(fund.code)}
                  className={`${config.bgLight} border-2 ${selectedFund === fund.code ? 'border-slate-400' : 'border-transparent'} rounded-xl p-4 cursor-pointer hover:shadow-md transition`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${info?.name || fund.code} fon detaylarını göster`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className={`w-12 h-12 ${config.color} rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-lg`}>{fund.grade}</span>
                    <span className="text-xs text-muted">
                      {fund.trend === 'up' ? '📈' : fund.trend === 'down' ? '📉' : '➡️'}
                    </span>
                  </div>
                  <h4 className="font-semibold text-heading text-sm mb-1 line-clamp-2">{info?.name || fund.code}</h4>
                  <p className="text-xs text-muted mb-2">{fund.code} · {info?.category || '-'}</p>
                  <p className={`text-lg font-bold ${fund.usdReturn >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {fund.usdReturn >= 0 ? '+' : ''}{fund.usdReturn.toFixed(1)}%
                    <span className="text-xs font-normal text-muted ml-1">USD</span>
                  </p>
                </div>
              )
            })}
          </div>

          {hasMore && (
            <div className="text-center">
              <button
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="px-6 py-2 bg-surface-inset text-body rounded-lg hover:bg-surface-inset transition text-sm font-medium"
                aria-label="Daha fazla fon göster"
              >
                Daha fazla göster ({funds.length - visibleCount} kaldı)
              </button>
            </div>
          )}
        </>
      )}

      {/* Selected Fund Detail */}
      {selectedFundData && (
        <div className="bg-surface border border-border-default rounded-xl p-6 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-heading">{selectedInfo?.name || selectedFundData.code}</h3>
              <p className="text-muted">{selectedFundData.code} · {selectedInfo?.category || '-'}</p>
            </div>
            <button onClick={() => setSelectedFund(null)} className="text-subtle hover:text-body" aria-label="Detayları kapat">✕</button>
          </div>

          <h4 className="font-semibold text-body mb-3">Not Geçmişi / Grade History</h4>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {PERIOD_OPTIONS.map((p) => {
              const { usd: usdReturn, sp500: sp500Return } = detailReturns[p.key]
              const grade = computeGrade(usdReturn)
              const config = GRADE_CONFIG[grade]
              return (
                <div key={p.key} className={`${config.bgLight} rounded-lg p-4 text-center`}>
                  <p className="text-sm text-body mb-2">{p.label}</p>
                  <span className={`inline-block w-10 h-10 ${config.color} rounded-lg text-white text-xl font-bold leading-10`}>{grade}</span>
                  <p className={`text-sm font-semibold mt-2 ${usdReturn >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {usdReturn >= 0 ? '+' : ''}{usdReturn.toFixed(1)}% USD
                  </p>
                  {sp500Return !== 0 && (
                    <p className={`text-xs mt-1 ${sp500Return >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      vs S&P 500: {sp500Return >= 0 ? '+' : ''}{sp500Return.toFixed(1)}%
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          <div className={`p-4 rounded-lg ${GRADE_CONFIG[selectedFundData.grade].bgLight}`}>
            <p className={`font-semibold ${GRADE_CONFIG[selectedFundData.grade].textColor}`}>
              {selectedFundData.grade === 'A' || selectedFundData.grade === 'B'
                ? '✓ Bu fon USD bazında değer koruyor'
                : selectedFundData.grade === 'C'
                ? '⚠️ Bu fon ortalama performans gösteriyor'
                : '✗ Bu fon USD bazında değer kaybettiriyor'}
            </p>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {!loading && funds.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(GRADE_CONFIG).map(([grade, config]) => {
            const count = funds.filter((f) => f.grade === grade).length
            return (
              <div key={grade} className={`${config.bgLight} rounded-lg p-4 text-center`}>
                <span className={`text-3xl font-bold ${config.textColor}`}>{count}</span>
                <p className="text-sm text-body">Fon {grade} notu aldı</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

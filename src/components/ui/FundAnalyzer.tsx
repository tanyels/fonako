'use client'

import { useState, useEffect } from 'react'
import { FUND_CATEGORIES } from '@/lib/data/fund-types'
import { useFundLookup } from '@/lib/hooks/useFundLookup'
import { FundSearch } from './FundSearch'
import { FundDetailsPanel } from './FundDetailsPanel'
import { PerformanceChart } from '@/components/charts/PerformanceChart'
import { SimilarFundsTable } from './SimilarFundsTable'
import { getFundReturn, getLatestAnnualInflation, type FundReturnRow } from '@/lib/api/supabase'
import { FALLBACK_TR_INFLATION, FALLBACK_US_INFLATION } from '@/lib/constants'

const PERIODS = ['1Y', '3Y', '5Y', '10Y'] as const
type Period = (typeof PERIODS)[number]

const PERIOD_YEARS: Record<Period, number> = {
  '1Y': 1,
  '3Y': 3,
  '5Y': 5,
  '10Y': 10,
}

const PERIOD_LABELS: Record<Period, string> = {
  '1Y': '1 Yıl',
  '3Y': '3 Yıl',
  '5Y': '5 Yıl',
  '10Y': '10 Yıl',
}

export function FundAnalyzer() {
  const [selectedFund, setSelectedFund] = useState('')
  const [period, setPeriod] = useState<Period>('1Y')
  const [category, setCategory] = useState<string>('all')
  const [besOnly, setBesOnly] = useState(false)
  const [returns, setReturns] = useState<FundReturnRow | null>(null)
  const [inflation, setInflation] = useState<{ tr: number; us: number } | null>(null)
  const [loading, setLoading] = useState(false)

  // Pick a random fund on mount
  useEffect(() => {
    fetch('/api/funds?random=true&limit=1')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setSelectedFund(data[0].code)
        }
      })
      .catch(() => {})

    // Fetch inflation once (cached in module)
    Promise.all([
      getLatestAnnualInflation('tuik'),
      getLatestAnnualInflation('fed'),
    ]).then(([tr, us]) => {
      setInflation({
        tr: tr ?? FALLBACK_TR_INFLATION,
        us: us ?? FALLBACK_US_INFLATION,
      })
    }).catch(() => {
      setInflation({ tr: FALLBACK_TR_INFLATION, us: FALLBACK_US_INFLATION })
    })
  }, [])

  const fund = useFundLookup(selectedFund || undefined)
  const categoryFilter = category === 'all' ? undefined : category

  useEffect(() => {
    if (!selectedFund) {
      setReturns(null)
      return
    }

    let cancelled = false
    setLoading(true)

    getFundReturn(selectedFund, period)
      .then((data) => { if (!cancelled) setReturns(data) })
      .catch(() => { if (!cancelled) setReturns(null) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [selectedFund, period])

  function handleFundChange(code: string) {
    setSelectedFund(code)
  }

  // Derive real returns from pre-calculated nominal + inflation
  const years = PERIOD_YEARS[period]
  const trInflation = inflation ? (Math.pow(1 + inflation.tr / 100, years) - 1) * 100 : 0
  const usInflation = inflation ? (Math.pow(1 + inflation.us / 100, years) - 1) * 100 : 0

  const tryReturn = returns?.try_return ?? null
  const usdReturn = returns?.usd_return ?? null
  const eurReturn = returns?.eur_return ?? null
  const goldReturn = returns?.gold_return ?? null
  const sp500Return = returns?.sp500_return ?? null

  const tryRealReturn = tryReturn !== null ? ((1 + tryReturn / 100) / (1 + trInflation / 100) - 1) * 100 : null
  const usdRealReturn = usdReturn !== null ? ((1 + usdReturn / 100) / (1 + usInflation / 100) - 1) * 100 : null
  const goldRealReturn = goldReturn !== null ? ((1 + goldReturn / 100) / (1 + trInflation / 100) - 1) * 100 : null

  const usdBetter = usdReturn !== null ? usdReturn < 0 : true
  const hasReturns = returns !== null && tryReturn !== null

  return (
    <div className="space-y-6">
      {/* Search + Period */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="min-w-[280px] flex-1">
          <FundSearch
            value={selectedFund}
            onChange={handleFundChange}
            categoryFilter={categoryFilter}
            besOnly={besOnly}
          />
        </div>

        <div className="flex rounded-lg border border-slate-300 overflow-hidden">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 text-sm font-medium ${
                period === p
                  ? 'bg-slate-800 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => { setCategory('all'); setBesOnly(false) }}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
            category === 'all' && !besOnly
              ? 'bg-slate-800 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Tümü
        </button>
        {FUND_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => { setCategory(cat); setBesOnly(false) }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
              category === cat
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
        <span className="w-px h-5 bg-slate-300 mx-1" />
        <button
          onClick={() => { setBesOnly(!besOnly); setCategory('all') }}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
            besOnly
              ? 'bg-amber-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Sadece BES
        </button>
      </div>

      {/* Fund Info */}
      {fund && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">{fund.name}</h2>
              <p className="text-slate-500 font-medium">{fund.code} · {fund.category}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500 font-medium">Son {PERIOD_LABELS[period]}</p>
            </div>
          </div>

          <FundDetailsPanel fundCode={fund.code} />

          {loading && (
            <div className="text-center py-8 text-slate-400 animate-pulse">
              Yükleniyor...
            </div>
          )}

          {!loading && hasReturns && (
            <>
              {/* Return Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                <ReturnCard label="TL Getiri" value={tryReturn!} sublabel="Nominal" />
                <ReturnCard label="USD Getiri" value={usdReturn!} sublabel="Dolar bazında" highlight />
                {eurReturn !== null && <ReturnCard label="EUR Getiri" value={eurReturn} sublabel="Euro bazında" />}
                {goldReturn !== null && <ReturnCard label="Altın Getiri" value={goldReturn} sublabel="Altın bazında" />}
                {sp500Return !== null && (
                  <ReturnCard label="S&P 500 Getiri" value={sp500Return} sublabel="S&P 500 bazında" />
                )}
              </div>

              {/* Real return cards */}
              {inflation && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                  {tryRealReturn !== null && (
                    <ReturnCard
                      label="TL Reel"
                      value={tryRealReturn}
                      sublabel={`TÜFE %${trInflation.toFixed(0)} düşüldü`}
                    />
                  )}
                  {usdRealReturn !== null && (
                    <ReturnCard
                      label="USD Reel"
                      value={usdRealReturn}
                      sublabel={`ABD CPI %${usInflation.toFixed(0)} düşüldü`}
                    />
                  )}
                  {goldRealReturn !== null && (
                    <ReturnCard
                      label="Altın Reel"
                      value={goldRealReturn}
                      sublabel={`TÜFE %${trInflation.toFixed(0)} düşüldü`}
                    />
                  )}
                </div>
              )}
            </>
          )}

          {!loading && !hasReturns && selectedFund && (
            <div className="text-center py-6 text-slate-400 text-sm">
              Bu dönem için veri bulunamadı.
            </div>
          )}

          {/* Chart */}
          <div className="h-80">
            <PerformanceChart fundCode={fund.code} period={period} />
          </div>

          {/* Verdict */}
          {!loading && hasReturns && usdReturn !== null && (
            <div className={`mt-6 p-4 rounded-lg border ${
              usdBetter
                ? 'bg-red-50 border-red-200'
                : 'bg-emerald-50 border-emerald-200'
            }`}>
              <p className={`font-semibold ${usdBetter ? 'text-red-800' : 'text-emerald-800'}`}>
                {usdBetter
                  ? `Sonuç: Bu fon son ${PERIOD_LABELS[period].toLowerCase()} döneminde USD bazında %${Math.abs(usdReturn).toFixed(1)} değer kaybetti.`
                  : `Sonuç: Bu fon son ${PERIOD_LABELS[period].toLowerCase()} döneminde USD bazında %${usdReturn.toFixed(1)} kazandırdı.`
                }
              </p>
              <p className={`text-sm mt-1 ${usdBetter ? 'text-red-600' : 'text-emerald-600'}`}>
                {usdBetter
                  ? 'Aynı parayı USD olarak tutsaydınız, daha iyi durumda olurdunuz.'
                  : 'Bu fon dolar bazında gerçek bir getiri sağladı.'
                }
              </p>
            </div>
          )}

          {/* Similar Funds */}
          {!loading && hasReturns && (
            <SimilarFundsTable fundCode={selectedFund} />
          )}
        </div>
      )}

      {!fund && !selectedFund && (
        <div className="text-center py-16 text-slate-500 font-medium">
          Analiz için bir fon seçin
        </div>
      )}
    </div>
  )
}

function ReturnCard({
  label,
  value,
  sublabel,
  highlight = false,
}: {
  label: string
  value: number
  sublabel: string
  highlight?: boolean
}) {
  const isPositive = value >= 0

  return (
    <div className={`p-4 rounded-lg ${highlight ? 'bg-slate-100 ring-2 ring-slate-300' : 'bg-slate-50'}`}>
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className={`text-2xl font-bold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
        {isPositive ? '+' : ''}{value.toFixed(1)}%
      </p>
      <p className="text-xs text-slate-500 font-medium">{sublabel}</p>
    </div>
  )
}

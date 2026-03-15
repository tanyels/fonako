'use client'

import { useState, useEffect } from 'react'
import { scoreFunds } from '@/lib/recommend/scoring'
import { useFundBatchLookup } from '@/lib/recommend/types'
import type { RiskLevel, Currency, ScoredFund } from '@/lib/recommend/types'
import { getAllFundReturns } from '@/lib/api/supabase'
import { getCachedFundDetails } from '@/lib/api/fundDetailsCache'
import { FUND_CATEGORIES } from '@/lib/data/funds'

const RISK_LABELS: Record<RiskLevel, string> = {
  low: 'Düşük Risk',
  medium: 'Orta Risk',
  high: 'Yüksek Risk',
}

const SCORE_COLORS: Record<string, string> = {
  returnScore: 'bg-emerald-500',
  consistencyScore: 'bg-blue-500',
  sizeScore: 'bg-purple-500',
  popularityScore: 'bg-amber-500',
  riskPenalty: 'bg-red-400',
}

const SCORE_LABELS: Record<string, string> = {
  returnScore: 'Getiri',
  consistencyScore: 'Tutarlılık',
  sizeScore: 'Büyüklük',
  popularityScore: 'Popülerlik',
  riskPenalty: 'Risk',
}

export function ScoreRecommender() {
  const [risk, setRisk] = useState<RiskLevel>('medium')
  const [currency, setCurrency] = useState<Currency>('USD')
  const [period, setPeriod] = useState('1Y')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [results, setResults] = useState<ScoredFund[]>([])
  const [loading, setLoading] = useState(false)
  const { lookup } = useFundBatchLookup()

  useEffect(() => {
    if (lookup.size === 0) return

    setLoading(true)
    Promise.all([getAllFundReturns(), getCachedFundDetails()])
      .then(([returns, detailMap]) => {
        const fundDetails = new Map<string, { market_cap: number | null; investor_count: number | null }>()
        detailMap.forEach((d, code) => {
          fundDetails.set(code, { market_cap: d.market_cap, investor_count: d.investor_count })
        })

        const fundNames = new Map<string, { name: string; category: string }>()
        lookup.forEach((f, code) => {
          fundNames.set(code, { name: f.name, category: f.category })
        })

        const scored = scoreFunds(
          returns.map((r) => ({
            fund_code: r.fund_code,
            period: r.period,
            try_return: r.try_return,
            usd_return: r.usd_return,
            eur_return: r.eur_return,
            gold_return: r.gold_return,
          })),
          fundDetails,
          risk,
          currency,
          period,
          categoryFilter,
          fundNames,
        )
        setResults(scored)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [risk, currency, period, categoryFilter, lookup])

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Tercihleriniz</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Risk */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Risk Toleransı</label>
            <div className="flex rounded-lg border border-slate-300 overflow-hidden">
              {(['low', 'medium', 'high'] as RiskLevel[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRisk(r)}
                  className={`flex-1 px-3 py-2 text-sm font-medium transition ${
                    risk === r ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {RISK_LABELS[r]}
                </button>
              ))}
            </div>
          </div>

          {/* Currency */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Para Birimi</label>
            <div className="flex rounded-lg border border-slate-300 overflow-hidden">
              {(['TL', 'USD', 'Altın'] as Currency[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`flex-1 px-3 py-2 text-sm font-medium transition ${
                    currency === c ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Period */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Dönem</label>
            <div className="flex rounded-lg border border-slate-300 overflow-hidden">
              {['1Y', '3Y', '5Y', '10Y'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`flex-1 px-3 py-2 text-sm font-medium transition ${
                    period === p ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Kategori</label>
            <select
              value={categoryFilter ?? ''}
              onChange={(e) => setCategoryFilter(e.target.value || null)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700 bg-white font-medium"
            >
              <option value="">Tüm Kategoriler</option>
              {FUND_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="animate-spin w-8 h-8 border-2 border-slate-300 border-t-slate-700 rounded-full mx-auto mb-3" />
            Hesaplanıyor...
          </div>
        ) : results.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            Seçili kriterlere uygun fon bulunamadı. Filtrelerinizi değiştirmeyi deneyin.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">#</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Fon</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Kategori</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-slate-700 bg-slate-100">Skor</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600 min-w-[200px]">Skor Dağılımı</th>
                </tr>
              </thead>
              <tbody>
                {results.map((fund, i) => (
                  <tr key={fund.code} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500 font-semibold">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-semibold text-slate-800">{fund.name}</p>
                        <p className="text-sm text-slate-500">{fund.code}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 font-medium">{fund.category}</td>
                    <td className="px-4 py-3 text-right bg-slate-50">
                      <span className="text-lg font-bold text-slate-800">
                        {fund.totalScore.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex h-4 rounded-full overflow-hidden bg-slate-100">
                        {Object.entries(fund.scores).map(([key, value]) => {
                          const width = Math.max(0, value) / 5 // scale
                          return (
                            <div
                              key={key}
                              className={`${SCORE_COLORS[key]} transition-all`}
                              style={{ width: `${Math.min(width, 100)}%` }}
                              title={`${SCORE_LABELS[key]}: ${value.toFixed(1)}`}
                            />
                          )
                        })}
                      </div>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {Object.entries(fund.scores).map(([key, value]) => (
                          <span key={key} className="text-[10px] text-slate-500">
                            <span className={`inline-block w-2 h-2 rounded-full ${SCORE_COLORS[key]} mr-0.5`} />
                            {SCORE_LABELS[key]} {value.toFixed(0)}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

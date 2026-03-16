'use client'

import { useState, useEffect } from 'react'
import { calculateMacroScores, FACTOR_LABELS, DIRECTION_LABELS } from '@/lib/recommend/macroRules'
import type { MacroDirection, MacroCategoryScore, FundReturn } from '@/lib/recommend/types'
import { useFundBatchLookup } from '@/hooks/useFunds'
import { getFundReturns } from '@/lib/api/supabase'
import { TefasToggle } from '@/components/ui/TefasToggle'

interface MacroInputs {
  inflation: MacroDirection
  usdTry: MacroDirection
  interest: MacroDirection
  bist: MacroDirection
}

export function MacroRecommender() {
  const [inputs, setInputs] = useState<MacroInputs>({
    inflation: 'stable',
    usdTry: 'stable',
    interest: 'stable',
    bist: 'stable',
  })
  const [results, setResults] = useState<MacroCategoryScore[]>([])
  const [allReturns, setAllReturns] = useState<FundReturn[]>([])
  const [topFunds, setTopFunds] = useState<Map<string, FundReturn[]>>(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { lookup } = useFundBatchLookup()

  // Fetch fund returns once on mount
  useEffect(() => {
    setLoading(true)
    setError('')
    getFundReturns('1Y')
      .then(setAllReturns)
      .catch(() => setError('Fon verileri yüklenemedi. Lütfen sayfayı yenileyin.'))
      .finally(() => setLoading(false))
  }, [])

  // Recalculate scores and filter client-side when inputs change
  useEffect(() => {
    const scores = calculateMacroScores(inputs)
    setResults(scores)

    if (allReturns.length === 0) return

    // Explicitly filter returns by TEFAS status via lookup (lookup already respects showOnlyTefas)
    const filteredReturns = allReturns.filter((r) => lookup.has(r.fund_code))

    const byCategory = new Map<string, FundReturn[]>()
    filteredReturns.forEach((r) => {
      const fundInfo = lookup.get(r.fund_code)!
      const cat = fundInfo.category
      const arr = byCategory.get(cat) || []
      arr.push(r)
      byCategory.set(cat, arr)
    })
    // Sort each category by USD return, keep top 5
    byCategory.forEach((funds, cat) => {
      funds.sort((a, b) => (b.usd_return ?? 0) - (a.usd_return ?? 0))
      byCategory.set(cat, funds.slice(0, 5))
    })
    setTopFunds(byCategory)
  }, [inputs, lookup, allReturns])

  const recommended = results.filter((r) => r.score >= 55)
  const avoid = results.filter((r) => r.score < 35)

  return (
    <div className="space-y-8">
      {/* Factor Toggles */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Makro Beklentileriniz</h2>
        <div className="mb-4">
          <TefasToggle />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(Object.keys(FACTOR_LABELS) as (keyof MacroInputs)[]).map((factor) => (
            <div key={factor} className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                {FACTOR_LABELS[factor]}
              </label>
              <div className="flex rounded-lg border border-slate-300 overflow-hidden">
                {(['down', 'stable', 'up'] as MacroDirection[]).map((dir) => (
                  <button
                    key={dir}
                    onClick={() => setInputs((prev) => ({ ...prev, [factor]: dir }))}
                    className={`flex-1 px-3 py-2 text-sm font-medium transition ${
                      inputs[factor] === dir
                        ? dir === 'up'
                          ? 'bg-emerald-600 text-white'
                          : dir === 'down'
                            ? 'bg-red-600 text-white'
                            : 'bg-slate-700 text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {DIRECTION_LABELS[dir]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Category Scores */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Kategori Skorları</h2>
        <div className="space-y-3">
          {results.map((r) => (
            <div key={r.category} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">{r.category}</span>
                <span className={`text-sm font-bold ${
                  r.score >= 65 ? 'text-emerald-600' : r.score < 35 ? 'text-red-600' : 'text-slate-600'
                }`}>
                  {r.score.toFixed(0)}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    r.score >= 65 ? 'bg-emerald-500' : r.score >= 45 ? 'bg-amber-400' : 'bg-red-400'
                  }`}
                  style={{ width: `${r.score}%` }}
                />
              </div>
              {r.reasons.length > 0 && (
                <ul className="text-xs text-slate-500 pl-2">
                  {r.reasons.map((reason, i) => (
                    <li key={i}>• {reason}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recommended Categories & Top Funds */}
      {recommended.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-emerald-800 mb-4">Önerilen Kategoriler</h2>
          {recommended.map((r) => (
            <div key={r.category} className="mb-6 last:mb-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold text-emerald-800">{r.category}</span>
                <span className="text-sm bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                  Skor: {r.score.toFixed(0)}
                </span>
              </div>
              {loading ? (
                <p className="text-sm text-slate-500">Yükleniyor...</p>
              ) : (
                <div className="space-y-1">
                  {(topFunds.get(r.category) || []).map((fund) => {
                    const info = lookup.get(fund.fund_code)
                    return (
                      <div key={fund.fund_code} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 text-sm">
                        <div>
                          <span className="font-medium text-slate-800">{info?.name ?? fund.fund_code}</span>
                          <span className="ml-2 text-slate-500">{fund.fund_code}</span>
                        </div>
                        <span className={`font-semibold ${(fund.usd_return ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {(fund.usd_return ?? 0) >= 0 ? '+' : ''}{(fund.usd_return ?? 0).toFixed(1)}% USD
                        </span>
                      </div>
                    )
                  })}
                  {(topFunds.get(r.category) || []).length === 0 && (
                    <p className="text-sm text-slate-500 italic">Bu kategoride veri bulunamadı</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Avoid Categories */}
      {avoid.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-red-800 mb-3">Kaçınılması Gereken Kategoriler</h2>
          <div className="space-y-2">
            {avoid.map((r) => (
              <div key={r.category} className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-red-800">{r.category}</span>
                  {r.reasons.length > 0 && (
                    <p className="text-xs text-red-600 mt-0.5">{r.reasons[0]}</p>
                  )}
                </div>
                <span className="text-sm bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                  Skor: {r.score.toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

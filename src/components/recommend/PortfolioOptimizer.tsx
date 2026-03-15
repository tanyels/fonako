'use client'

import { useState, useEffect } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { optimizePortfolio } from '@/lib/recommend/portfolio'
import type { PortfolioResult } from '@/lib/recommend/types'
import { getCachedFundDetails } from '@/lib/api/fundDetailsCache'
import { getAllFundReturns } from '@/lib/api/supabase'
import { FUND_CATEGORIES } from '@/lib/data/funds'

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

export function PortfolioOptimizer() {
  const [riskLevel, setRiskLevel] = useState(3)
  const [budget, setBudget] = useState(100000)
  const [maxFunds, setMaxFunds] = useState(5)
  const [excludedCategories, setExcludedCategories] = useState<string[]>([])
  const [result, setResult] = useState<PortfolioResult | null>(null)
  const [loading, setLoading] = useState(false)

  const toggleCategory = (cat: string) => {
    setExcludedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  const optimize = async () => {
    setLoading(true)
    try {
      const [detailMap, returns] = await Promise.all([
        getCachedFundDetails(),
        getAllFundReturns(),
      ])

      const details = Array.from(detailMap.values())
      const output = optimizePortfolio(details, returns, riskLevel, maxFunds, excludedCategories)
      setResult(output)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    optimize()
  }, [riskLevel, maxFunds, excludedCategories])

  const pieData = result?.funds.map((f) => ({
    name: f.code,
    value: f.weight * budget,
    label: `${f.code} (${(f.weight * 100).toFixed(0)}%)`,
  })) ?? []

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Portföy Parametreleri</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Risk Slider */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              Risk Seviyesi: {riskLevel}/5
            </label>
            <input
              type="range"
              min={1}
              max={5}
              value={riskLevel}
              onChange={(e) => setRiskLevel(Number(e.target.value))}
              className="w-full accent-slate-800"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>Muhafazakar</span>
              <span>Agresif</span>
            </div>
          </div>

          {/* Budget */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Toplam Bütçe (₺)</label>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              min={10000}
              step={10000}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700"
            />
          </div>

          {/* Max Funds */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Max Fon Sayısı</label>
            <div className="flex rounded-lg border border-slate-300 overflow-hidden">
              {[3, 4, 5, 6, 7].map((n) => (
                <button
                  key={n}
                  onClick={() => setMaxFunds(n)}
                  className={`flex-1 px-3 py-2 text-sm font-medium transition ${
                    maxFunds === n ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Excluded Categories */}
          <div className="space-y-2 sm:col-span-2 lg:col-span-3">
            <label className="text-sm font-semibold text-slate-700">Hariç Tutulacak Kategoriler</label>
            <div className="flex flex-wrap gap-2">
              {FUND_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                    excludedCategories.includes(cat)
                      ? 'bg-red-100 text-red-700 border border-red-300'
                      : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  {excludedCategories.includes(cat) ? '✕ ' : ''}{cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 shadow-sm">
          <div className="animate-spin w-8 h-8 border-2 border-slate-300 border-t-slate-700 rounded-full mx-auto mb-3" />
          Portföy optimize ediliyor...
        </div>
      )}

      {result && !loading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-center">
              <p className="text-sm text-slate-500">Kombine TL Getiri</p>
              <p className={`text-2xl font-bold ${result.combinedReturnTry >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {result.combinedReturnTry >= 0 ? '+' : ''}{result.combinedReturnTry.toFixed(1)}%
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-center">
              <p className="text-sm text-slate-500">Kombine USD Getiri</p>
              <p className={`text-2xl font-bold ${result.combinedReturnUsd >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {result.combinedReturnUsd >= 0 ? '+' : ''}{result.combinedReturnUsd.toFixed(1)}%
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-center">
              <p className="text-sm text-slate-500">Çeşitlendirme Skoru</p>
              <p className="text-2xl font-bold text-blue-600">{result.diversificationScore.toFixed(0)}/100</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-md font-bold text-slate-800 mb-4">Dağılım</h3>
              {pieData.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ label }) => label}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [`₺${value.toLocaleString('tr-TR')}`, 'Tutar']}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-12">Uygun fon bulunamadı</p>
              )}
            </div>

            {/* Fund Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <h3 className="text-md font-bold text-slate-800 p-4 pb-2">Seçilen Fonlar</h3>
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-slate-600">Fon</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-slate-600">Ağırlık</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-slate-600">Tutar</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-slate-600">USD</th>
                  </tr>
                </thead>
                <tbody>
                  {result.funds.map((f, i) => (
                    <tr key={f.code} className="border-b border-slate-100">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{f.code}</p>
                            <p className="text-xs text-slate-500">{f.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right text-sm font-medium text-slate-700">
                        {(f.weight * 100).toFixed(0)}%
                      </td>
                      <td className="px-4 py-2 text-right text-sm text-slate-600">
                        ₺{(f.weight * budget).toLocaleString('tr-TR')}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <span className={`text-sm font-semibold ${f.returnUsd >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {f.returnUsd >= 0 ? '+' : ''}{f.returnUsd.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Overlap Matrix */}
          {result.funds.length > 1 && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm overflow-x-auto">
              <h3 className="text-md font-bold text-slate-800 mb-4">Çakışma Matrisi</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left text-slate-600"></th>
                    {result.funds.map((f) => (
                      <th key={f.code} className="px-3 py-2 text-center text-slate-600 font-semibold">{f.code}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.funds.map((row) => (
                    <tr key={row.code}>
                      <td className="px-3 py-2 font-semibold text-slate-700">{row.code}</td>
                      {result.funds.map((col) => {
                        if (row.code === col.code) {
                          return <td key={col.code} className="px-3 py-2 text-center bg-slate-100 text-slate-400">—</td>
                        }
                        const overlap = row.overlapScores[col.code] ?? 0
                        const bgColor = overlap > 60 ? 'bg-red-50 text-red-700' : overlap > 30 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                        return (
                          <td key={col.code} className={`px-3 py-2 text-center font-medium ${bgColor}`}>
                            {overlap.toFixed(0)}%
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-slate-500 mt-2">Düşük çakışma = daha iyi çeşitlendirme</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

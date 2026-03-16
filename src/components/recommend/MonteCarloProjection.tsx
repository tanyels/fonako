'use client'

import { useState, useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { runMonteCarlo } from '@/lib/recommend/montecarlo'
import { useFundLookup } from '@/lib/recommend/types'
import type { MonteCarloOutput } from '@/lib/recommend/types'
import { getFundPrices } from '@/lib/api/supabase'
import { TefasToggle } from '@/components/ui/TefasToggle'

function formatCurrency(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`
  return val.toFixed(0)
}

export function MonteCarloProjection() {
  const { funds, loading: fundsLoading } = useFundLookup()
  const [selectedFund, setSelectedFund] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [monthly, setMonthly] = useState(5000)
  const [duration, setDuration] = useState(36)
  const [target, setTarget] = useState<number | null>(null)
  const [result, setResult] = useState<MonteCarloOutput | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const filteredFunds = useMemo(() => {
    if (!searchQuery) return funds.slice(0, 20)
    const q = searchQuery.toLowerCase()
    return funds.filter(
      (f) => f.code.toLowerCase().includes(q) || f.name.toLowerCase().includes(q)
    ).slice(0, 20)
  }, [funds, searchQuery])

  const runSimulation = async () => {
    if (!selectedFund) return
    setLoading(true)
    setError('')

    try {
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const prices = await getFundPrices(selectedFund, startDate, endDate)

      if (prices.length < 30) {
        setError('Yeterli fiyat verisi bulunamadı. En az 30 günlük veri gereklidir.')
        setResult(null)
        return
      }

      const output = runMonteCarlo(prices, monthly, duration, target)
      setResult(output)
    } catch (err) {
      console.error(err)
      setError('Simülasyon sırasında bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  const selectedFundInfo = funds.find((f) => f.code === selectedFund)

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Simülasyon Parametreleri</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* TEFAS Filter */}
          <div className="sm:col-span-2">
            <TefasToggle />
          </div>

          {/* Fund Search */}
          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-semibold text-slate-700">Fon Seçimi</label>
            <input
              type="text"
              placeholder="Fon kodu veya adı ile arayın..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700"
            />
            {searchQuery && (
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                {filteredFunds.map((f) => (
                  <button
                    key={f.code}
                    onClick={() => {
                      setSelectedFund(f.code)
                      setSearchQuery('')
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${
                      selectedFund === f.code ? 'bg-slate-100 font-semibold' : ''
                    }`}
                  >
                    <span className="font-medium text-slate-800">{f.code}</span>
                    <span className="ml-2 text-slate-500">{f.name}</span>
                  </button>
                ))}
                {filteredFunds.length === 0 && (
                  <p className="px-3 py-2 text-sm text-slate-500">Sonuç bulunamadı</p>
                )}
              </div>
            )}
            {selectedFundInfo && !searchQuery && (
              <p className="text-sm text-slate-600">
                Seçili: <span className="font-semibold">{selectedFundInfo.code}</span> — {selectedFundInfo.name}
              </p>
            )}
          </div>

          {/* Monthly Investment */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Aylık Yatırım (₺)</label>
            <input
              type="number"
              value={monthly}
              onChange={(e) => setMonthly(Number(e.target.value))}
              min={100}
              step={500}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700"
            />
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Süre (Ay)</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              min={6}
              max={240}
              step={6}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700"
            />
          </div>

          {/* Target */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Hedef Tutar (₺, opsiyonel)</label>
            <input
              type="number"
              value={target ?? ''}
              onChange={(e) => setTarget(e.target.value ? Number(e.target.value) : null)}
              min={0}
              step={10000}
              placeholder="Boş bırakılabilir"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={runSimulation}
              disabled={loading || !selectedFund || fundsLoading}
              className="w-full bg-slate-800 text-white py-2 px-4 rounded-lg hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Simülasyon Çalışıyor...' : 'Simülasyonu Başlat'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {result && result.paths.length > 0 && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-center">
              <p className="text-sm text-slate-500">Kötü Senaryo (P10)</p>
              <p className="text-2xl font-bold text-red-600">₺{formatCurrency(result.expectedRange.low)}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-center">
              <p className="text-sm text-slate-500">Beklenen (Medyan)</p>
              <p className="text-2xl font-bold text-slate-800">₺{formatCurrency(result.expectedRange.mid)}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-center">
              <p className="text-sm text-slate-500">İyi Senaryo (P90)</p>
              <p className="text-2xl font-bold text-emerald-600">₺{formatCurrency(result.expectedRange.high)}</p>
            </div>
          </div>

          {result.targetProbability !== null && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <p className="text-sm text-amber-700">
                Hedefe (₺{formatCurrency(target!)}) ulaşma olasılığı:
              </p>
              <p className="text-3xl font-bold text-amber-800 mt-1">
                %{result.targetProbability.toFixed(1)}
              </p>
            </div>
          )}

          {/* Fan Chart */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Projeksiyon Grafiği</h2>
            <p className="text-xs text-slate-500 mb-3">
              1000 simülasyonun sonucu — Aylık ort. getiri: %{result.monthlyReturnMean.toFixed(2)}, Std: %{result.monthlyReturnStd.toFixed(2)}
            </p>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={result.paths}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Ay', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => `₺${formatCurrency(v)}`}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `₺${formatCurrency(value)}`,
                      name,
                    ]}
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="p90" name="P90 (İyi)" fill="#d1fae5" stroke="#10b981" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="p75" name="P75" fill="#a7f3d0" stroke="#34d399" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="p50" name="Medyan" fill="#fef3c7" stroke="#f59e0b" strokeWidth={2} fillOpacity={0.4} />
                  <Area type="monotone" dataKey="p25" name="P25" fill="#fed7aa" stroke="#fb923c" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="p10" name="P10 (Kötü)" fill="#fecaca" stroke="#ef4444" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Total Investment vs Result */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Toplam yatırım:</span>
              <span className="font-semibold text-slate-800">₺{formatCurrency(monthly * duration)}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-slate-600">Beklenen değer (medyan):</span>
              <span className={`font-semibold ${result.expectedRange.mid >= monthly * duration ? 'text-emerald-600' : 'text-red-600'}`}>
                ₺{formatCurrency(result.expectedRange.mid)}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

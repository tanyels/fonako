'use client'

import { useState } from 'react'
import { FundSearch } from './FundSearch'
import { calculateRealReturns, type RealReturns } from '@/lib/utils/calculations'

export function QuickCalculator() {
  const [selectedFund, setSelectedFund] = useState('')
  const [startDate, setStartDate] = useState('2020-01-01')
  const [amount, setAmount] = useState('10000')
  const [results, setResults] = useState<RealReturns | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleCalculate() {
    if (!selectedFund || !startDate || !amount) return

    setLoading(true)
    try {
      const returns = await calculateRealReturns({
        fundCode: selectedFund,
        startDate,
        amountTry: parseFloat(amount),
      })
      setResults(returns)
    } catch (error) {
      console.error('Calculation failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-surface border border-border-default rounded-xl p-6 shadow-sm">
      <h2 className="text-xl font-bold text-heading mb-4">Hızlı Hesaplama</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Fund Selection */}
        <div>
          <label className="block text-sm font-medium text-body mb-1">Fon</label>
          <FundSearch value={selectedFund} onChange={setSelectedFund} placeholder="Fon ara..." />
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-sm font-medium text-body mb-1">Başlangıç Tarihi</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full border border-border-strong rounded-lg px-3 py-2 text-heading bg-surface focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
          />
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-body mb-1">Tutar (TL)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border border-border-strong rounded-lg px-3 py-2 text-heading bg-surface focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
            placeholder="10000"
          />
        </div>

        {/* Calculate Button */}
        <div className="flex items-end">
          <button
            onClick={handleCalculate}
            disabled={loading || !selectedFund}
            className="w-full bg-heading text-surface py-2 px-4 rounded-lg hover:opacity-90 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Hesaplanıyor...' : 'Hesapla'}
          </button>
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border-default">
          <ResultCard
            label="TL Getiri"
            value={results.tryReturn}
            sublabel="Nominal"
          />
          <ResultCard
            label="USD Getiri"
            value={results.usdReturn}
            sublabel="Gerçek"
            highlight
          />
          <ResultCard
            label="EUR Getiri"
            value={results.eurReturn}
            sublabel="Gerçek"
          />
          <ResultCard
            label="Altın Getiri"
            value={results.goldReturn}
            sublabel="Gerçek"
          />
        </div>
      )}
    </div>
  )
}

function ResultCard({
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
  const colorClass = isPositive ? 'text-profit' : 'text-loss'

  return (
    <div className={`p-4 rounded-lg ${highlight ? 'bg-surface-inset ring-2 ring-slate-300' : 'bg-surface-raised'}`}>
      <p className="text-sm font-medium text-body">{label}</p>
      <p className={`text-2xl font-bold ${colorClass}`}>
        {isPositive ? '+' : ''}{value.toFixed(1)}%
      </p>
      <p className="text-xs text-muted font-medium">{sublabel}</p>
    </div>
  )
}

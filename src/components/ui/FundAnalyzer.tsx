'use client'

import { useState } from 'react'
import { FUNDS } from '@/lib/data/funds'
import { PerformanceChart } from '@/components/charts/PerformanceChart'
import { useTefasFilter } from '@/lib/context/TefasFilterContext'
import { TefasToggle } from '@/components/ui/TefasToggle'

export function FundAnalyzer() {
  const [selectedFund, setSelectedFund] = useState('')
  const [period, setPeriod] = useState<'1Y' | '3Y' | '5Y' | '10Y'>('1Y')
  const { showOnlyTefas } = useTefasFilter()
  const filteredFunds = showOnlyTefas ? FUNDS.filter((f) => f.is_tefas) : FUNDS

  const fund = filteredFunds.find((f) => f.code === selectedFund) ?? FUNDS.find((f) => f.code === selectedFund)

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center">
        <select
          value={selectedFund}
          onChange={(e) => setSelectedFund(e.target.value)}
          className="border border-slate-300 rounded-lg px-4 py-2 min-w-[250px] text-slate-700 bg-white font-medium focus:ring-2 focus:ring-slate-400"
        >
          <option value="">Fon seçin / Select fund...</option>
          {filteredFunds.map((f) => (
            <option key={f.code} value={f.code}>
              {f.name} ({f.code})
            </option>
          ))}
        </select>

        <div className="flex rounded-lg border border-slate-300 overflow-hidden">
          {(['1Y', '3Y', '5Y', '10Y'] as const).map((p) => (
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

        <TefasToggle />
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
              <p className="text-sm text-slate-500 font-medium">Son {period}</p>
            </div>
          </div>

          {/* Return Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <ReturnCard label="TL Getiri" value={85.4} sublabel="Nominal" />
            <ReturnCard label="USD Getiri" value={-12.3} sublabel="Gerçek" highlight />
            <ReturnCard label="EUR Getiri" value={-8.7} sublabel="Gerçek" />
            <ReturnCard label="Altın Getiri" value={-18.2} sublabel="Gerçek" />
          </div>

          {/* Chart */}
          <div className="h-80">
            <PerformanceChart fundCode={fund.code} period={period} />
          </div>

          {/* Verdict */}
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="font-semibold text-red-800">
              Sonuç: Bu fon {period} döneminde USD bazında değer kaybetti.
            </p>
            <p className="text-sm text-red-600 mt-1">
              Aynı parayı USD olarak tutsaydınız, daha iyi durumda olurdunuz.
            </p>
          </div>
        </div>
      )}

      {!fund && (
        <div className="text-center py-16 text-slate-500 font-medium">
          Analiz için bir fon seçin / Select a fund to analyze
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
      <p className={`text-2xl font-bold ${isPositive ? 'text-profit' : 'text-loss'}`}>
        {isPositive ? '+' : ''}{value.toFixed(1)}%
      </p>
      <p className="text-xs text-slate-500 font-medium">{sublabel}</p>
    </div>
  )
}

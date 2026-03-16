'use client'

import { useState } from 'react'
import { FUNDS } from '@/lib/data/funds'
import { ComparisonChart } from '@/components/charts/ComparisonChart'
import { useTefasFilter } from '@/lib/context/TefasFilterContext'
import { TefasToggle } from '@/components/ui/TefasToggle'

type Benchmark = 'USD' | 'EUR' | 'GOLD' | 'SP500'

export function ComparisonTool() {
  const [selectedFund, setSelectedFund] = useState('')
  const [benchmark, setBenchmark] = useState<Benchmark>('USD')
  const [startDate, setStartDate] = useState('2020-01-01')
  const [amount, setAmount] = useState('100000')
  const { showOnlyTefas } = useTefasFilter()
  const filteredFunds = showOnlyTefas ? FUNDS.filter((f) => f.is_tefas) : FUNDS

  const fund = filteredFunds.find((f) => f.code === selectedFund) ?? FUNDS.find((f) => f.code === selectedFund)

  // Placeholder calculation results
  const fundFinalValue = 185400
  const benchmarkFinalValue = 210000
  const difference = fundFinalValue - benchmarkFinalValue

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="mb-4">
          <TefasToggle />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Fund Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Fon</label>
            <select
              value={selectedFund}
              onChange={(e) => setSelectedFund(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700 bg-white font-medium focus:ring-2 focus:ring-slate-400"
            >
              <option value="">Seçin...</option>
              {filteredFunds.map((f) => (
                <option key={f.code} value={f.code}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Benchmark Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Karşılaştır</label>
            <select
              value={benchmark}
              onChange={(e) => setBenchmark(e.target.value as Benchmark)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700 bg-white font-medium focus:ring-2 focus:ring-slate-400"
            >
              <option value="USD">USD tutmak</option>
              <option value="EUR">EUR tutmak</option>
              <option value="GOLD">Altın tutmak</option>
              <option value="SP500">S&P 500</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Başlangıç</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700 bg-white focus:ring-2 focus:ring-slate-400"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Tutar (TL)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700 bg-white focus:ring-2 focus:ring-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Results */}
      {fund && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-600 mb-1">{fund.name}</p>
              <p className="text-3xl font-bold text-slate-800">
                {fundFinalValue.toLocaleString('tr-TR')} ₺
              </p>
              <p className="text-sm text-slate-500">Bugünkü değer</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-600 mb-1">{benchmark} tutsaydınız</p>
              <p className="text-3xl font-bold text-slate-800">
                {benchmarkFinalValue.toLocaleString('tr-TR')} ₺
              </p>
              <p className="text-sm text-slate-500">Bugünkü değer</p>
            </div>

            <div className={`rounded-xl p-6 shadow-sm ${difference >= 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
              <p className="text-sm font-medium text-slate-600 mb-1">Fark</p>
              <p className={`text-3xl font-bold ${difference >= 0 ? 'text-profit' : 'text-loss'}`}>
                {difference >= 0 ? '+' : ''}{difference.toLocaleString('tr-TR')} ₺
              </p>
              <p className="text-sm text-slate-500">
                {difference >= 0 ? 'Fon daha iyi' : `${benchmark} daha iyi`}
              </p>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Değer Karşılaştırması</h3>
            <div className="h-80">
              <ComparisonChart
                fundCode={fund.code}
                benchmark={benchmark}
                startDate={startDate}
              />
            </div>
          </div>
        </>
      )}

      {!fund && (
        <div className="text-center py-16 text-slate-500 font-medium">
          Karşılaştırma için bir fon seçin / Select a fund to compare
        </div>
      )}
    </div>
  )
}

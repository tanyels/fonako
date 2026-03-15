'use client'

import { useState } from 'react'
import { FundSearch } from '@/components/ui/FundSearch'
import { useFundLookup } from '@/lib/hooks/useFundLookup'
import { calculateDCA } from '@/lib/utils/calculations'

interface CalculationResults {
  totalContribution: number
  governmentMatch: number
  totalInvested: number
  currentValueTL: number
  nominalReturnPercent: number
  usdReturnPercent: number
  months: number
}

export function BESCalculator() {
  const [fundCode, setFundCode] = useState('')
  const [monthlyAmount, setMonthlyAmount] = useState('1000')
  const [startDate, setStartDate] = useState('2020-01')
  const [results, setResults] = useState<CalculationResults | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [calcError, setCalcError] = useState(false)

  const fund = useFundLookup(fundCode || undefined)

  async function handleCalculate() {
    if (!fundCode) return

    setCalculating(true)
    setCalcError(false)
    try {
      const months = getMonthsDifference(startDate)
      const monthly = parseFloat(monthlyAmount) || 1000
      const totalContribution = monthly * months
      const governmentMatch = totalContribution * 0.30
      const totalInvested = totalContribution + governmentMatch

      // Use DCA for accurate monthly purchase calculation
      const monthlyWithMatch = monthly * 1.30 // Include 30% government match per month
      const real = await calculateDCA({
        fundCode,
        startDate: startDate + '-01',
        monthlyAmountTry: monthlyWithMatch,
        months,
      })

      setResults({
        totalContribution,
        governmentMatch,
        totalInvested,
        currentValueTL: real.endValueTry,
        nominalReturnPercent: real.tryReturn,
        usdReturnPercent: real.usdReturn,
        months,
      })
    } catch {
      setCalcError(true)
      setResults(null)
    } finally {
      setCalculating(false)
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Fund Selection */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-600 mb-1">
            BES Fonu / Pension Fund
          </label>
          <FundSearch
            value={fundCode}
            onChange={setFundCode}
            placeholder="BES fonu arayın..."
            besOnly
          />
        </div>

        {/* Monthly Contribution */}
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Aylık Katkı (₺)
          </label>
          <input
            type="number"
            value={monthlyAmount}
            onChange={(e) => setMonthlyAmount(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700"
            placeholder="1000"
            aria-label="Aylık katkı tutarı"
          />
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Başlangıç / Start
          </label>
          <input
            type="month"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700"
            aria-label="Başlangıç tarihi"
          />
        </div>
      </div>

      <button
        onClick={handleCalculate}
        disabled={!fundCode || calculating}
        className="w-full md:w-auto bg-slate-800 text-white py-2 px-6 rounded-lg hover:bg-slate-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="BES getirisi hesapla"
      >
        {calculating ? 'Hesaplanıyor...' : 'Hesapla / Calculate'}
      </button>

      {/* Error State */}
      {calcError && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-red-700 mb-2">Hesaplama yapılırken hata oluştu. Fon verisi bulunamıyor olabilir.</p>
          <button onClick={handleCalculate} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium" aria-label="Hesaplamayı yeniden dene">
            Tekrar Dene
          </button>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="mt-8 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ResultCard
              label="Toplam Katkınız"
              sublabel="Your contributions"
              value={`₺${results.totalContribution.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`}
            />
            <ResultCard
              label="Devlet Katkısı"
              sublabel="Government match (30%)"
              value={`₺${results.governmentMatch.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`}
              highlight="green"
            />
            <ResultCard
              label="TL Getiri"
              sublabel="Nominal return"
              value={`${results.nominalReturnPercent >= 0 ? '+' : ''}${results.nominalReturnPercent.toFixed(1)}%`}
              highlight={results.nominalReturnPercent >= 0 ? 'green' : 'red'}
            />
            <ResultCard
              label="USD Getiri"
              sublabel="Real return"
              value={`${results.usdReturnPercent >= 0 ? '+' : ''}${results.usdReturnPercent.toFixed(1)}%`}
              highlight={results.usdReturnPercent >= 0 ? 'green' : 'red'}
            />
          </div>

          {/* Reality Check */}
          <div className={`${results.usdReturnPercent < 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'} border rounded-lg p-4`}>
            <h4 className={`font-bold mb-2 ${results.usdReturnPercent < 0 ? 'text-red-800' : 'text-emerald-800'}`}>
              Gerçek Durum / Reality Check
            </h4>
            <p className={results.usdReturnPercent < 0 ? 'text-red-700' : 'text-emerald-700'}>
              {results.months} ayda toplam <strong>₺{results.totalInvested.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</strong> yatırdınız
              (₺{results.governmentMatch.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} devlet katkısı dahil).
            </p>
            <p className={`mt-2 ${results.usdReturnPercent < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
              TL bazında <span className={`font-semibold ${results.nominalReturnPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {results.nominalReturnPercent >= 0 ? '+' : ''}{results.nominalReturnPercent.toFixed(1)}%
              </span> {results.nominalReturnPercent >= 0 ? 'kazandınız' : 'kaybettiniz'},
              {' '}USD bazında <span className={`font-semibold ${results.usdReturnPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {results.usdReturnPercent >= 0 ? '+' : ''}{results.usdReturnPercent.toFixed(1)}%
              </span> {results.usdReturnPercent >= 0 ? 'kazandınız' : 'kaybettiniz'}.
            </p>
            {results.usdReturnPercent < 0 && (
              <p className="text-red-800 font-semibold mt-2">
                Devlet katkısı bile gerçek kaybınızı telafi edemedi.
              </p>
            )}
          </div>

          {fund && (
            <p className="text-xs text-slate-500">
              * Hesaplama {fund.name} ({fundCode}) fonu için yapılmıştır. Aylık DCA (düzenli alım) yöntemiyle hesaplanmıştır.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function ResultCard({
  label,
  sublabel,
  value,
  highlight
}: {
  label: string
  sublabel: string
  value: string
  highlight?: 'green' | 'red'
}) {
  const bgClass = highlight === 'green'
    ? 'bg-emerald-50 border-emerald-200'
    : highlight === 'red'
    ? 'bg-red-50 border-red-200'
    : 'bg-slate-50 border-slate-200'

  const valueClass = highlight === 'green'
    ? 'text-emerald-600'
    : highlight === 'red'
    ? 'text-red-600'
    : 'text-slate-800'

  return (
    <div className={`p-4 rounded-lg border ${bgClass}`}>
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="text-xs text-slate-500">{sublabel}</p>
      <p className={`text-2xl font-bold mt-1 ${valueClass}`}>{value}</p>
    </div>
  )
}

function getMonthsDifference(startDate: string): number {
  const start = new Date(startDate + '-01')
  const now = new Date()
  return (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
}

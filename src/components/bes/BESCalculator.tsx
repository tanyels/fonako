'use client'

import { useState } from 'react'
import {
  BES_PROVIDERS,
  BES_CATEGORY_RETURNS,
  getRegularFunds,
  getDevletKatkisiFunds,
  getEstimatedReturn,
  getEstimatedUSDReturn,
} from '@/lib/data/bes-funds'

export function BESCalculator() {
  const [provider, setProvider] = useState('')
  const [anaFon, setAnaFon] = useState('')
  const [devletFon, setDevletFon] = useState('')
  const [monthlyAmount, setMonthlyAmount] = useState('1000')
  const [startDate, setStartDate] = useState('2020-01')
  const [results, setResults] = useState<CalculationResults | null>(null)

  const regularFunds = provider ? getRegularFunds(provider) : []
  const dkFunds = provider ? getDevletKatkisiFunds(provider) : []

  const selectedAnaFon = regularFunds.find(f => f.code === anaFon)
  const selectedDevletFon = dkFunds.find(f => f.code === devletFon)

  function handleCalculate() {
    if (!selectedAnaFon || !selectedDevletFon) return

    const months = getMonthsDifference(startDate)
    const monthly = parseFloat(monthlyAmount)
    const totalContribution = monthly * months
    const governmentMatch = totalContribution * 0.30
    const monthlyGovMatch = monthly * 0.30

    // Use Future Value of Annuity: FV = PMT * ((1+r)^n - 1) / r
    // This correctly models monthly contributions instead of lump-sum
    const anaFonValueTL = futureValueOfAnnuity(monthly, selectedAnaFon.category, months, 'TL')
    const anaFonValueUSD = futureValueOfAnnuity(monthly, selectedAnaFon.category, months, 'USD')
    const devletFonValueTL = futureValueOfAnnuity(monthlyGovMatch, selectedDevletFon.category, months, 'TL')
    const devletFonValueUSD = futureValueOfAnnuity(monthlyGovMatch, selectedDevletFon.category, months, 'USD')

    const anaFonReturnTL = totalContribution > 0 ? (anaFonValueTL / totalContribution - 1) : 0
    const anaFonReturnUSD = totalContribution > 0 ? (anaFonValueUSD / totalContribution - 1) : 0
    const devletFonReturnTL = governmentMatch > 0 ? (devletFonValueTL / governmentMatch - 1) : 0
    const devletFonReturnUSD = governmentMatch > 0 ? (devletFonValueUSD / governmentMatch - 1) : 0

    const totalValueTL = anaFonValueTL + devletFonValueTL
    const totalValueUSD = anaFonValueUSD + devletFonValueUSD
    const totalInvested = totalContribution + governmentMatch

    setResults({
      totalContribution,
      governmentMatch,
      totalInvested,
      months,
      anaFon: {
        label: selectedAnaFon.name,
        category: BES_CATEGORY_RETURNS[selectedAnaFon.category].label,
        valueTL: anaFonValueTL,
        valueUSD: anaFonValueUSD,
        returnTL: anaFonReturnTL * 100,
        returnUSD: anaFonReturnUSD * 100,
      },
      devletFon: {
        label: selectedDevletFon.name,
        category: BES_CATEGORY_RETURNS[selectedDevletFon.category].label,
        valueTL: devletFonValueTL,
        valueUSD: devletFonValueUSD,
        returnTL: devletFonReturnTL * 100,
        returnUSD: devletFonReturnUSD * 100,
      },
      totalValueTL,
      totalValueUSD,
      // ROI based on user's own contribution (not including gov match) to show true leverage benefit
      totalReturnTL: totalContribution > 0 ? ((totalValueTL / totalContribution) - 1) * 100 : 0,
      totalReturnUSD: totalContribution > 0 ? ((totalValueUSD / totalContribution) - 1) * 100 : 0,
    })
  }

  const canCalculate = !!selectedAnaFon && !!selectedDevletFon && parseFloat(monthlyAmount) > 0

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Provider Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            BES Şirketi / Provider
          </label>
          <select
            value={provider}
            onChange={(e) => {
              setProvider(e.target.value)
              setAnaFon('')
              setDevletFon('')
              setResults(null)
            }}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700 bg-white"
          >
            <option value="">Seçin...</option>
            {BES_PROVIDERS.map((p) => (
              <option key={p.code} value={p.code}>{p.name}</option>
            ))}
          </select>
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
          />
        </div>
      </div>

      {/* Dual Fund Selection */}
      {provider && (
        <div className="border-2 border-blue-200 rounded-xl p-5 mb-6 bg-blue-50/30">
          <p className="text-sm text-blue-700 mb-4">
            BES sisteminde kişisel katkılarınız &quot;Ana Fon&quot;a, devletin %30 katkısı ise ayrı bir &quot;Devlet Katkısı Fonu&quot;na yatırılır.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Ana Fon */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Ana Fon (Kişisel Katkı)
              </label>
              <select
                value={anaFon}
                onChange={(e) => setAnaFon(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700 bg-white"
              >
                <option value="">Seçin...</option>
                {regularFunds.map((f) => (
                  <option key={f.code} value={f.code}>
                    {f.name} ({BES_CATEGORY_RETURNS[f.category].label})
                  </option>
                ))}
              </select>
            </div>

            {/* Devlet Katkısı Fonu */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Devlet Katkısı Fonu
              </label>
              <select
                value={devletFon}
                onChange={(e) => setDevletFon(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700 bg-white"
              >
                <option value="">Seçin...</option>
                {dkFunds.map((f) => (
                  <option key={f.code} value={f.code}>
                    {f.name} ({BES_CATEGORY_RETURNS[f.category].label})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={handleCalculate}
        disabled={!canCalculate}
        className={`w-full md:w-auto py-2 px-6 rounded-lg transition font-semibold ${
          canCalculate
            ? 'bg-slate-800 text-white hover:bg-slate-700'
            : 'bg-slate-300 text-slate-500 cursor-not-allowed'
        }`}
      >
        Hesapla / Calculate
      </button>

      {/* Results */}
      {results && (
        <div className="mt-8 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ResultCard
              label="Toplam Katkınız"
              sublabel="Your contributions"
              value={`₺${results.totalContribution.toLocaleString('tr-TR')}`}
            />
            <ResultCard
              label="Devlet Katkısı"
              sublabel="Government match"
              value={`₺${results.governmentMatch.toLocaleString('tr-TR')}`}
              highlight="green"
            />
            <ResultCard
              label="TL Getiri"
              sublabel="Nominal return"
              value={`${results.totalReturnTL >= 0 ? '+' : ''}${results.totalReturnTL.toFixed(1)}%`}
              highlight={results.totalReturnTL >= 0 ? 'green' : 'red'}
            />
            <ResultCard
              label="USD Getiri"
              sublabel="Real return"
              value={`${results.totalReturnUSD >= 0 ? '+' : ''}${results.totalReturnUSD.toFixed(1)}%`}
              highlight={results.totalReturnUSD >= 0 ? 'green' : 'red'}
            />
          </div>

          {/* Dual Fund Breakdown Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Havuz</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">Yatırılan</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">TL Değer</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">TL Getiri</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">USD Getiri</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">Ana Fon</p>
                    <p className="text-xs text-slate-500">{results.anaFon.label} — {results.anaFon.category}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">₺{results.totalContribution.toLocaleString('tr-TR')}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-700">₺{Math.round(results.anaFon.valueTL).toLocaleString('tr-TR')}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={results.anaFon.returnTL >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                      {results.anaFon.returnTL >= 0 ? '+' : ''}{results.anaFon.returnTL.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={results.anaFon.returnUSD >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                      {results.anaFon.returnUSD >= 0 ? '+' : ''}{results.anaFon.returnUSD.toFixed(1)}%
                    </span>
                  </td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">Devlet Katkısı</p>
                    <p className="text-xs text-slate-500">{results.devletFon.label} — {results.devletFon.category}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">₺{results.governmentMatch.toLocaleString('tr-TR')}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-700">₺{Math.round(results.devletFon.valueTL).toLocaleString('tr-TR')}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={results.devletFon.returnTL >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                      {results.devletFon.returnTL >= 0 ? '+' : ''}{results.devletFon.returnTL.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={results.devletFon.returnUSD >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                      {results.devletFon.returnUSD >= 0 ? '+' : ''}{results.devletFon.returnUSD.toFixed(1)}%
                    </span>
                  </td>
                </tr>
                <tr className="bg-slate-50 font-bold">
                  <td className="px-4 py-3 text-slate-800">Toplam</td>
                  <td className="px-4 py-3 text-right text-slate-800">₺{results.totalInvested.toLocaleString('tr-TR')}</td>
                  <td className="px-4 py-3 text-right text-slate-800">₺{Math.round(results.totalValueTL).toLocaleString('tr-TR')}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={results.totalReturnTL >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                      {results.totalReturnTL >= 0 ? '+' : ''}{results.totalReturnTL.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={results.totalReturnUSD >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                      {results.totalReturnUSD >= 0 ? '+' : ''}{results.totalReturnUSD.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Reality Check */}
          <div className={`${results.totalReturnUSD >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'} border rounded-lg p-4`}>
            <h4 className={`font-bold mb-2 ${results.totalReturnUSD >= 0 ? 'text-emerald-800' : 'text-red-800'}`}>
              Gerçek Durum / Reality Check
            </h4>
            <p className={results.totalReturnUSD >= 0 ? 'text-emerald-700' : 'text-red-700'}>
              {results.months} ayda toplam <strong>₺{results.totalInvested.toLocaleString('tr-TR')}</strong> yatırdınız
              (₺{results.governmentMatch.toLocaleString('tr-TR')} devlet katkısı dahil).
            </p>
            <p className={`mt-2 ${results.totalReturnUSD >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              TL bazında <span className={`font-semibold ${results.totalReturnTL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {results.totalReturnTL >= 0 ? '+' : ''}{results.totalReturnTL.toFixed(1)}%
              </span> {results.totalReturnTL >= 0 ? 'kazandınız' : 'kaybettiniz'},
              USD bazında <span className={`font-semibold ${results.totalReturnUSD >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {results.totalReturnUSD >= 0 ? '+' : ''}{results.totalReturnUSD.toFixed(1)}%
              </span> {results.totalReturnUSD >= 0 ? 'kazandınız' : 'kaybettiniz'}.
            </p>
            <p className={`font-semibold mt-2 ${results.totalReturnUSD >= 0 ? 'text-emerald-800' : 'text-red-800'}`}>
              {results.totalReturnUSD >= 0
                ? 'Seçtiğiniz fon kategorisi TL değer kaybını telafi edebildi.'
                : 'Devlet katkısı bile gerçek kaybınızı telafi edemedi.'}
            </p>
          </div>

          {/* Disclaimer */}
          <p className="text-xs text-slate-400 italic">
            Getiriler kategori bazlı tahminidir, gerçek fon performansı farklı olabilir. Yatırım tavsiyesi değildir.
          </p>
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

function futureValueOfAnnuity(
  monthlyPayment: number,
  category: Parameters<typeof getEstimatedReturn>[0],
  months: number,
  type: 'TL' | 'USD'
): number {
  const annualReturn = type === 'TL'
    ? getEstimatedReturn(category, 12)
    : getEstimatedUSDReturn(category, 12)
  const monthlyRate = Math.pow(1 + annualReturn, 1 / 12) - 1

  if (Math.abs(monthlyRate) < 1e-10) {
    return monthlyPayment * months
  }
  return monthlyPayment * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate)
}

interface FundResult {
  label: string
  category: string
  valueTL: number
  valueUSD: number
  returnTL: number
  returnUSD: number
}

interface CalculationResults {
  totalContribution: number
  governmentMatch: number
  totalInvested: number
  months: number
  anaFon: FundResult
  devletFon: FundResult
  totalValueTL: number
  totalValueUSD: number
  totalReturnTL: number
  totalReturnUSD: number
}

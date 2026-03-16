'use client'

import { useState } from 'react'
import { FALLBACK_USD_TRY } from '@/lib/constants'

export function WithdrawalCalculator() {
  const [currentValue, setCurrentValue] = useState('100000')
  const [totalContributed, setTotalContributed] = useState('70000')
  const [yearsInSystem, setYearsInSystem] = useState('5')
  const [expectedUsdLoss, setExpectedUsdLoss] = useState('15')

  const value = parseFloat(currentValue) || 0
  const contributed = parseFloat(totalContributed) || 0
  const years = parseInt(yearsInSystem) || 0
  const annualLoss = parseFloat(expectedUsdLoss) || 0

  // Calculate scenarios
  const results = calculateWithdrawalScenarios(value, contributed, years, annualLoss)

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <p className="text-slate-600 mb-6">
        BES&apos;ten erken çıkış yapmalı mısınız? Cezaları ve devam etmenin maliyetini karşılaştırın.
        <span className="block text-sm text-slate-500 mt-1">
          Should you withdraw from your pension early? Compare penalties vs cost of staying.
        </span>
      </p>

      {/* Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Mevcut Değer (₺)
          </label>
          <input
            type="number"
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Toplam Katkı Payı (₺)
          </label>
          <input
            type="number"
            value={totalContributed}
            onChange={(e) => setTotalContributed(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700"
          />
          <p className="text-xs text-slate-400 mt-0.5">Yatırdığınız toplam tutar (ana para)</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Sistemde Geçen Süre (Yıl)
          </label>
          <input
            type="number"
            value={yearsInSystem}
            onChange={(e) => setYearsInSystem(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700"
            min="0"
            max="30"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Beklenen Yıllık USD Kaybı (%)
          </label>
          <input
            type="number"
            value={expectedUsdLoss}
            onChange={(e) => setExpectedUsdLoss(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700"
            min="0"
            max="50"
          />
        </div>
      </div>

      {/* Penalty Info */}
      <div className="bg-slate-50 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-slate-800 mb-2">Erken Çıkış Cezaları</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className={`p-2 rounded ${years < 3 ? 'bg-red-100 ring-2 ring-red-300' : 'bg-white'}`}>
            <p className="text-slate-600">0-3 yıl</p>
            <p className="font-bold text-red-600">%15 vergi + devlet katkısı iadesi</p>
          </div>
          <div className={`p-2 rounded ${years >= 3 && years < 6 ? 'bg-amber-100 ring-2 ring-amber-300' : 'bg-white'}`}>
            <p className="text-slate-600">3-6 yıl</p>
            <p className="font-bold text-amber-600">%10 vergi + kısmi iade</p>
          </div>
          <div className={`p-2 rounded ${years >= 6 && years < 10 ? 'bg-yellow-100 ring-2 ring-yellow-300' : 'bg-white'}`}>
            <p className="text-slate-600">6-10 yıl</p>
            <p className="font-bold text-yellow-600">%5 vergi</p>
          </div>
          <div className={`p-2 rounded ${years >= 10 ? 'bg-emerald-100 ring-2 ring-emerald-300' : 'bg-white'}`}>
            <p className="text-slate-600">10+ yıl (56 yaş)</p>
            <p className="font-bold text-emerald-600">Cezasız çıkış</p>
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Senaryo</th>
              <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">Şimdi</th>
              <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">1 Yıl Sonra</th>
              <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">3 Yıl Sonra</th>
              <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">5 Yıl Sonra</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="px-4 py-3">
                <p className="font-medium text-slate-800">Çık + USD&apos;ye Çevir</p>
                <p className="text-xs text-slate-500">Ceza öde, kalanı USD tut</p>
              </td>
              {results.withdrawNow.map((v, i) => (
                <td key={i} className="px-4 py-3 text-right font-semibold text-slate-700">
                  ${v.toLocaleString('en-US')}
                </td>
              ))}
            </tr>
            <tr className="border-b border-slate-100 bg-slate-50">
              <td className="px-4 py-3">
                <p className="font-medium text-slate-800">BES&apos;te Kal</p>
                <p className="text-xs text-slate-500">Mevcut fonlarda devam</p>
              </td>
              {results.stayInBES.map((v, i) => (
                <td key={i} className="px-4 py-3 text-right font-semibold text-slate-700">
                  ${v.toLocaleString('en-US')}
                </td>
              ))}
            </tr>
            <tr className="border-b border-slate-100">
              <td className="px-4 py-3">
                <p className="font-medium text-slate-800">Fark</p>
                <p className="text-xs text-slate-500">Çıkış avantajı</p>
              </td>
              {results.difference.map((v, i) => (
                <td key={i} className={`px-4 py-3 text-right font-bold ${v >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {v >= 0 ? '+' : ''}${v.toLocaleString('en-US')}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Recommendation */}
      <div className={`mt-6 p-4 rounded-lg ${results.recommendation === 'withdraw' ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
        <h4 className={`font-bold ${results.recommendation === 'withdraw' ? 'text-emerald-800' : 'text-amber-800'}`}>
          {results.recommendation === 'withdraw' ? '✓ Öneri: Erken Çıkış Düşünülebilir' : '⚠️ Öneri: Beklemek Daha Mantıklı'}
        </h4>
        <p className={`text-sm mt-1 ${results.recommendation === 'withdraw' ? 'text-emerald-700' : 'text-amber-700'}`}>
          {results.recommendation === 'withdraw'
            ? `Ceza ödemenize rağmen, ${results.breakEvenYears} yıl içinde başa baş noktasına ulaşırsınız. Uzun vadede çıkış daha avantajlı görünüyor.`
            : `Ceza maliyeti yüksek. ${10 - years} yıl daha bekleyip cezasız çıkış hakkı kazanmanız önerilir.`
          }
        </p>
      </div>
    </div>
  )
}

interface WithdrawalResults {
  withdrawNow: number[]
  stayInBES: number[]
  difference: number[]
  recommendation: 'withdraw' | 'stay'
  breakEvenYears: number
}

function calculateWithdrawalScenarios(currentValue: number, totalContributed: number, yearsInSystem: number, annualLossPercent: number): WithdrawalResults {
  const usdRate = FALLBACK_USD_TRY

  // Calculate penalty based on years in system
  let penaltyRate = 0.15 // Stopaj (withholding tax) rate
  let govMatchReturn = 0 // Lose all government match
  if (yearsInSystem >= 10) {
    penaltyRate = 0
    govMatchReturn = 1
  } else if (yearsInSystem >= 6) {
    penaltyRate = 0.05
    govMatchReturn = 0.5
  } else if (yearsInSystem >= 3) {
    penaltyRate = 0.10
    govMatchReturn = 0.25
  }

  // Tax (stopaj) applies only to profit, not the entire value
  const profit = Math.max(0, currentValue - totalContributed)
  const taxAmount = profit * penaltyRate
  // Government match is ~15% of total value; forfeit based on years
  const govMatchPortion = currentValue * 0.15
  const govMatchLoss = govMatchPortion * (1 - govMatchReturn)
  const afterPenalty = currentValue - taxAmount - govMatchLoss
  const afterPenaltyUSD = afterPenalty / usdRate

  // Project forward
  const years = [0, 1, 3, 5]
  const withdrawNow: number[] = []
  const stayInBES: number[] = []

  years.forEach(y => {
    // If withdrew, USD value stays same (assuming holding USD)
    withdrawNow.push(Math.round(afterPenaltyUSD))

    // If stayed, lose value annually
    const besValueUSD = (currentValue / usdRate) * Math.pow(1 - annualLossPercent / 100, y)
    stayInBES.push(Math.round(besValueUSD))
  })

  const difference = withdrawNow.map((w, i) => w - stayInBES[i])

  // Find break-even point
  let breakEvenYears = 0
  for (let y = 0; y <= 10; y++) {
    const besValue = (currentValue / usdRate) * Math.pow(1 - annualLossPercent / 100, y)
    if (afterPenaltyUSD >= besValue) {
      breakEvenYears = y
      break
    }
  }

  const recommendation = breakEvenYears <= 3 ? 'withdraw' : 'stay'

  return {
    withdrawNow,
    stayInBES,
    difference,
    recommendation,
    breakEvenYears,
  }
}

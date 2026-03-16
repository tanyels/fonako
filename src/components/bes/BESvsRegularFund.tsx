'use client'

import { useState } from 'react'

interface ComparisonData {
  besFund: { name: string; code: string; tryReturn: number; usdReturn: number; fee: number }
  regularFund: { name: string; code: string; tryReturn: number; usdReturn: number; fee: number }
}

const COMPARISON_DATA: ComparisonData[] = [
  {
    besFund: { name: 'Anadolu Hayat Hisse BES', code: 'AHH', tryReturn: 58, usdReturn: -12, fee: 2.1 },
    regularFund: { name: 'İş Portföy BIST 30', code: 'AFA', tryReturn: 62, usdReturn: -8, fee: 1.2 },
  },
  {
    besFund: { name: 'Garanti Emeklilik Altın BES', code: 'GEA', tryReturn: 85, usdReturn: 15, fee: 1.8 },
    regularFund: { name: 'Yapı Kredi Altın Fonu', code: 'TYH', tryReturn: 92, usdReturn: 22, fee: 0.9 },
  },
  {
    besFund: { name: 'Allianz Yaşam Dengeli BES', code: 'AYD', tryReturn: 42, usdReturn: -22, fee: 2.3 },
    regularFund: { name: 'Ak Portföy Dengeli', code: 'AKD', tryReturn: 48, usdReturn: -18, fee: 1.4 },
  },
]

export function BESvsRegularFund() {
  const [selectedComparison, setSelectedComparison] = useState(0)
  const comparison = COMPARISON_DATA[selectedComparison]

  const feeDifference = comparison.besFund.fee - comparison.regularFund.fee
  const returnDifference = comparison.regularFund.usdReturn - comparison.besFund.usdReturn

  return (
    <div className="bg-surface border border-border-default rounded-xl p-6 shadow-sm">
      <p className="text-body mb-6">
        BES fonları genellikle daha yüksek ücretler alır. Benzer normal fonlarla karşılaştırın.
        <span className="block text-sm text-muted mt-1">
          BES funds typically charge higher fees. Compare with similar regular funds.
        </span>
      </p>

      {/* Comparison Selector */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {COMPARISON_DATA.map((c, i) => (
          <button
            key={i}
            onClick={() => setSelectedComparison(i)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
              selectedComparison === i
                ? 'bg-heading text-surface'
                : 'bg-surface-inset text-body hover:bg-surface-inset'
            }`}
          >
            {c.besFund.name.split(' ')[2] || 'Karşılaştırma ' + (i + 1)}
          </button>
        ))}
      </div>

      {/* Comparison Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* BES Fund */}
        <div className="border border-border-default rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-1 rounded">BES</span>
            <h4 className="font-semibold text-heading">{comparison.besFund.name}</h4>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-body">TL Getiri (1Y)</span>
              <span className="font-semibold text-emerald-600">+{comparison.besFund.tryReturn}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-body">USD Getiri (1Y)</span>
              <span className={`font-semibold ${comparison.besFund.usdReturn >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {comparison.besFund.usdReturn >= 0 ? '+' : ''}{comparison.besFund.usdReturn}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-body">Yönetim Ücreti</span>
              <span className="font-semibold text-body">{comparison.besFund.fee}%</span>
            </div>
          </div>
        </div>

        {/* Regular Fund */}
        <div className="border border-emerald-200 bg-emerald-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2 py-1 rounded">Normal Fon</span>
            <h4 className="font-semibold text-heading">{comparison.regularFund.name}</h4>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-body">TL Getiri (1Y)</span>
              <span className="font-semibold text-emerald-600">+{comparison.regularFund.tryReturn}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-body">USD Getiri (1Y)</span>
              <span className={`font-semibold ${comparison.regularFund.usdReturn >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {comparison.regularFund.usdReturn >= 0 ? '+' : ''}{comparison.regularFund.usdReturn}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-body">Yönetim Ücreti</span>
              <span className="font-semibold text-emerald-600">{comparison.regularFund.fee}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Verdict */}
      <div className="bg-surface-inset rounded-lg p-4">
        <h4 className="font-semibold text-heading mb-2">Karşılaştırma Sonucu</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-body">Ücret Farkı:</p>
            <p className="font-semibold text-red-600">
              BES fonu yılda %{feeDifference.toFixed(1)} daha fazla ücret alıyor
            </p>
          </div>
          <div>
            <p className="text-body">Getiri Farkı (USD):</p>
            <p className="font-semibold text-emerald-600">
              Normal fon %{returnDifference.toFixed(1)} daha iyi performans gösterdi
            </p>
          </div>
        </div>

        <p className="text-body mt-4 text-sm">
          💡 <strong>Not:</strong> BES&apos;in %30 devlet katkısı avantajını hesaba katın. Ancak uzun vadede yüksek ücretler
          bu avantajı eritebilir.
        </p>
      </div>
    </div>
  )
}

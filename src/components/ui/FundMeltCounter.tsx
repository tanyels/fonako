'use client'

import { useState, useEffect, useRef } from 'react'
import { FundSearch } from './FundSearch'

function fmtTL(v: number) {
  return v.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' ₺'
}
function fmtUSD(v: number) {
  return '$' + v.toLocaleString('tr-TR', { maximumFractionDigits: 0 })
}
function fmtGold(v: number) {
  return v.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' gr'
}
function fmtDiff(v: number, fmt: (n: number) => string) {
  const abs = Math.abs(v)
  return v >= 0 ? '+' + fmt(abs) : '-' + fmt(abs)
}

interface Props {
  startTL: number
  endTL: number
  tlReturn: number
  startUSD: number
  endUSD: number
  usdReturn: number
  startGold: number
  endGold: number
  goldReturn: number
  selectedFund: string
  fundName?: string
  onFundChange?: (code: string) => void
  onAmountChange?: (amount: number) => void
}

export function FundMeltCounter({
  startTL,
  endTL,
  tlReturn,
  startUSD,
  endUSD,
  usdReturn,
  startGold,
  endGold,
  goldReturn,
  selectedFund,
  fundName,
  onFundChange,
  onAmountChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    setIsVisible(false)
    const timer = setTimeout(() => setIsVisible(true), 50)
    return () => clearTimeout(timer)
  }, [endTL, endUSD, endGold])

  const tlProfit = endTL - startTL
  const usdProfit = endUSD - startUSD
  const goldProfit = endGold - startGold

  return (
    <div ref={containerRef}>
      <h3 className="text-lg font-bold text-heading mb-1">Gerçek Sonuç</h3>

      {/* Inline sentence: "Tam 1 yıl önce [FON] fonuna [10.000] ₺ yatırdınız." */}
      <div className="flex items-baseline gap-1.5 mb-4 flex-wrap text-sm text-body font-medium">
        <span>Tam 1 yıl önce</span>
        <div className="inline-block min-w-[200px]">
          <FundSearch
            value={selectedFund}
            onChange={(code) => onFundChange?.(code)}
            placeholder="Fon seçin..."
          />
        </div>
        <span>fonuna</span>
        <input
          type="number"
          defaultValue={startTL}
          min={100}
          step={1000}
          onBlur={(e) => {
            const val = parseInt(e.target.value) || 10000
            onAmountChange?.(val)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const val = parseInt((e.target as HTMLInputElement).value) || 10000
              onAmountChange?.(val)
            }
          }}
          className="w-28 border border-border-strong rounded px-2 py-0.5 text-sm font-bold text-heading bg-surface focus:ring-2 focus:ring-slate-400 focus:border-slate-400 text-center"
        />
        <span>₺ yatırdınız.</span>
      </div>

      {/* Comparison table */}
      <div
        className="border border-border-default rounded-lg overflow-hidden transition-all duration-500"
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(10px)',
        }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-inset text-body">
              <th className="text-left px-3 py-2 font-semibold">Birim</th>
              <th className="text-right px-3 py-2 font-semibold">Başlangıç</th>
              <th className="text-right px-3 py-2 font-semibold">Bugün</th>
              <th className="text-right px-3 py-2 font-semibold">Fark</th>
              <th className="text-center px-3 py-2 font-semibold">Durum</th>
            </tr>
          </thead>
          <tbody>
            {([
              { label: 'TL ₺', start: fmtTL(startTL), end: fmtTL(endTL), diff: fmtDiff(tlProfit, fmtTL), profit: tlProfit },
              { label: 'Altın', start: fmtGold(startGold), end: fmtGold(endGold), diff: fmtDiff(goldProfit, fmtGold), profit: goldProfit },
              { label: 'Dolar', start: fmtUSD(startUSD), end: fmtUSD(endUSD), diff: fmtDiff(usdProfit, fmtUSD), profit: usdProfit },
            ] as const).map((row) => (
              <tr
                key={row.label}
                className={row.profit >= 0 ? 'bg-emerald-50' : 'bg-red-50'}
              >
                <td className="px-3 py-2 font-medium text-body">{row.label}</td>
                <td className="px-3 py-2 text-right text-body">{row.start}</td>
                <td className="px-3 py-2 text-right font-semibold text-heading">{row.end}</td>
                <td className={`px-3 py-2 text-right font-bold ${row.profit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {row.diff}
                </td>
                <td className="px-3 py-2 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                    row.profit >= 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {row.profit >= 0 ? '✓ Kazanç' : '✗ Kayıp'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

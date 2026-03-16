'use client'

import { useState, useEffect, useRef } from 'react'
import { FUNDS } from '@/lib/data/funds'
import { calculateRealReturns, type RealReturns } from '@/lib/utils/calculations'
import { useTefasFilter } from '@/lib/context/TefasFilterContext'
import { TefasToggle } from '@/components/ui/TefasToggle'

// ---------------------------------------------------------------------------
// Losers list: funds likely to show positive TL return but negative USD return
// ---------------------------------------------------------------------------
const LOSERS = ['IST', 'AK1', 'YKP', 'IPB', 'TTE', 'AFA']

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------
function formatTL(n: number): string {
  return n.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) + ' \u20BA'
}

function formatUSD(n: number): string {
  return '$' + n.toLocaleString('tr-TR', { maximumFractionDigits: 0 })
}

function formatGold(n: number): string {
  return (
    n.toLocaleString('tr-TR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }) + ' gr'
  )
}

function formatReturn(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}%${Math.abs(value).toFixed(1)}`
}

function formatDiff(value: number, formatter: (n: number) => string): string {
  return value >= 0
    ? '+' + formatter(Math.abs(value))
    : '-' + formatter(Math.abs(value))
}

// ---------------------------------------------------------------------------
// Helper: derive extended values from RealReturns + amount
// (The actual RealReturns type does not carry startValueUsd / Gold / endValueGold
//  so we compute them from fallback constants when data is not available.)
// ---------------------------------------------------------------------------
interface ExtendedValues {
  startValueUsd: number
  endValueUsd: number
  startValueGold: number
  endValueGold: number
}

function deriveExtended(
  results: RealReturns,
  amount: number
): ExtendedValues {
  // Use the USD end value from results if available, fall back to formula
  const endValueUsd =
    results.endValueUsd != null
      ? results.endValueUsd
      : (1 + results.tryReturn / 100) * amount / 36

  // Approximations using fallback exchange rates when not directly available
  const startValueUsd = amount / 32
  const startValueGold = amount / 2500
  const endValueGold = (1 + results.tryReturn / 100) * amount / 3200

  return { startValueUsd, endValueUsd, startValueGold, endValueGold }
}

// ---------------------------------------------------------------------------
// useIntersectionObserver hook
// ---------------------------------------------------------------------------
function useIntersectionObserver(
  threshold = 0.3
): [React.RefObject<HTMLDivElement>, boolean] {
  const ref = useRef<HTMLDivElement>(null!)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [threshold])

  return [ref, isVisible]
}

// ---------------------------------------------------------------------------
// BarColumn
// ---------------------------------------------------------------------------
interface BarColumnProps {
  value: number
  barPct: number
  positive: boolean
  formatValue: string
  isVisible: boolean
  animDelay: string
  labelDelay: string
  label: string
  sublabel?: string
}

function BarColumn({
  value,
  barPct,
  positive,
  formatValue,
  isVisible,
  animDelay,
  labelDelay,
  label,
  sublabel,
}: BarColumnProps) {
  return (
    <div className="flex flex-col items-center flex-1">
      {/* Value label above or below center depending on sign */}
      <div className="relative w-full flex flex-col items-center" style={{ height: 200 }}>
        {/* Top half (positive) */}
        <div className="relative w-full flex flex-col items-center justify-end" style={{ height: 100 }}>
          {positive && (
            <>
              <span
                className="text-sm font-bold text-emerald-600 mb-1 transition-opacity duration-500"
                style={{
                  opacity: isVisible ? 1 : 0,
                  transitionDelay: labelDelay,
                }}
              >
                {formatValue}
              </span>
              <div
                className="w-10 rounded-t-md"
                style={{
                  height: `${barPct}%`,
                  maxHeight: '90%',
                  background: 'linear-gradient(to top, #059669, #34d399)',
                  transform: isVisible ? 'scaleY(1)' : 'scaleY(0)',
                  transformOrigin: 'bottom',
                  transition: `transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) ${animDelay}`,
                }}
              />
            </>
          )}
        </div>

        {/* Center dashed line */}
        <div className="w-full border-t-2 border-dashed border-slate-300" />

        {/* Bottom half (negative) */}
        <div className="relative w-full flex flex-col items-center justify-start" style={{ height: 100 }}>
          {!positive && (
            <>
              <div
                className="w-10 rounded-b-md"
                style={{
                  height: `${barPct}%`,
                  maxHeight: '90%',
                  background: 'linear-gradient(to bottom, #dc2626, #f87171)',
                  transform: isVisible ? 'scaleY(1)' : 'scaleY(0)',
                  transformOrigin: 'top',
                  transition: `transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) ${animDelay}`,
                }}
              />
              <span
                className="text-sm font-bold text-red-600 mt-1 transition-opacity duration-500"
                style={{
                  opacity: isVisible ? 1 : 0,
                  transitionDelay: labelDelay,
                }}
              >
                {formatValue}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Label */}
      <p className="text-sm font-semibold text-slate-700 mt-2">{label}</p>
      {sublabel && <p className="text-xs text-slate-500">{sublabel}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Yanilsama (left card - bar chart illusion vs reality)
// ---------------------------------------------------------------------------
interface YanilsamaProps {
  tlReturn: number
  usdReturn: number
  fundName: string
}

function Yanilsama({ tlReturn, usdReturn, fundName }: YanilsamaProps) {
  const [ref, isVisible] = useIntersectionObserver(0.3)

  const maxAbs = Math.max(Math.abs(tlReturn), Math.abs(usdReturn), 1)
  const tlBarPct = (Math.abs(tlReturn) / maxAbs) * 90
  const usdBarPct = (Math.abs(usdReturn) / maxAbs) * 90

  const tlPositive = tlReturn >= 0
  const usdPositive = usdReturn >= 0

  return (
    <div
      ref={ref}
      className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm"
    >
      <h3 className="text-lg font-bold text-slate-800 mb-1">
        Yan&#x131;lsama vs Ger&#xe7;ek
      </h3>
      <p className="text-sm text-slate-500 mb-6">{fundName}</p>

      <div className="flex items-end justify-center gap-8">
        <BarColumn
          value={tlReturn}
          barPct={tlBarPct}
          positive={tlPositive}
          formatValue={formatReturn(tlReturn)}
          isVisible={isVisible}
          animDelay="0s"
          labelDelay="0.6s"
          label="TL Getiri"
        />
        <BarColumn
          value={usdReturn}
          barPct={usdBarPct}
          positive={usdPositive}
          formatValue={formatReturn(usdReturn)}
          isVisible={isVisible}
          animDelay="0.3s"
          labelDelay="0.9s"
          label="USD Getiri"
        />
      </div>

      <p className="text-sm text-slate-600 mt-6 text-center leading-relaxed">
        {usdReturn >= 0 ? (
          <span className="text-emerald-700 font-medium">
            Bu fon USD baz&#x131;nda da kazand&#x131;rm&#x131;&#x15F;.
          </span>
        ) : (
          <span className="text-red-700 font-medium">
            TL getirisi yan&#x131;lt&#x131;c&#x131;. Ger&#xe7;ek getiri USD
            baz&#x131;nda negatif.
          </span>
        )}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ResultBadge (infographic badge for the third info box in GercekSonuc)
// ---------------------------------------------------------------------------
interface ResultBadgeProps {
  icon: React.ReactNode
  value: number
  formatter: (n: number) => string
  label: string
  delay: number
  isVisible: boolean
}

function ResultBadge({
  icon,
  value,
  formatter,
  label,
  delay,
  isVisible,
}: ResultBadgeProps) {
  const positive = value >= 0

  return (
    <div
      className="flex flex-col items-center gap-2 flex-1 min-w-0 transition-all duration-700"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(12px)',
        transitionDelay: `${delay}ms`,
      }}
    >
      {/* Circle icon */}
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold ring-4 ${
          positive
            ? 'bg-emerald-500 ring-emerald-200'
            : 'bg-red-500 ring-red-200'
        }`}
      >
        {icon}
      </div>

      {/* Value */}
      <span
        className={`text-base font-bold ${
          positive ? 'text-emerald-700' : 'text-red-700'
        }`}
      >
        {formatDiff(value, formatter)}
      </span>

      {/* Arrow + gain/loss text */}
      <span
        className={`text-xs font-semibold flex items-center gap-0.5 ${
          positive ? 'text-emerald-600' : 'text-red-600'
        }`}
      >
        {positive ? (
          <>
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 15l7-7 7 7"
              />
            </svg>
            Kazand&#x131;rd&#x131;
          </>
        ) : (
          <>
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
            Kaybettirdi
          </>
        )}
      </span>

      {/* Category label */}
      <span className="text-xs text-slate-500 font-medium">{label}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// GercekSonuc (right card - real results)
// ---------------------------------------------------------------------------
interface GercekSonucProps {
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
  fundName: string
  onFundChange: (code: string) => void
  onAmountChange: (amount: number) => void
  filteredFunds: typeof FUNDS
}

function GercekSonuc({
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
  filteredFunds,
}: GercekSonucProps) {
  const [ref, isVisible] = useIntersectionObserver(0.2)

  const tlDiff = endTL - startTL
  const usdDiff = endUSD - startUSD
  const goldDiff = endGold - startGold

  // 3D gold bar SVG icon — fixed amber/gold colors, not currentColor
  const goldIcon = (
    <svg
      className="w-8 h-8"
      viewBox="0 0 24 24"
      fill="none"
    >
      {/* Bottom shadow */}
      <path d="M2 16L6 18L22 18L18 16H2Z" fill="#92400e" />
      {/* Front face */}
      <path d="M2 12L2 16L18 16L18 12H2Z" fill="#d97706" />
      {/* Top face (brightest) */}
      <path d="M2 12L6 9H22L18 12H2Z" fill="#fbbf24" />
      {/* Right side face */}
      <path d="M18 12L22 9L22 18L18 16V12Z" fill="#b45309" />
      {/* Shine highlight on top */}
      <path d="M5 11L10 9" stroke="#fef3c7" strokeWidth="1" opacity="0.8" strokeLinecap="round" />
    </svg>
  )

  return (
    <div
      ref={ref}
      className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm"
    >
      <h3 className="text-lg font-bold text-slate-800 mb-4">
        Ger&#xe7;ek Sonu&#xe7;
      </h3>

      {/* Inline sentence with fund selector and amount input */}
      <p className="text-sm text-slate-700 leading-relaxed mb-6">
        Tam 1 y&#x131;l &#xf6;nce{' '}
        <select
          value={selectedFund}
          onChange={(e) => onFundChange(e.target.value)}
          className="inline-block border border-slate-300 rounded px-2 py-0.5 text-sm font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-slate-400 focus:border-slate-400 mx-1"
        >
          <option value="">Se&#xe7;in...</option>
          {filteredFunds.map((fund) => (
            <option key={fund.code} value={fund.code}>
              {fund.code} - {fund.name}
            </option>
          ))}
        </select>{' '}
        fonuna{' '}
        <input
          type="number"
          defaultValue={startTL}
          onChange={(e) => {
            const val = parseFloat(e.target.value)
            if (!isNaN(val) && val > 0) onAmountChange(val)
          }}
          className="inline-block w-24 border border-slate-300 rounded px-2 py-0.5 text-sm font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-slate-400 focus:border-slate-400 mx-1 text-center"
        />{' '}
        &#x20BA; yat&#x131;rd&#x131;n&#x131;z.
      </p>

      {/* Info boxes */}
      <div className="space-y-4">
        {/* Box 1: What you could have owned */}
        <div
          className="bg-slate-50 border border-slate-100 rounded-lg p-4 transition-all duration-700"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(16px)',
            transitionDelay: '0ms',
          }}
        >
          <p className="text-sm text-slate-700 leading-relaxed">
            1 y&#x131;l &#xf6;nce{' '}
            <span className="font-bold text-slate-900">{formatTL(startTL)}</span> ile{' '}
            <span className="font-bold text-amber-700">{formatGold(startGold)}</span>{' '}
            alt&#x131;n veya{' '}
            <span className="font-bold text-blue-700">{formatUSD(startUSD)}</span>{' '}
            sahibi olabilirdiniz.
          </p>
        </div>

        {/* Box 2: Current values */}
        <div
          className="bg-slate-50 border border-slate-100 rounded-lg p-4 transition-all duration-700"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(16px)',
            transitionDelay: '200ms',
          }}
        >
          <p className="text-sm text-slate-700 leading-relaxed">
            Bug&#xfc;n fonunuz TL olarak{' '}
            <span className="font-bold text-slate-900">{formatTL(endTL)}</span>, alt&#x131;n
            olarak{' '}
            <span className="font-bold text-amber-700">{formatGold(endGold)}</span>,
            dolar olarak{' '}
            <span className="font-bold text-blue-700">{formatUSD(endUSD)}</span>{' '}
            ediyor.
          </p>
        </div>

        {/* Box 3: INFOGRAPHIC with three badges */}
        <div
          className="bg-slate-50 border border-slate-100 rounded-lg p-5 transition-all duration-700"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(16px)',
            transitionDelay: '400ms',
          }}
        >
          <div className="flex items-start justify-around gap-4">
            <ResultBadge
              icon={<span className="text-base">{'\u20BA'}</span>}
              value={tlDiff}
              formatter={formatTL}
              label="TL Baz\u0131nda"
              delay={600}
              isVisible={isVisible}
            />
            <ResultBadge
              icon={goldIcon}
              value={goldDiff}
              formatter={formatGold}
              label="Alt\u0131n Baz\u0131nda"
              delay={800}
              isVisible={isVisible}
            />
            <ResultBadge
              icon={<span className="text-base">$</span>}
              value={usdDiff}
              formatter={formatUSD}
              label="Dolar Baz\u0131nda"
              delay={1000}
              isVisible={isVisible}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// HeroVisual (main exported component)
// ---------------------------------------------------------------------------
export function HeroVisual() {
  const [selectedFund, setSelectedFund] = useState('')
  const [amount, setAmount] = useState(10000)
  const [results, setResults] = useState<RealReturns | null>(null)
  const [loading, setLoading] = useState(false)
  const { showOnlyTefas } = useTefasFilter()
  const filteredFunds = showOnlyTefas ? FUNDS.filter((f) => f.is_tefas) : FUNDS

  // Auto-select first suitable loser fund on mount
  useEffect(() => {
    let cancelled = false

    async function findLoserFund() {
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
      const startDate = oneYearAgo.toISOString().split('T')[0]

      for (const code of LOSERS) {
        try {
          const r = await calculateRealReturns({
            fundCode: code,
            startDate,
            amountTry: 10000,
          })
          if (!cancelled && r.tryReturn > 0 && r.usdReturn < 0) {
            setSelectedFund(code)
            setResults(r)
            return
          }
        } catch {
          // Try the next fund
        }
      }

      // If none found, use the first fund with fallback data
      if (!cancelled) {
        setSelectedFund(LOSERS[0])
        try {
          const r = await calculateRealReturns({
            fundCode: LOSERS[0],
            startDate,
            amountTry: 10000,
          })
          if (!cancelled) setResults(r)
        } catch {
          // Will use fallback values
        }
      }
    }

    findLoserFund()
    return () => {
      cancelled = true
    }
  }, [])

  // Re-calculate when fund or amount changes
  useEffect(() => {
    if (!selectedFund) return

    let cancelled = false
    setLoading(true)

    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    const startDate = oneYearAgo.toISOString().split('T')[0]

    calculateRealReturns({
      fundCode: selectedFund,
      startDate,
      amountTry: amount,
    })
      .then((r) => {
        if (!cancelled) setResults(r)
      })
      .catch(() => {
        // Keep existing results or use fallback
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedFund, amount])

  // Resolve values -- use results when available, fallback otherwise
  const tryReturn = results?.tryReturn ?? 67
  const usdReturn = results?.usdReturn ?? -8
  const goldReturn = results?.goldReturn ?? -18

  const endValueTry = results?.endValueTry ?? Math.round((1 + tryReturn / 100) * amount)
  const endValueUsd = results?.endValueUsd ?? (1 + tryReturn / 100) * amount / 36

  // Extended values not on RealReturns directly -- compute from fallback constants
  const ext = results
    ? deriveExtended(results, amount)
    : {
        startValueUsd: amount / 32,
        endValueUsd: (1 + 0.67) * amount / 36,
        startValueGold: amount / 2500,
        endValueGold: (1 + 0.67) * amount / 3200,
      }

  const fundInfo = filteredFunds.find((f) => f.code === selectedFund) ?? FUNDS.find((f) => f.code === selectedFund)
  const fundName = fundInfo?.name ?? selectedFund

  return (
    <section className="py-12">
      {/* Title */}
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-3">
          Fonunuz Ger&#xe7;ekten Kazand&#x131;r&#x131;yor mu?
        </h2>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto">
          TL getirisi y&#xfc;ksek g&#xf6;r&#xfc;nebilir ama d&#xf6;viz ve
          alt&#x131;n kar&#x15F;&#x131;s&#x131;nda ger&#xe7;ek tablo &#xe7;ok
          farkl&#x131;.
        </p>
        <div className="mt-3 flex justify-center">
          <TefasToggle />
        </div>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="flex justify-center mb-6">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-slate-700" />
        </div>
      )}

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
        <Yanilsama
          tlReturn={tryReturn}
          usdReturn={usdReturn}
          fundName={fundName}
        />
        <GercekSonuc
          startTL={amount}
          endTL={endValueTry}
          tlReturn={tryReturn}
          startUSD={ext.startValueUsd}
          endUSD={results?.endValueUsd ?? ext.endValueUsd}
          usdReturn={usdReturn}
          startGold={ext.startValueGold}
          endGold={ext.endValueGold}
          goldReturn={goldReturn}
          selectedFund={selectedFund}
          fundName={fundName}
          onFundChange={setSelectedFund}
          onAmountChange={setAmount}
          filteredFunds={filteredFunds}
        />
      </div>
    </section>
  )
}

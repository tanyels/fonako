'use client'

import { useState, useEffect, useRef } from 'react'

interface Props {
  tlReturn: number
  tlRealReturn: number
  usdReturn: number
  usdRealReturn: number
  goldReturn: number
  goldRealReturn: number
  fundName?: string
  trInflation: number
  usInflation: number
}

export function IllusionBarChart({
  tlReturn,
  tlRealReturn,
  usdReturn,
  usdRealReturn,
  goldReturn,
  goldRealReturn,
  fundName,
  trInflation,
  usInflation,
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
  }, [tlReturn, usdReturn, goldReturn])

  const realValues = [tlRealReturn, usdRealReturn, goldRealReturn]
  const realMax = Math.max(...realValues.map(Math.abs), 1)
  const fmt = (val: number) => `${val >= 0 ? '+' : ''}%${val.toFixed(1)}`

  return (
    <div ref={containerRef}>
      {/* Headline: nominal TL return */}
      <div className="text-center mb-5">
        <p className="text-sm text-muted mb-1">
          {fundName ? `${fundName}` : 'Bir fon seçin'}
        </p>
        <p className="text-body">
          Fonunuz TL olarak <span className="font-bold text-emerald-600 text-lg">%{tlReturn.toFixed(1)}</span> getirdi diye düşünebilirsiniz.
        </p>
        <p className="text-body mt-1">
          Ama aslında <span className="font-semibold">gerçekten kazandınız mı?</span>
        </p>
      </div>

      <div className="border-t border-dashed border-border-default mb-4" />

      {/* Real returns */}
      <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Reel Getiri</p>
      <p className="text-[10px] text-subtle mb-3">TL → TÜFE %{trInflation.toFixed(0)} · USD → CPI %{usInflation.toFixed(0)}</p>

      <div className="flex justify-center gap-6 sm:gap-10">
        <BarColumn value={tlRealReturn} maxAbs={realMax} format={fmt} isVisible={isVisible} delay={0} label="TL Reel" subtitle="(TÜİK enflasyonuna göre)" color="emerald" />
        <BarColumn value={usdRealReturn} maxAbs={realMax} format={fmt} isVisible={isVisible} delay={0.2} label="USD Reel" subtitle="(ABD enflasyonuna göre)" color="blue" />
        <BarColumn value={goldRealReturn} maxAbs={realMax} format={fmt} isVisible={isVisible} delay={0.4} label="Altın Reel" subtitle="(TÜİK enflasyonuna göre)" color="amber" />
      </div>
    </div>
  )
}

function BarColumn({
  value,
  maxAbs,
  format,
  isVisible,
  delay,
  label,
  subtitle,
  color,
}: {
  value: number
  maxAbs: number
  format: (v: number) => string
  isVisible: boolean
  delay: number
  label: string
  subtitle?: string
  color: 'emerald' | 'blue' | 'amber'
}) {
  const positive = value >= 0
  const barPct = Math.max((Math.abs(value) / maxAbs) * 85, 4)
  const labelDelay = delay + 0.5

  const gradients = {
    emerald: { pos: 'from-emerald-600 to-emerald-400', neg: 'from-red-500 to-red-600' },
    blue: { pos: 'from-blue-600 to-blue-400', neg: 'from-red-500 to-red-600' },
    amber: { pos: 'from-amber-600 to-amber-400', neg: 'from-red-500 to-red-600' },
  }

  const grad = positive ? gradients[color].pos : gradients[color].neg
  const textColor = positive ? 'text-emerald-600' : 'text-red-600'

  return (
    <div className="flex flex-col items-center" style={{ width: 75 }}>
      {positive && (
        <div
          className="mb-1 h-6 flex items-end transition-all"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(8px)',
            transitionDelay: `${labelDelay}s`,
            transitionDuration: '0.4s',
          }}
        >
          <span className={`text-sm font-bold ${textColor}`}>{format(value)}</span>
        </div>
      )}
      {!positive && <div className="h-6" />}

      <div className="relative w-full" style={{ height: 100 }}>
        <div className="absolute left-0 right-0 top-1/2 -translate-y-px border-t border-dashed border-border-strong" />

        <div className="absolute top-0 left-0 right-0 flex items-end justify-center" style={{ height: '50%' }}>
          {positive && (
            <div
              className={`w-full rounded-t-md shadow bg-gradient-to-t ${grad}`}
              style={{
                height: `${barPct}%`,
                transformOrigin: 'bottom',
                transform: isVisible ? 'scaleY(1)' : 'scaleY(0)',
                transition: `transform 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
              }}
            />
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 flex items-start justify-center" style={{ height: '50%' }}>
          {!positive && (
            <div
              className={`w-full rounded-b-md shadow bg-gradient-to-b ${grad}`}
              style={{
                height: `${barPct}%`,
                transformOrigin: 'top',
                transform: isVisible ? 'scaleY(1)' : 'scaleY(0)',
                transition: `transform 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
              }}
            />
          )}
        </div>
      </div>

      {!positive && (
        <div
          className="mt-1 h-6 flex items-start transition-all"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(-8px)',
            transitionDelay: `${labelDelay}s`,
            transitionDuration: '0.4s',
          }}
        >
          <span className={`text-sm font-bold ${textColor}`}>{format(value)}</span>
        </div>
      )}
      {positive && <div className="h-6" />}

      <p className="text-xs font-semibold text-body mt-1">{label}</p>
      {subtitle && <p className="text-[9px] text-subtle leading-tight">{subtitle}</p>}
    </div>
  )
}

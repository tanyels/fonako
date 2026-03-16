'use client'

import { useEffect, useRef, useState } from 'react'
import { useHomeData } from '@/lib/hooks/useHomeData'

interface StatItem {
  value: number
  suffix?: string
  prefix?: string
  label: string
  color?: string
  icon: React.ReactNode
}

function useCountUp(end: number, isVisible: boolean, duration = 1500) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!isVisible) return

    let startTime: number | null = null
    let raf: number

    function step(timestamp: number) {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * end))
      if (progress < 1) {
        raf = requestAnimationFrame(step)
      }
    }

    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [end, isVisible, duration])

  return count
}

function StatCard({ stat, isVisible }: { stat: StatItem; isVisible: boolean }) {
  const count = useCountUp(stat.value, isVisible)

  return (
    <div className="text-center">
      <div className="flex justify-center mb-2 text-muted">
        {stat.icon}
      </div>
      <p className={`text-3xl md:text-4xl font-bold ${stat.color || 'text-heading'}`}>
        {stat.prefix}{count.toLocaleString('tr-TR')}{stat.suffix}
      </p>
      <p className="text-muted text-sm mt-1">{stat.label}</p>
    </div>
  )
}

function StatSkeleton() {
  return (
    <div className="text-center animate-pulse">
      <div className="flex justify-center mb-2">
        <div className="w-6 h-6 bg-surface-inset rounded" />
      </div>
      <div className="h-9 w-20 bg-surface-inset rounded mx-auto mb-1" />
      <div className="h-4 w-28 bg-surface-inset rounded mx-auto" />
    </div>
  )
}

// SVG Icons
const ChartIcon = (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
  </svg>
)

const TrendDownIcon = (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6 9 12.75l4.286-4.286a11.948 11.948 0 0 1 4.306 6.43l.776 2.898M18.75 19.5l3-3m0 0-3-3m3 3H15" />
  </svg>
)

const CalendarIcon = (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
  </svg>
)

const CurrencyIcon = (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
)

export function StatsBar() {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const { totalFunds, usdLossPercentage, loading } = useHomeData()

  useEffect(() => {
    const el = ref.current
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

  // Use dynamic data when available, hardcoded fallback only if fetch returned nothing
  const fundCount = totalFunds > 0 ? totalFunds : 2425
  const lossPercent = totalFunds > 0 ? usdLossPercentage : 72

  const stats: StatItem[] = [
    { value: fundCount, label: 'Analiz Edilen Fon', icon: ChartIcon },
    { value: lossPercent, suffix: '%', label: 'USD Bazında Zarar Eden', color: 'text-red-500', icon: TrendDownIcon },
    { value: 10, label: 'Yıl Geriye Dönük Veri', suffix: ' yıl', icon: CalendarIcon },
    { value: 4, label: 'Para Birimi Karşılaştırması', icon: CurrencyIcon },
  ]

  return (
    <section ref={ref} className="py-8">
      <div className="bg-surface border border-border-default rounded-xl p-6 md:p-8 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {loading ? (
            <>
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
            </>
          ) : (
            stats.map((stat) => (
              <StatCard key={stat.label} stat={stat} isVisible={isVisible} />
            ))
          )}
        </div>
      </div>
    </section>
  )
}

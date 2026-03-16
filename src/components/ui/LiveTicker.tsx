'use client'

import { useEffect, useState } from 'react'
import { fetchLiveRates, fetchPreviousClose, type LiveRates, type PreviousClose } from '@/lib/api/rates'

export function LiveTicker() {
  const [rates, setRates] = useState<LiveRates | null>(null)
  const [prevClose, setPrevClose] = useState<PreviousClose | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadRates() {
      try {
        const data = await fetchLiveRates()
        setRates(data)
      } catch (error) {
        console.error('Failed to fetch rates:', error)
      } finally {
        setLoading(false)
      }
    }

    // Fetch previous close once
    fetchPreviousClose()
      .then((prev) => { if (prev) setPrevClose(prev) })
      .catch(() => {})

    loadRates()
    // Refresh every minute
    const interval = setInterval(loadRates, 60000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="bg-slate-900 text-slate-100 py-3 px-4 rounded-lg">
        <div className="flex justify-center space-x-8">
          <span className="animate-pulse text-slate-400">Loading rates...</span>
        </div>
      </div>
    )
  }

  if (!rates) {
    return null
  }

  const timeStr = rates.timestamp.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="bg-slate-900 text-slate-100 py-3 px-4 rounded-lg shadow-md">
      <div className="flex justify-center flex-wrap gap-6 text-sm md:text-base items-center">
        <TickerItem label="USD/TRY" value={rates.usdTry} prevValue={prevClose?.usdTry} />
        <TickerItem label="EUR/TRY" value={rates.eurTry} prevValue={prevClose?.eurTry} />
        <TickerItem label="Gram Altın" value={rates.goldTry} suffix=" ₺" prevValue={prevClose?.goldTry} />
        <TickerItem label="Ons Altın" value={rates.goldUsd} prefix="$" prevValue={prevClose?.goldUsd} />
        <span className="text-slate-500 text-xs">{timeStr} itibarıyla</span>
      </div>
    </div>
  )
}

function TickerItem({
  label,
  value,
  prefix = '',
  suffix = '',
  prevValue,
}: {
  label: string
  value: number
  prefix?: string
  suffix?: string
  prevValue?: number
}) {
  let changeEl: React.ReactNode = null
  if (prevValue && prevValue > 0) {
    const pct = ((value - prevValue) / prevValue) * 100
    // Hide arrow if change is unreasonably large (likely fallback/stale data)
    if (Math.abs(pct) < 10) {
      const isUp = pct >= 0
      changeEl = (
        <span className={`text-xs font-medium ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
          {isUp ? '▲' : '▼'}{Math.abs(pct).toFixed(1)}%
        </span>
      )
    }
  }

  return (
    <div className="flex items-center space-x-2">
      <span className="text-slate-400 font-medium">{label}</span>
      <span className="font-bold text-gold-400">
        {prefix}{value.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}{suffix}
      </span>
      {changeEl}
    </div>
  )
}

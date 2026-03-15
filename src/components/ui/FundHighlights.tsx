'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { getFundReturns } from '@/lib/api/fundReturnsCache'
import { useFundBatchLookup } from '@/lib/hooks/useFundLookup'

interface TopFund {
  code: string
  usdReturn: number
}

export function FundHighlights() {
  const [topFunds, setTopFunds] = useState<TopFund[]>([])
  const [avgTry, setAvgTry] = useState<number | null>(null)
  const [avgUsd, setAvgUsd] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const codes = topFunds.map((f) => f.code)
  const nameMap = useFundBatchLookup(codes)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const returns = await getFundReturns('1Y')

      if (returns.length > 0) {
        // Top 3
        const top = returns.slice(0, 3)
        setTopFunds(top.map((r) => ({ code: r.fund_code, usdReturn: r.usd_return ?? 0 })))

        // Averages
        const sumTry = returns.reduce((s, r) => s + (r.try_return ?? 0), 0)
        const sumUsd = returns.reduce((s, r) => s + (r.usd_return ?? 0), 0)
        setAvgTry(sumTry / returns.length)
        setAvgUsd(sumUsd / returns.length)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm animate-pulse">
          <div className="h-6 w-48 bg-slate-100 rounded mb-4" />
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-slate-100 rounded" />
                  <div>
                    <div className="h-4 w-32 bg-slate-100 rounded mb-1" />
                    <div className="h-3 w-12 bg-slate-100 rounded" />
                  </div>
                </div>
                <div className="h-6 w-16 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl p-6 animate-pulse">
          <div className="h-6 w-32 bg-slate-700 rounded mb-4" />
          <div className="space-y-4">
            <div className="bg-white/10 rounded-lg p-4"><div className="h-10 bg-slate-700 rounded" /></div>
            <div className="bg-white/10 rounded-lg p-4"><div className="h-10 bg-slate-700 rounded" /></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-700 mb-3">Veri yüklenirken hata oluştu.</p>
        <button onClick={load} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium">
          Tekrar Dene
        </button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Top Performers */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">En İyiler (USD Bazında)</h3>
          <span className="text-sm text-slate-500 font-medium">Son 1 Yıl</span>
        </div>

        <div className="space-y-3">
          {topFunds.map((fund, i) => {
            const info = nameMap.get(fund.code)
            return (
              <div
                key={fund.code}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg font-bold text-slate-400">#{i + 1}</span>
                  <div>
                    <p className="font-semibold text-slate-800">{info?.name || fund.code}</p>
                    <p className="text-sm text-slate-500">{fund.code}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-lg ${fund.usdReturn >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {fund.usdReturn >= 0 ? '+' : ''}{fund.usdReturn.toFixed(1)}%
                  </p>
                  <p className="text-xs text-slate-500 font-medium">USD</p>
                </div>
              </div>
            )
          })}
        </div>

        <Link
          href="/leaderboard"
          className="block text-center mt-4 text-slate-600 hover:text-slate-900 font-medium"
        >
          Tüm sıralamayı gör →
        </Link>
      </div>

      {/* Reality Check Card */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-bold mb-4 text-white">Gerçeği Görün</h3>

        <div className="space-y-4">
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <p className="text-sm text-slate-300">Ortalama TL Fon Getirisi (Son 1 Yıl)</p>
            <p className={`text-3xl font-bold ${(avgTry ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {avgTry !== null ? `${avgTry >= 0 ? '+' : ''}${avgTry.toFixed(0)}%` : '...'}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <p className="text-sm text-slate-300">Aynı Dönem USD Getirisi</p>
            <p className={`text-3xl font-bold ${(avgUsd ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {avgUsd !== null ? `${avgUsd >= 0 ? '+' : ''}${avgUsd.toFixed(0)}%` : '...'}
            </p>
          </div>

          <p className="text-sm text-slate-400">
            TL&apos;deki değer kaybı hesaba katıldığında, birçok fon aslında
            zarar ettirdi.
          </p>
        </div>

        <Link
          href="/funds"
          className="block text-center mt-4 py-2.5 bg-white text-slate-800 rounded-lg font-semibold hover:bg-slate-100 transition"
        >
          Fonunuzu Analiz Edin
        </Link>
      </div>
    </div>
  )
}

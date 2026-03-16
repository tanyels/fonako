'use client'

import Link from 'next/link'
import { useHomeData } from '@/lib/hooks/useHomeData'

export function FundHighlights() {
  const { avgTryReturn, avgUsdReturn, loading, totalFunds } = useHomeData()

  // Don't render if data failed to load (would show meaningless 0%/0%)
  if (!loading && totalFunds === 0) return null

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-slate-800 rounded-xl p-6 animate-pulse">
          <div className="h-6 w-32 bg-slate-700 rounded mb-4" />
          <div className="space-y-4">
            <div className="bg-white/10 rounded-lg p-4"><div className="h-10 bg-slate-700 rounded" /></div>
            <div className="bg-white/10 rounded-lg p-4"><div className="h-10 bg-slate-700 rounded" /></div>
            <div className="bg-white/10 rounded-lg p-4"><div className="h-10 bg-slate-700 rounded" /></div>
          </div>
        </div>
      </div>
    )
  }

  const spread = Math.abs(avgTryReturn - avgUsdReturn)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-bold mb-4 text-white">Gerçeği Görün</h3>

        <div className="space-y-4">
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <p className="text-sm text-slate-300">Ortalama TL Fon Getirisi (Son 1 Yıl)</p>
            <p className={`text-3xl font-bold ${avgTryReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {avgTryReturn >= 0 ? '+' : ''}{avgTryReturn.toFixed(0)}%
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <p className="text-sm text-slate-300">Aynı Dönem USD Getirisi</p>
            <p className={`text-3xl font-bold ${avgUsdReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {avgUsdReturn >= 0 ? '+' : ''}{avgUsdReturn.toFixed(0)}%
            </p>
          </div>

          <div className="bg-red-500/20 backdrop-blur rounded-lg p-4 border border-red-500/30">
            <p className="text-sm text-slate-300">Aradaki Fark</p>
            <p className="text-3xl font-bold text-red-400">
              {spread.toFixed(0)} puan
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

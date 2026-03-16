'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { getFundReturns } from '@/lib/api/fundReturnsCache'
import { useFundBatchLookup } from '@/lib/hooks/useFundLookup'
import { isBESFund } from '@/lib/constants'

interface FundReturnRow {
  fund_code: string
  usd_return: number | null
}

interface ProviderData {
  name: string
  avgUsdReturn1Y: number
  avgUsdReturn2Y: number
  fundCount: number
  bestFundCode: string
  bestFundName: string
  bestFundReturn: number
}

export function BESProviderRankings() {
  const [sortBy, setSortBy] = useState<'usd1y' | 'usd2y' | 'count'>('usd1y')
  const [providers, setProviders] = useState<ProviderData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [allCodes, setAllCodes] = useState<string[]>([])
  const rawRef = useRef<{ r1Y: FundReturnRow[]; r2Y: FundReturnRow[] }>({ r1Y: [], r2Y: [] })

  const nameMap = useFundBatchLookup(allCodes)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const [returns1Y, returns2Y] = await Promise.all([
        getFundReturns('1Y'),
        getFundReturns('2Y'),
      ])

      rawRef.current = {
        r1Y: returns1Y as FundReturnRow[],
        r2Y: returns2Y as FundReturnRow[],
      }

      const codes1Y = returns1Y.map((r) => r.fund_code)
      const codes2Y = returns2Y.map((r) => r.fund_code)
      const allUnique = Array.from(new Set([...codes1Y, ...codes2Y]))
      setAllCodes(allUnique)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Compute provider aggregates once nameMap is ready
  useEffect(() => {
    if (allCodes.length === 0 || nameMap.size === 0) return

    const { r1Y, r2Y } = rawRef.current
    if (r1Y.length === 0) return

    // Build 2Y lookup
    const map2Y = new Map<string, number>()
    for (const r of r2Y) {
      map2Y.set(r.fund_code, r.usd_return ?? 0)
    }

    // Filter to BES funds and group by manager
    const providerMap = new Map<string, {
      usdSum1Y: number
      usdSum2Y: number
      count1Y: number
      count2Y: number
      bestCode: string
      bestReturn: number
    }>()

    for (const r of r1Y) {
      const info = nameMap.get(r.fund_code)
      if (!info) continue

      const isBES = isBESFund(info.name, info.category)
      if (!isBES) continue

      const manager = info.manager || 'Bilinmeyen'
      const usd1Y = r.usd_return ?? 0

      if (!providerMap.has(manager)) {
        providerMap.set(manager, {
          usdSum1Y: 0, usdSum2Y: 0, count1Y: 0, count2Y: 0,
          bestCode: r.fund_code, bestReturn: usd1Y,
        })
      }

      const entry = providerMap.get(manager)!
      entry.usdSum1Y += usd1Y
      entry.count1Y += 1

      if (usd1Y > entry.bestReturn) {
        entry.bestReturn = usd1Y
        entry.bestCode = r.fund_code
      }

      const usd2Y = map2Y.get(r.fund_code)
      if (usd2Y !== undefined) {
        entry.usdSum2Y += usd2Y
        entry.count2Y += 1
      }
    }

    const result: ProviderData[] = []
    providerMap.forEach((data, name) => {
      const bestInfo = nameMap.get(data.bestCode)
      result.push({
        name,
        avgUsdReturn1Y: data.count1Y > 0 ? data.usdSum1Y / data.count1Y : 0,
        avgUsdReturn2Y: data.count2Y > 0 ? data.usdSum2Y / data.count2Y : 0,
        fundCount: data.count1Y,
        bestFundCode: data.bestCode,
        bestFundName: bestInfo?.name || data.bestCode,
        bestFundReturn: data.bestReturn,
      })
    })

    setProviders(result)
  }, [allCodes, nameMap])

  const sortedProviders = [...providers].sort((a, b) => {
    if (sortBy === 'usd1y') return b.avgUsdReturn1Y - a.avgUsdReturn1Y
    if (sortBy === 'usd2y') return b.avgUsdReturn2Y - a.avgUsdReturn2Y
    return b.fundCount - a.fundCount
  })

  return (
    <div className="bg-surface border border-border-default rounded-xl p-6 shadow-sm">
      <p className="text-body mb-6">
        Hangi BES şirketinin fonları USD bazında daha iyi performans gösteriyor?
        <span className="block text-sm text-muted mt-1">
          Which pension company&apos;s funds perform better in USD terms?
        </span>
      </p>

      {/* Sort Options */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setSortBy('usd1y')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            sortBy === 'usd1y' ? 'bg-heading text-surface' : 'bg-surface-inset text-body hover:bg-surface-inset'
          }`}
        >
          1Y USD Getiri
        </button>
        <button
          onClick={() => setSortBy('usd2y')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            sortBy === 'usd2y' ? 'bg-heading text-surface' : 'bg-surface-inset text-body hover:bg-surface-inset'
          }`}
        >
          2Y USD Getiri
        </button>
        <button
          onClick={() => setSortBy('count')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            sortBy === 'count' ? 'bg-heading text-surface' : 'bg-surface-inset text-body hover:bg-surface-inset'
          }`}
        >
          Fon Sayısı
        </button>
      </div>

      {/* Rankings Table */}
      {loading ? (
        <div className="animate-pulse">
          <div className="h-10 bg-surface-raised rounded mb-2" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-4 py-3 border-b border-border-default">
              <div className="w-8 h-5 bg-surface-inset rounded" />
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 bg-surface-inset rounded-lg" />
                <div>
                  <div className="w-32 h-4 bg-surface-inset rounded mb-1" />
                  <div className="w-16 h-3 bg-surface-inset rounded" />
                </div>
              </div>
              <div className="w-16 h-5 bg-surface-inset rounded" />
              <div className="w-16 h-5 bg-surface-inset rounded" />
              <div className="w-12 h-5 bg-surface-inset rounded" />
              <div className="w-32 h-5 bg-surface-inset rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-8 text-center">
          <p className="text-red-600 mb-3">Veri yüklenirken hata oluştu.</p>
          <button onClick={load} className="px-4 py-2 bg-heading text-surface rounded-lg hover:opacity-90 transition text-sm font-medium">
            Tekrar Dene
          </button>
        </div>
      ) : sortedProviders.length === 0 ? (
        <div className="text-center text-muted py-8">BES fon verisi bulunamadı.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-raised">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-body">#</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-body">Şirket</th>
                <th className="text-right px-4 py-3 text-sm font-semibold text-body">USD 1Y</th>
                <th className="text-right px-4 py-3 text-sm font-semibold text-body">USD 2Y</th>
                <th className="text-right px-4 py-3 text-sm font-semibold text-body">Fon Sayısı</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-body">En İyi Fon</th>
              </tr>
            </thead>
            <tbody>
              {sortedProviders.map((provider, index) => (
                <tr key={provider.name} className="border-b border-border-default hover:bg-surface-raised">
                  <td className="px-4 py-3">
                    <span className={`font-bold ${index === 0 ? 'text-amber-500' : 'text-subtle'}`}>
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-surface-inset rounded-lg flex items-center justify-center text-sm font-bold text-body">
                        {provider.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-heading">{provider.name}</p>
                        <p className="text-xs text-muted">{provider.fundCount} fon</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${provider.avgUsdReturn1Y >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {provider.avgUsdReturn1Y >= 0 ? '+' : ''}{provider.avgUsdReturn1Y.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${provider.avgUsdReturn2Y >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {provider.avgUsdReturn2Y >= 0 ? '+' : ''}{provider.avgUsdReturn2Y.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-body">{provider.fundCount}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-body">{provider.bestFundName}</p>
                    <p className={`text-xs font-semibold ${provider.bestFundReturn >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {provider.bestFundReturn >= 0 ? '+' : ''}{provider.bestFundReturn.toFixed(1)}% USD
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted mt-4">
        * Ortalama getiriler her şirketin tüm BES fonlarının aritmetik ortalamasıdır.
      </p>
    </div>
  )
}

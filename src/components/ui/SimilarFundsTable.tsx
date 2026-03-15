'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useFundLookup } from '@/lib/hooks/useFundLookup'
import { extractTags } from '@/lib/utils/fundTags'
import { supabase } from '@/lib/api/supabase'
import type { FundInfo } from '@/lib/data/fund-types'

type SortCol = 'try' | 'usd' | 'gold'
type SortDir = 'desc' | 'asc'

interface FundReturn {
  code: string
  name: string
  tryReturn: number
  usdReturn: number
  goldReturn: number
}

export function SimilarFundsTable({ fundCode }: { fundCode: string }) {
  const fund = useFundLookup(fundCode || undefined)
  const allTags = useMemo(() => fund ? extractTags(fund.name) : [], [fund?.name]) // eslint-disable-line react-hooks/exhaustive-deps

  const [activeTags, setActiveTags] = useState<string[]>(allTags)
  const [data, setData] = useState<FundReturn[]>([])
  const [loading, setLoading] = useState(false)
  const [sortCol, setSortCol] = useState<SortCol>('usd')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // Reset tags when fund changes
  useEffect(() => {
    if (fund) {
      setActiveTags(extractTags(fund.name))
    }
  }, [fund?.code]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTag = (tag: string) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  // Fetch matching funds from API and their returns from Supabase
  const fetchReturns = useCallback(async () => {
    if (activeTags.length === 0) {
      setData([])
      return
    }

    setLoading(true)
    try {
      // Get matching fund codes from API (tag-based filtering)
      const res = await fetch(
        `/api/funds?tags=${encodeURIComponent(activeTags.join(','))}&exclude=${encodeURIComponent(fundCode)}`
      )
      const matchingFunds: FundInfo[] = await res.json()

      if (matchingFunds.length === 0) {
        setData([])
        return
      }

      const codes = matchingFunds.map((f) => f.code)
      const nameMap = new Map(matchingFunds.map((f) => [f.code, f.name]))

      // Fetch returns from Supabase
      const { data: returns } = await supabase
        .from('fund_returns')
        .select('fund_code, try_return, usd_return, gold_return')
        .eq('period', '1Y')
        .in('fund_code', codes)

      if (returns) {
        setData(
          returns.map((r) => ({
            code: r.fund_code,
            name: nameMap.get(r.fund_code) || r.fund_code,
            tryReturn: r.try_return ?? 0,
            usdReturn: r.usd_return ?? 0,
            goldReturn: r.gold_return ?? 0,
          }))
        )
      } else {
        setData([])
      }
    } catch {
      setData([])
    } finally {
      setLoading(false)
    }
  }, [activeTags.join(','), fundCode]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchReturns()
  }, [fetchReturns])

  function handleSort(col: SortCol) {
    if (sortCol === col) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc')
    } else {
      setSortCol(col)
      setSortDir('desc')
    }
  }

  const sorted = useMemo(() => [...data].sort((a, b) => {
    const valA = sortCol === 'try' ? a.tryReturn : sortCol === 'usd' ? a.usdReturn : a.goldReturn
    const valB = sortCol === 'try' ? b.tryReturn : sortCol === 'usd' ? b.usdReturn : b.goldReturn
    return sortDir === 'desc' ? valB - valA : valA - valB
  }), [data, sortCol, sortDir])

  const arrow = (col: SortCol) => {
    if (sortCol !== col) return <span className="text-slate-300 ml-0.5">&#x25BC;</span>
    return <span className="ml-0.5">{sortDir === 'desc' ? '▼' : '▲'}</span>
  }

  if (allTags.length === 0) return null

  return (
    <div className="mt-8">
      <h3 className="text-lg font-bold text-slate-800 mb-3">Benzer Fonlar Sıralaması</h3>

      {/* Tag pills */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {allTags.map((tag) => {
          const active = activeTags.includes(tag)
          return (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                active
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
              }`}
            >
              {tag}
            </button>
          )
        })}
      </div>

      {activeTags.length === 0 && (
        <p className="text-sm text-slate-400">En az bir etiket seçin.</p>
      )}

      {activeTags.length > 0 && loading && (
        <div className="animate-pulse space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 bg-slate-100 rounded" />
          ))}
        </div>
      )}

      {activeTags.length > 0 && !loading && (
        <>
          <p className="text-xs text-slate-400 mb-2">
            {sorted.length} benzer fon bulundu (1Y getiri)
          </p>

          {sorted.length === 0 ? (
            <p className="text-sm text-slate-400">Eşleşen fon bulunamadı.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-1 text-xs font-semibold text-slate-500 w-6">#</th>
                    <th className="text-left py-2 px-1 text-xs font-semibold text-slate-500">Fon</th>
                    <SortHeader label="TL" col="try" current={sortCol} arrow={arrow} onClick={handleSort} color="text-slate-600" />
                    <SortHeader label="USD" col="usd" current={sortCol} arrow={arrow} onClick={handleSort} color="text-blue-600" />
                    <SortHeader label="Altın" col="gold" current={sortCol} arrow={arrow} onClick={handleSort} color="text-amber-600" />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((fund, i) => (
                    <tr
                      key={fund.code}
                      className="border-b border-slate-100 hover:bg-slate-50 transition group"
                    >
                      <td className="py-2 px-1 text-slate-400 font-medium">{i + 1}</td>
                      <td className="py-2 px-1 relative">
                        <span className="font-semibold text-slate-800 cursor-default">{fund.code}</span>
                        <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block z-10 bg-slate-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
                          {fund.name}
                        </div>
                      </td>
                      <td className="py-2 px-1 text-right">
                        <ReturnBadge value={fund.tryReturn} bold={sortCol === 'try'} />
                      </td>
                      <td className="py-2 px-1 text-right">
                        <ReturnBadge value={fund.usdReturn} bold={sortCol === 'usd'} />
                      </td>
                      <td className="py-2 px-1 text-right">
                        <ReturnBadge value={fund.goldReturn} bold={sortCol === 'gold'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function SortHeader({
  label,
  col,
  current,
  arrow,
  onClick,
  color,
}: {
  label: string
  col: SortCol
  current: SortCol
  arrow: (col: SortCol) => JSX.Element
  onClick: (col: SortCol) => void
  color: string
}) {
  const active = current === col
  return (
    <th
      className={`text-right py-2 px-1 text-xs font-semibold cursor-pointer select-none hover:bg-slate-100 transition rounded ${active ? color : 'text-slate-500'}`}
      onClick={() => onClick(col)}
    >
      {label}{arrow(col)}
    </th>
  )
}

function ReturnBadge({ value, bold = false }: { value: number; bold?: boolean }) {
  const positive = value >= 0
  return (
    <span className={`${bold ? 'font-bold' : 'font-medium'} ${positive ? 'text-emerald-600' : 'text-red-600'}`}>
      {positive ? '+' : ''}{value.toFixed(1)}%
    </span>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import { IllusionBarChart } from './IllusionBarChart'
import { TopFundsTable } from './TopFundsTable'
import { FUND_CATEGORIES } from '@/lib/data/fund-types'
import { useFundLookup } from '@/lib/hooks/useFundLookup'
import { FundSearch } from './FundSearch'
import { calculateRealReturns, type RealReturns } from '@/lib/utils/calculations'
import { FALLBACK_TR_INFLATION, FALLBACK_US_INFLATION } from '@/lib/constants'
import { extractTags } from '@/lib/utils/fundTags'

const DEFAULT_AMOUNT = 10000
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000
const SAMPLE_SIZE = 15

// Candidate funds for random selection (initial load)
const CANDIDATE_CODES = ['IST', 'AK1', 'YKP', 'IPB', 'TTE', 'AFA']

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Biggest illusion = max(tryReturn - usdReturn) where tryReturn > 0
 * TL'de kazandırıyor gibi gözüküp USD'de en çok kaybettiren fon
 */
async function findBiggestIllusion(
  candidates: string[],
  amount: number
): Promise<{ code: string; data: RealReturns } | null> {
  const startDate = new Date(Date.now() - ONE_YEAR_MS).toISOString().split('T')[0]
  const sample = shuffle(candidates).slice(0, SAMPLE_SIZE)

  let best: { code: string; data: RealReturns; score: number } | null = null

  const results = await Promise.allSettled(
    sample.map(async (code) => {
      const data = await calculateRealReturns({ fundCode: code, startDate, amountTry: amount })
      return { code, data }
    })
  )

  for (const result of results) {
    if (result.status !== 'fulfilled') continue
    const { code, data } = result.value
    // Illusion score: TL looks positive, USD is negative — bigger gap = bigger illusion
    if (data.tryReturn > 0) {
      const score = data.tryReturn - data.usdReturn
      if (!best || score > best.score) {
        best = { code, data, score }
      }
    }
  }

  return best ? { code: best.code, data: best.data } : null
}

export function HeroVisual() {
  const [selectedFund, setSelectedFund] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [amount, setAmount] = useState(DEFAULT_AMOUNT)
  const [results, setResults] = useState<RealReturns | null>(null)
  const [loading, setLoading] = useState(false)
  const initialized = useRef(false)
  const requestId = useRef(0)

  const fund = useFundLookup(selectedFund || undefined)

  // On initial load: find biggest illusion from default candidates
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    setLoading(true)
    findBiggestIllusion(CANDIDATE_CODES, DEFAULT_AMOUNT)
      .then((result) => {
        if (result) {
          setSelectedFund(result.code)
          setResults(result.data)
        } else {
          // Fallback
          setSelectedFund(CANDIDATE_CODES[0])
          fetchResults(CANDIDATE_CODES[0], DEFAULT_AMOUNT)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  // When category changes: find biggest illusion in that category
  useEffect(() => {
    if (!initialized.current) return

    const id = ++requestId.current
    setLoading(true)
    setResults(null)

    async function run() {
      try {
        let candidates = CANDIDATE_CODES
        if (selectedCategory !== 'all') {
          const r = await fetch(`/api/funds?category=${encodeURIComponent(selectedCategory)}&limit=200`)
          const funds: { code: string }[] = await r.json()
          candidates = funds.map((f) => f.code)
          if (candidates.length === 0 || id !== requestId.current) return
        }

        const result = await findBiggestIllusion(candidates, amount)
        if (id !== requestId.current) return

        if (result) {
          setSelectedFund(result.code)
          setResults(result.data)
        } else {
          const fallback = candidates[0]
          setSelectedFund(fallback)
          const data = await calculateRealReturns({
            fundCode: fallback,
            startDate: new Date(Date.now() - ONE_YEAR_MS).toISOString().split('T')[0],
            amountTry: amount,
          })
          if (id === requestId.current) setResults(data)
        }
      } catch {
        // ignore
      } finally {
        if (id === requestId.current) setLoading(false)
      }
    }
    run()
  }, [selectedCategory]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchResults(code: string, amt: number) {
    if (!code) {
      setResults(null)
      return
    }

    setLoading(true)
    try {
      const data = await calculateRealReturns({
        fundCode: code,
        startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        amountTry: amt,
      })
      setResults(data)
    } catch {
      setResults(null)
    } finally {
      setLoading(false)
    }
  }

  function handleFundChange(code: string) {
    setSelectedFund(code)
    fetchResults(code, amount)
  }

  // Placeholder defaults based on ~2024 rates
  const tlReturn = results?.tryReturn ?? 67
  const tlRealReturn = results?.tryRealReturn ?? 15.7
  const usdReturn = results?.usdReturn ?? -8
  const usdRealReturn = results?.usdRealReturn ?? -10.5
  const goldReturn = results?.goldReturn ?? -18
  const goldRealReturn = results?.goldRealReturn ?? -43.3
  const trInflation = results?.trInflation ?? FALLBACK_TR_INFLATION
  const usInflation = results?.usInflation ?? FALLBACK_US_INFLATION

  return (
    <section className="w-full py-8">
      {/* Title */}
      <div className="text-center mb-6 bg-gradient-to-b from-brand-50/50 to-transparent dark:from-brand-950/30 rounded-2xl py-4">
        <h1 className="text-4xl font-bold text-heading mb-3">
          Fonunuz Gerçekten Kazandırıyor mu?
        </h1>
        <p className="text-lg text-muted max-w-2xl mx-auto">
          TL bazlı getiriler yanıltıcı olabilir. Bir fon seçin, gerçek performansı görün.
        </p>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
            selectedCategory === 'all'
              ? 'bg-heading text-surface'
              : 'bg-surface-inset text-body hover:bg-surface-inset'
          }`}
        >
          Tümü
        </button>
        {FUND_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
              selectedCategory === cat
                ? 'bg-heading text-surface'
                : 'bg-surface-inset text-body hover:bg-surface-inset'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT: Search & Analysis (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Fund selector */}
          <div>
            <FundSearch
              value={selectedFund}
              onChange={handleFundChange}
              categoryFilter={selectedCategory === 'all' ? undefined : selectedCategory}
            />
            <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
              <span className="text-xs text-subtle font-medium">Popüler:</span>
              {CANDIDATE_CODES.map((code) => (
                <button
                  key={code}
                  onClick={() => handleFundChange(code)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${
                    selectedFund === code
                      ? 'bg-heading text-surface'
                      : 'bg-surface-inset text-body hover:bg-surface-inset'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>
            {fund && (
              <div className="mt-2 text-center">
                <div className="flex flex-wrap justify-center gap-1.5 mb-1">
                  {extractTags(fund.name).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 text-xs font-medium rounded-full bg-surface-inset text-body border border-border-default"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-subtle">
                  {fund.manager} · Son 1 yıl
                </p>
              </div>
            )}
          </div>

          {loading && (
            <div className="text-center py-12">
              <p className="text-subtle animate-pulse">Hesaplanıyor...</p>
            </div>
          )}

          {!loading && (
            <div>
              <div className="bg-surface border border-border-default rounded-xl p-6 shadow-sm">
                <IllusionBarChart
                  tlReturn={tlReturn}
                  tlRealReturn={tlRealReturn}
                  usdReturn={usdReturn}
                  usdRealReturn={usdRealReturn}
                  goldReturn={goldReturn}
                  goldRealReturn={goldRealReturn}
                  fundName={fund?.name}
                  trInflation={trInflation}
                  usInflation={usInflation}
                />
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Top Funds Leaderboard (1/3 width) */}
        <div className="bg-surface border border-border-default rounded-xl p-5 shadow-sm">
          <TopFundsTable />
        </div>

      </div>
    </section>
  )
}

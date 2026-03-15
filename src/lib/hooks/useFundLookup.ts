import { useState, useEffect, useRef, useCallback } from 'react'
import type { FundInfo } from '@/lib/data/fund-types'

// Module-level cache shared across all hook instances
const cache = new Map<string, FundInfo>()

export function useFundLookup(code: string | undefined): FundInfo | null {
  const [fund, setFund] = useState<FundInfo | null>(() =>
    code ? cache.get(code) ?? null : null
  )

  useEffect(() => {
    if (!code) {
      setFund(null)
      return
    }

    const cached = cache.get(code)
    if (cached) {
      setFund(cached)
      return
    }

    let cancelled = false
    fetch(`/api/funds?code=${encodeURIComponent(code)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: FundInfo | null) => {
        if (cancelled) return
        if (data) {
          cache.set(data.code, data)
          setFund(data)
        } else {
          setFund(null)
        }
      })
      .catch(() => {
        if (!cancelled) setFund(null)
      })

    return () => { cancelled = true }
  }, [code])

  return fund
}

export function useFundBatchLookup(codes: string[]): Map<string, FundInfo> {
  const [map, setMap] = useState<Map<string, FundInfo>>(() => {
    const m = new Map<string, FundInfo>()
    for (const c of codes) {
      const cached = cache.get(c)
      if (cached) m.set(c, cached)
    }
    return m
  })

  const key = codes.slice().sort().join(',')

  useEffect(() => {
    if (codes.length === 0) {
      setMap(new Map())
      return
    }

    const missing = codes.filter((c) => !cache.has(c))

    if (missing.length === 0) {
      const m = new Map<string, FundInfo>()
      for (const c of codes) {
        const cached = cache.get(c)
        if (cached) m.set(c, cached)
      }
      setMap(m)
      return
    }

    let cancelled = false
    fetch(`/api/funds?codes=${missing.map(encodeURIComponent).join(',')}`)
      .then((r) => r.json())
      .then((data: FundInfo[]) => {
        if (cancelled) return
        for (const f of data) cache.set(f.code, f)
        const m = new Map<string, FundInfo>()
        for (const c of codes) {
          const cached = cache.get(c)
          if (cached) m.set(c, cached)
        }
        setMap(m)
      })
      .catch(() => {})

    return () => { cancelled = true }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  return map
}

interface SearchOpts {
  category?: string
  besOnly?: boolean
  limit?: number
}

interface SearchResult {
  results: FundInfo[]
  loading: boolean
}

export function useFundSearch(
  query: string,
  opts: SearchOpts = {}
): SearchResult {
  const [results, setResults] = useState<FundInfo[]>([])
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const abortRef = useRef<AbortController>()

  const { category, besOnly, limit = 50 } = opts

  const doFetch = useCallback(
    (q: string) => {
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl

      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (category) params.set('category', category)
      if (besOnly) params.set('besOnly', 'true')
      params.set('limit', String(limit))

      setLoading(true)
      fetch(`/api/funds?${params}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((data: FundInfo[]) => {
          for (const f of data) cache.set(f.code, f)
          setResults(data)
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    },
    [category, besOnly, limit]
  )

  useEffect(() => {
    clearTimeout(timerRef.current)

    // No debounce for empty query (show default list) or very short
    if (query.length === 0) {
      doFetch('')
      return
    }

    timerRef.current = setTimeout(() => doFetch(query), 200)

    return () => clearTimeout(timerRef.current)
  }, [query, doFetch])

  return { results, loading }
}

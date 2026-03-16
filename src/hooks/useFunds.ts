'use client'

import { useState, useEffect, useMemo } from 'react'
import { getAllFunds, type Fund } from '@/lib/api/supabase'
import { useTefasFilter } from '@/lib/context/TefasFilterContext'

// Simple in-memory cache to deduplicate getAllFunds calls across components
let fundsCache: Fund[] | null = null
let fundsCachePromise: Promise<Fund[]> | null = null

function getCachedFunds(): Promise<Fund[]> {
  if (fundsCache) return Promise.resolve(fundsCache)
  if (fundsCachePromise) return fundsCachePromise
  fundsCachePromise = getAllFunds()
    .then((funds) => {
      fundsCache = funds
      return funds
    })
    .finally(() => {
      fundsCachePromise = null
    })
  return fundsCachePromise
}

export function useFundBatchLookup(overrideIncludeAll?: boolean): {
  lookup: Map<string, Fund>
  loading: boolean
} {
  const { showOnlyTefas } = useTefasFilter()
  const [allFunds, setAllFunds] = useState<Fund[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCachedFunds()
      .then((funds) => {
        setAllFunds(funds)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const shouldFilter = showOnlyTefas && !overrideIncludeAll

  const lookup = useMemo(() => {
    const map = new Map<string, Fund>()
    allFunds.forEach((f) => {
      if (!shouldFilter || f.is_tefas) {
        map.set(f.code, f)
      }
    })
    return map
  }, [allFunds, shouldFilter])

  return { lookup, loading }
}

export function useFundLookup(overrideIncludeAll?: boolean): {
  funds: Fund[]
  loading: boolean
} {
  const { showOnlyTefas } = useTefasFilter()
  const [allFunds, setAllFunds] = useState<Fund[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCachedFunds()
      .then((data) => {
        setAllFunds(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const shouldFilter = showOnlyTefas && !overrideIncludeAll

  const funds = useMemo(() => {
    return shouldFilter ? allFunds.filter((f) => f.is_tefas) : allFunds
  }, [allFunds, shouldFilter])

  return { funds, loading }
}

import { useState, useEffect } from 'react'
import { getFundDetails, type FundDetails } from '@/lib/api/supabase'

// Module-level cache to avoid re-fetching
const cache = new Map<string, FundDetails>()

export function useFundDetails(code: string | undefined): {
  details: FundDetails | null
  loading: boolean
} {
  const [details, setDetails] = useState<FundDetails | null>(() =>
    code ? cache.get(code) ?? null : null
  )
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!code) {
      setDetails(null)
      return
    }

    const cached = cache.get(code)
    if (cached) {
      setDetails(cached)
      return
    }

    let cancelled = false
    setLoading(true)

    getFundDetails(code)
      .then((data) => {
        if (cancelled) return
        if (data) {
          cache.set(code, data)
          setDetails(data)
        } else {
          setDetails(null)
        }
      })
      .catch(() => {
        if (!cancelled) setDetails(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [code])

  return { details, loading }
}

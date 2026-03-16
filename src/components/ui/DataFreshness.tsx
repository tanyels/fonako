'use client'

import { useHomeData } from '@/lib/hooks/useHomeData'

export function DataFreshness() {
  const { lastUpdated, loading } = useHomeData()

  if (loading || !lastUpdated) return null

  // Format date in Turkish locale
  const formatted = new Date(lastUpdated + 'T00:00:00').toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <p className="text-xs text-subtle text-center py-1">
      Fon verileri son güncelleme: {formatted}
    </p>
  )
}

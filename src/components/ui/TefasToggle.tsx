'use client'

import { useTefasFilter } from '@/lib/context/TefasFilterContext'

export function TefasToggle() {
  const { showOnlyTefas, setShowOnlyTefas } = useTefasFilter()

  return (
    <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
      <input
        type="checkbox"
        checked={!showOnlyTefas}
        onChange={(e) => setShowOnlyTefas(!e.target.checked)}
        className="w-4 h-4 rounded border-slate-300 text-slate-800 focus:ring-slate-400"
      />
      <span className="text-slate-600 font-medium">Özel fonları dahil et</span>
    </label>
  )
}

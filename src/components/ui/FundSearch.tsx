'use client'

import { useState, useRef, useEffect } from 'react'
import type { FundInfo } from '@/lib/data/fund-types'
import { useFundLookup, useFundSearch } from '@/lib/hooks/useFundLookup'

interface FundSearchProps {
  value: string
  onChange: (code: string) => void
  placeholder?: string
  categoryFilter?: string
  besOnly?: boolean
}

export function FundSearch({ value, onChange, placeholder = 'Fon adı veya kodu yazın...', categoryFilter, besOnly }: FundSearchProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedFund = useFundLookup(value || undefined)
  const { results: filtered, loading } = useFundSearch(query, {
    category: categoryFilter,
    besOnly,
    limit: query.length > 0 ? 50 : 15,
  })

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelect(fund: FundInfo) {
    onChange(fund.code)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  function handleInputChange(val: string) {
    setQuery(val)
    setOpen(true)
  }

  function handleFocus() {
    setOpen(true)
  }

  function handleClear() {
    setQuery('')
    setOpen(false)
    onChange('')
    inputRef.current?.focus()
  }

  return (
    <div ref={containerRef} className="w-full max-w-md mx-auto">
      {/* Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={open ? query : (selectedFund ? `${selectedFund.code} - ${selectedFund.name}` : query)}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={(e) => {
            if (selectedFund && !open) {
              setQuery('')
            }
            handleFocus()
          }}
          placeholder={placeholder}
          className="w-full border border-border-strong rounded-lg px-4 py-2.5 text-body bg-surface font-medium focus:ring-2 focus:ring-slate-400 focus:border-slate-400 text-base pr-10"
          aria-label="Fon ara"
          aria-autocomplete="list"
          aria-expanded={open}
        />
        <button
          onClick={() => {
            if (value || query) {
              setQuery('')
              onChange('')
              setOpen(false)
            } else {
              setOpen(!open)
            }
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle hover:text-body"
          aria-label={value || query ? "Aramayı temizle" : "Arama menüsünü aç"}
        >
          {value || query ? '✕' : (
            <svg className={`w-4 h-4 transition ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>
      </div>

      {/* Results - in document flow, pushes content down */}
      {open && loading && query.length > 0 && (
        <div className="mt-1 border border-border-default rounded-lg bg-surface shadow-sm px-4 py-3 text-sm text-subtle animate-pulse">
          Aranıyor...
        </div>
      )}

      {open && !loading && filtered.length > 0 && (
        <ul className="mt-1 border border-border-default rounded-lg bg-surface shadow-sm overflow-y-auto max-h-80">
          {filtered.map((fund) => (
            <li key={fund.code}>
              <button
                onClick={() => handleSelect(fund)}
                className="w-full text-left px-4 py-2.5 hover:bg-surface-inset transition border-b border-border-default last:border-b-0"
                aria-label={`${fund.code} - ${fund.name} fonunu seç`}
              >
                <span className="font-semibold text-heading text-sm">{fund.code}</span>
                <span className="text-subtle mx-1.5">·</span>
                <span className="text-body text-sm">{fund.name}</span>
                <span className="text-subtle mx-1.5">·</span>
                <span className="text-xs text-subtle">{fund.category}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && !loading && query.length > 0 && filtered.length === 0 && (
        <div className="mt-1 border border-border-default rounded-lg bg-surface shadow-sm px-4 py-3 text-sm text-muted">
          Sonuç bulunamadı
        </div>
      )}
    </div>
  )
}

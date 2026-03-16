'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return <div className="w-9 h-9" /> // placeholder to avoid layout shift
  }

  return (
    <button
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-lg text-muted hover:text-heading hover:bg-surface-inset transition"
      aria-label={resolvedTheme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
    >
      {resolvedTheme === 'dark' ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  )
}

export function Header() {
  const [moreOpen, setMoreOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="border-b border-border-default bg-surface shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold text-heading">
            Göstergeç
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-5">
            <Link href="/funds" className="text-body hover:text-heading font-medium transition">
              Analiz
            </Link>
            <Link href="/compare" className="text-body hover:text-heading font-medium transition">
              Karşılaştır
            </Link>
            <Link href="/leaderboard" className="text-body hover:text-heading font-medium transition">
              Sıralama
            </Link>
            <Link href="/report-cards" className="text-body hover:text-heading font-medium transition">
              Karneler
            </Link>
            <Link href="/bes" className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 font-semibold transition">
              BES
            </Link>

            {/* More Dropdown */}
            <div className="relative" ref={moreRef}>
              <button
                onClick={() => setMoreOpen(!moreOpen)}
                className="text-body hover:text-heading font-medium transition flex items-center gap-1"
                aria-expanded={moreOpen}
                aria-label="Daha fazla menü"
              >
                Daha Fazla
                <svg className={`w-4 h-4 transition ${moreOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {moreOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-surface-overlay border border-border-default rounded-lg shadow-lg py-2 z-50">
                  <Link href="/heatmap" className="block px-4 py-2 text-body hover:bg-surface-inset hover:text-heading" onClick={() => setMoreOpen(false)}>
                    Sektör Haritası
                  </Link>
                  <Link href="/crypto" className="block px-4 py-2 text-body hover:bg-surface-inset hover:text-heading" onClick={() => setMoreOpen(false)}>
                    Kripto Karşılaştır
                  </Link>
                  <Link href="/real-estate" className="block px-4 py-2 text-body hover:bg-surface-inset hover:text-heading" onClick={() => setMoreOpen(false)}>
                    Gayrimenkul
                  </Link>
                </div>
              )}
            </div>

            <ThemeToggle />
          </nav>

          {/* Mobile: Theme toggle + Hamburger */}
          <div className="md:hidden flex items-center gap-1">
            <ThemeToggle />
            <button
              className="p-2 text-muted hover:text-heading"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-expanded={mobileOpen}
              aria-label="Menüyü aç"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <nav className="md:hidden pb-4 space-y-1">
            <Link href="/funds" className="block px-3 py-2 text-body hover:bg-surface-inset rounded-lg font-medium" onClick={() => setMobileOpen(false)}>
              Analiz
            </Link>
            <Link href="/compare" className="block px-3 py-2 text-body hover:bg-surface-inset rounded-lg font-medium" onClick={() => setMobileOpen(false)}>
              Karşılaştır
            </Link>
            <Link href="/leaderboard" className="block px-3 py-2 text-body hover:bg-surface-inset rounded-lg font-medium" onClick={() => setMobileOpen(false)}>
              Sıralama
            </Link>
            <Link href="/report-cards" className="block px-3 py-2 text-body hover:bg-surface-inset rounded-lg font-medium" onClick={() => setMobileOpen(false)}>
              Karneler
            </Link>
            <Link href="/bes" className="block px-3 py-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg font-semibold" onClick={() => setMobileOpen(false)}>
              BES
            </Link>
            <Link href="/heatmap" className="block px-3 py-2 text-body hover:bg-surface-inset rounded-lg font-medium" onClick={() => setMobileOpen(false)}>
              Sektör Haritası
            </Link>
            <Link href="/crypto" className="block px-3 py-2 text-body hover:bg-surface-inset rounded-lg font-medium" onClick={() => setMobileOpen(false)}>
              Kripto Karşılaştır
            </Link>
            <Link href="/real-estate" className="block px-3 py-2 text-body hover:bg-surface-inset rounded-lg font-medium" onClick={() => setMobileOpen(false)}>
              Gayrimenkul
            </Link>
          </nav>
        )}
      </div>
    </header>
  )
}

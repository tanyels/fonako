'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'

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
    <header className="border-b border-slate-200 bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold text-slate-800">
            Göstergeç
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-5">
            <Link href="/funds" className="text-slate-600 hover:text-slate-900 font-medium transition">
              Analiz
            </Link>
            <Link href="/compare" className="text-slate-600 hover:text-slate-900 font-medium transition">
              Karşılaştır
            </Link>
            <Link href="/leaderboard" className="text-slate-600 hover:text-slate-900 font-medium transition">
              Sıralama
            </Link>
            <Link href="/report-cards" className="text-slate-600 hover:text-slate-900 font-medium transition">
              Karneler
            </Link>
            <Link href="/bes" className="text-amber-600 hover:text-amber-700 font-semibold transition">
              BES
            </Link>

            {/* More Dropdown */}
            <div className="relative" ref={moreRef}>
              <button
                onClick={() => setMoreOpen(!moreOpen)}
                className="text-slate-600 hover:text-slate-900 font-medium transition flex items-center gap-1"
                aria-expanded={moreOpen}
                aria-label="Daha fazla menü"
              >
                Daha Fazla
                <svg className={`w-4 h-4 transition ${moreOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {moreOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-2 z-50">
                  <Link href="/heatmap" className="block px-4 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900" onClick={() => setMoreOpen(false)}>
                    Sektör Haritası
                  </Link>
                  <Link href="/crypto" className="block px-4 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900" onClick={() => setMoreOpen(false)}>
                    Kripto Karşılaştır
                  </Link>
                  <Link href="/real-estate" className="block px-4 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900" onClick={() => setMoreOpen(false)}>
                    Gayrimenkul
                  </Link>
                </div>
              )}
            </div>
          </nav>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden p-2 text-slate-600 hover:text-slate-900"
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

        {/* Mobile Menu */}
        {mobileOpen && (
          <nav className="md:hidden pb-4 space-y-1">
            <Link href="/funds" className="block px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium" onClick={() => setMobileOpen(false)}>
              Analiz
            </Link>
            <Link href="/compare" className="block px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium" onClick={() => setMobileOpen(false)}>
              Karşılaştır
            </Link>
            <Link href="/leaderboard" className="block px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium" onClick={() => setMobileOpen(false)}>
              Sıralama
            </Link>
            <Link href="/report-cards" className="block px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium" onClick={() => setMobileOpen(false)}>
              Karneler
            </Link>
            <Link href="/bes" className="block px-3 py-2 text-amber-600 hover:bg-amber-50 rounded-lg font-semibold" onClick={() => setMobileOpen(false)}>
              BES
            </Link>
            <Link href="/heatmap" className="block px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium" onClick={() => setMobileOpen(false)}>
              Sektör Haritası
            </Link>
            <Link href="/crypto" className="block px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium" onClick={() => setMobileOpen(false)}>
              Kripto Karşılaştır
            </Link>
            <Link href="/real-estate" className="block px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium" onClick={() => setMobileOpen(false)}>
              Gayrimenkul
            </Link>
          </nav>
        )}
      </div>
    </header>
  )
}

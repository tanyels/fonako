'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { useTefasFilter } from '@/lib/context/TefasFilterContext'

export function Header() {
  const [lang, setLang] = useState<'tr' | 'en'>('tr')
  const [moreOpen, setMoreOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { showOnlyTefas, setShowOnlyTefas } = useTefasFilter()
  const mobileMenuRef = useRef<HTMLDivElement>(null)

  // Close mobile menu on route change (link click)
  const closeMobile = () => setMobileOpen(false)

  // Close mobile menu when clicking outside
  useEffect(() => {
    if (!mobileOpen) return
    function handleClick(e: MouseEvent) {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [mobileOpen])

  const navLinks = [
    { href: '/funds', label: lang === 'tr' ? 'Analiz' : 'Analysis' },
    { href: '/compare', label: lang === 'tr' ? 'Karşılaştır' : 'Compare' },
    { href: '/leaderboard', label: lang === 'tr' ? 'Sıralama' : 'Rankings' },
    { href: '/report-cards', label: lang === 'tr' ? 'Karneler' : 'Grades' },
    { href: '/bes', label: 'BES', highlight: true },
  ]

  const moreLinks = [
    { href: '/heatmap', label: lang === 'tr' ? 'Sektör Haritası' : 'Sector Heatmap' },
    { href: '/crypto', label: lang === 'tr' ? 'Kripto Karşılaştır' : 'Crypto Compare' },
    { href: '/real-estate', label: lang === 'tr' ? 'Gayrimenkul' : 'Real Estate' },
    { href: '/recommend/score', label: lang === 'tr' ? 'Fon Skorlama' : 'Fund Scoring' },
    { href: '/recommend/projection', label: 'Monte Carlo' },
    { href: '/recommend/portfolio', label: lang === 'tr' ? 'Portföy' : 'Portfolio' },
    { href: '/recommend/profile', label: lang === 'tr' ? 'Profil Eşleştir' : 'Profile Match' },
    { href: '/recommend/macro', label: lang === 'tr' ? 'Makro Rejim' : 'Macro Regime' },
  ]

  return (
    <header className="border-b border-slate-200 bg-white shadow-sm relative" ref={mobileMenuRef}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold text-slate-800">
            Göstergeç
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-5">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={link.highlight
                  ? 'text-amber-600 hover:text-amber-700 font-semibold transition'
                  : 'text-slate-600 hover:text-slate-900 font-medium transition'
                }
              >
                {link.label}
              </Link>
            ))}

            {/* More Dropdown */}
            <div className="relative">
              <button
                onClick={() => setMoreOpen(!moreOpen)}
                className="text-slate-600 hover:text-slate-900 font-medium transition flex items-center gap-1"
              >
                {lang === 'tr' ? 'Daha Fazla' : 'More'}
                <svg className={`w-4 h-4 transition ${moreOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {moreOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-2 z-50">
                  {moreLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="block px-4 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      onClick={() => setMoreOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* Toggles + Hamburger */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowOnlyTefas(!showOnlyTefas)}
              className={`px-3 py-1.5 text-sm font-medium border rounded-md transition ${
                showOnlyTefas
                  ? 'border-slate-300 text-slate-700 hover:bg-slate-100'
                  : 'border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
              title={showOnlyTefas ? 'Sadece TEFAS fonları gösteriliyor' : 'Tüm fonlar gösteriliyor (özel fonlar dahil)'}
            >
              {showOnlyTefas ? 'TEFAS' : 'Tümü'}
            </button>
            <button
              onClick={() => setLang(lang === 'tr' ? 'en' : 'tr')}
              className="px-3 py-1.5 text-sm font-medium border border-slate-300 rounded-md hover:bg-slate-100 text-slate-700 transition"
            >
              {lang === 'tr' ? 'EN' : 'TR'}
            </button>

            {/* Hamburger - mobile only */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 transition"
              aria-label="Menüyü aç"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-slate-200 bg-white shadow-lg absolute left-0 right-0 z-50">
          <div className="container mx-auto px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMobile}
                className={`block px-3 py-2.5 rounded-lg font-medium transition ${
                  link.highlight
                    ? 'text-amber-600 hover:bg-amber-50'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="border-t border-slate-100 my-2" />
            <p className="px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {lang === 'tr' ? 'Daha Fazla' : 'More'}
            </p>
            {moreLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMobile}
                className="block px-3 py-2.5 rounded-lg text-slate-600 hover:bg-slate-50 font-medium transition"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  )
}

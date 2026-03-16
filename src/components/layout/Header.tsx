'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useTefasFilter } from '@/lib/context/TefasFilterContext'

export function Header() {
  const [lang, setLang] = useState<'tr' | 'en'>('tr')
  const [moreOpen, setMoreOpen] = useState(false)
  const { showOnlyTefas, setShowOnlyTefas } = useTefasFilter()

  return (
    <header className="border-b border-slate-200 bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold text-slate-800">
            Göstergeç
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-5">
            <Link
              href="/funds"
              className="text-slate-600 hover:text-slate-900 font-medium transition"
            >
              {lang === 'tr' ? 'Analiz' : 'Analysis'}
            </Link>
            <Link
              href="/compare"
              className="text-slate-600 hover:text-slate-900 font-medium transition"
            >
              {lang === 'tr' ? 'Karşılaştır' : 'Compare'}
            </Link>
            <Link
              href="/leaderboard"
              className="text-slate-600 hover:text-slate-900 font-medium transition"
            >
              {lang === 'tr' ? 'Sıralama' : 'Rankings'}
            </Link>
            <Link
              href="/report-cards"
              className="text-slate-600 hover:text-slate-900 font-medium transition"
            >
              {lang === 'tr' ? 'Karneler' : 'Grades'}
            </Link>
            <Link
              href="/bes"
              className="text-amber-600 hover:text-amber-700 font-semibold transition"
            >
              BES
            </Link>

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
                  <Link
                    href="/heatmap"
                    className="block px-4 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    onClick={() => setMoreOpen(false)}
                  >
                    {lang === 'tr' ? '🗺️ Sektör Haritası' : '🗺️ Sector Heatmap'}
                  </Link>
                  <Link
                    href="/crypto"
                    className="block px-4 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    onClick={() => setMoreOpen(false)}
                  >
                    {lang === 'tr' ? '₿ Kripto Karşılaştır' : '₿ Crypto Compare'}
                  </Link>
                  <Link
                    href="/real-estate"
                    className="block px-4 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    onClick={() => setMoreOpen(false)}
                  >
                    {lang === 'tr' ? '🏠 Gayrimenkul' : '🏠 Real Estate'}
                  </Link>
                  <div className="border-t border-slate-100 my-1" />
                  <Link
                    href="/recommend/score"
                    className="block px-4 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    onClick={() => setMoreOpen(false)}
                  >
                    {lang === 'tr' ? '🏆 Fon Skorlama' : '🏆 Fund Scoring'}
                  </Link>
                  <Link
                    href="/recommend/projection"
                    className="block px-4 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    onClick={() => setMoreOpen(false)}
                  >
                    {lang === 'tr' ? '📊 Monte Carlo' : '📊 Monte Carlo'}
                  </Link>
                  <Link
                    href="/recommend/portfolio"
                    className="block px-4 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    onClick={() => setMoreOpen(false)}
                  >
                    {lang === 'tr' ? '💼 Portföy' : '💼 Portfolio'}
                  </Link>
                  <Link
                    href="/recommend/profile"
                    className="block px-4 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    onClick={() => setMoreOpen(false)}
                  >
                    {lang === 'tr' ? '👤 Profil Eşleştir' : '👤 Profile Match'}
                  </Link>
                  <Link
                    href="/recommend/macro"
                    className="block px-4 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    onClick={() => setMoreOpen(false)}
                  >
                    {lang === 'tr' ? '🌍 Makro Rejim' : '🌍 Macro Regime'}
                  </Link>
                </div>
              )}
            </div>
          </nav>

          {/* Toggles */}
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
          </div>
        </div>
      </div>
    </header>
  )
}

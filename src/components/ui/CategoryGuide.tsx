'use client'

import Link from 'next/link'
import { useHomeData } from '@/lib/hooks/useHomeData'

const EMOJI_MAP: Record<string, string> = {
  'Altın': '🥇',
  'Hisse': '📈',
  'Tahvil': '📄',
  'Para Piyasası': '💵',
  'Döviz': '💱',
  'Yabancı Hisse': '🌍',
  'Karma': '🎯',
  'Katılım': '🌙',
  'Emeklilik': '🏦',
  'Serbest': '🔓',
  'Değişken': '🔀',
  'Fon Sepeti': '🧺',
  'Diğer': '📊',
}

function CategorySkeleton() {
  return (
    <div className="bg-surface border border-border-default rounded-xl p-4 animate-pulse w-[140px] shrink-0 snap-start md:w-auto md:shrink">
      <div className="h-8 w-8 bg-surface-inset rounded mx-auto mb-2" />
      <div className="h-4 w-16 bg-surface-inset rounded mx-auto mb-1" />
      <div className="h-6 w-12 bg-surface-inset rounded mx-auto mb-1" />
      <div className="h-3 w-14 bg-surface-inset rounded mx-auto" />
    </div>
  )
}

export function CategoryGuide() {
  const { categories, loading } = useHomeData()

  // Take top 6 by fund count
  const top6 = categories.slice(0, 6)

  // Don't render empty section if data failed to load
  if (!loading && top6.length === 0) return null

  return (
    <section className="py-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-heading">Kategori Kılavuzu</h2>
        <p className="text-muted mt-1">Fon kategorilerini keşfedin, gerçek getirileri karşılaştırın</p>
      </div>

      {loading ? (
        <div className="flex -mx-4 px-4 overflow-x-auto snap-x snap-mandatory md:grid md:grid-cols-3 lg:grid-cols-6 md:gap-4 md:mx-0 md:px-0 md:overflow-visible gap-3 scrollbar-hide">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <CategorySkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="flex -mx-4 px-4 overflow-x-auto snap-x snap-mandatory md:grid md:grid-cols-3 lg:grid-cols-6 md:gap-4 md:mx-0 md:px-0 md:overflow-visible gap-3 scrollbar-hide">
          {top6.map((cat) => (
            <Link
              key={cat.slug}
              href={`/leaderboard?category=${encodeURIComponent(cat.slug)}`}
              className="bg-surface border border-border-default rounded-xl p-4 hover:shadow-md hover:border-border-strong hover:-translate-y-1 transition-all duration-200 text-center group w-[140px] shrink-0 snap-start md:w-auto md:shrink"
            >
              <span className="text-3xl block mb-2 group-hover:scale-110 transition-transform">
                {EMOJI_MAP[cat.name] || '📊'}
              </span>
              <h3 className="font-semibold text-heading text-sm group-hover:text-brand-600 dark:group-hover:text-brand-400 transition">
                {cat.name}
              </h3>
              <p className={`text-lg font-bold mt-1 ${cat.avgUsdReturn >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {cat.avgUsdReturn >= 0 ? '+' : ''}{cat.avgUsdReturn.toFixed(1)}%
              </p>
              <p className="text-xs text-muted">USD 1Y ort.</p>
              <p className="text-xs text-subtle mt-1">{cat.fundCount} fon</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

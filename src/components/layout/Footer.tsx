import Link from 'next/link'

const NAV_LINKS = [
  { label: 'Fon Analizi', href: '/funds' },
  { label: 'Sıralama', href: '/leaderboard' },
  { label: 'Karşılaştırma', href: '/compare' },
  { label: 'Hesaplayıcı', href: '/calculator' },
  { label: 'Tavsiye', href: '/recommend' },
  { label: 'BES', href: '/bes' },
]

const DATA_SOURCES = ['TCMB', 'TEFAS', 'BEFAS', 'Yahoo Finance']

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border-default bg-surface py-10">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <p className="font-bold text-heading text-lg">Göstergeç</p>
            <p className="text-muted text-sm mt-2 leading-relaxed">
              Türkiye&apos;deki yatırım fonlarının gerçek performansını TL, USD, EUR ve altın
              bazında analiz eden bağımsız platform.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <p className="font-semibold text-heading text-sm mb-3">Sayfalar</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-muted text-sm hover:text-heading transition"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Data Sources */}
          <div>
            <p className="font-semibold text-heading text-sm mb-3">Veri Kaynakları</p>
            <div className="flex flex-wrap gap-2">
              {DATA_SOURCES.map((src) => (
                <span
                  key={src}
                  className="text-xs px-2.5 py-1 rounded-full bg-surface-inset text-muted font-medium"
                >
                  {src}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-border-default flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-subtle text-xs">
            &copy; {year} Göstergeç. Tüm veriler bilgilendirme amaçlıdır, yatırım tavsiyesi
            değildir.
          </p>
          <p className="text-subtle text-xs">
            Fiyatlar 15 dk gecikmelidir.
          </p>
        </div>
      </div>
    </footer>
  )
}

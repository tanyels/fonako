import Link from 'next/link'
import { LiveTicker } from '@/components/ui/LiveTicker'
import { StatsBar } from '@/components/ui/StatsBar'
import { DataFreshness } from '@/components/ui/DataFreshness'
import { HeroVisual } from '@/components/ui/HeroVisual'
import { CategoryGuide } from '@/components/ui/CategoryGuide'
import { FundHighlights } from '@/components/ui/FundHighlights'
import { HowItWorks } from '@/components/ui/HowItWorks'

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-10">
      <LiveTicker />

      {/* Above-the-fold CTA */}
      <div className="text-center">
        <Link
          href="/funds"
          className="inline-flex items-center gap-2 px-6 py-3 bg-heading text-surface rounded-xl text-lg font-semibold hover:opacity-90 transition shadow-md"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          Fonunuzu Analiz Edin
        </Link>
      </div>

      <div>
        <StatsBar />
        <DataFreshness />
      </div>
      <HeroVisual />

      {/* Calculator CTA */}
      <div className="text-center">
        <Link
          href="/funds"
          className="inline-flex items-center gap-2 text-body hover:text-heading font-medium transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V13.5Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V18Zm2.498-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V18Zm2.504-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5Zm2.498-2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5ZM6 6.75A.75.75 0 0 1 6.75 6h10.5a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-.75.75H6.75A.75.75 0 0 1 6 9V6.75Z" />
          </svg>
          Detaylı hesaplama aracına git →
        </Link>
      </div>

      <CategoryGuide />
      <FundHighlights />
      <HowItWorks />

      {/* SEO Section */}
      <section className="max-w-3xl mx-auto text-center py-8">
        <h2 className="text-xl font-bold text-heading mb-3">Göstergeç Nedir?</h2>
        <p className="text-muted leading-relaxed">
          Göstergeç, Türkiye&apos;deki yatırım fonlarının gerçek performansını ortaya koyan bağımsız bir analiz platformudur.
          TL bazlı getiriler çoğu zaman yanıltıcı olabilir; Göstergeç, fonlarınızı USD, EUR ve altın gibi farklı para birimlerinde
          değerlendirerek gerçek kazancınızı veya kaybınızı gösterir. 10 yılı aşkın geçmişe dönük veri ile 2400&apos;den fazla fonu
          karşılaştırabilir, kategorilere göre sıralayabilir ve bilinçli yatırım kararları alabilirsiniz.
        </p>
      </section>
    </div>
  )
}

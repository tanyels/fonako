import { MonteCarloProjection } from '@/components/recommend/MonteCarloProjection'

export default function ProjectionPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Monte Carlo Projeksiyon</h1>
        <p className="text-slate-600 mb-8">
          Seçtiğiniz fona düzenli yatırım yaparsanız ne olur? 1000 farklı senaryo simüle edilerek
          olası sonuçlar ve hedefe ulaşma olasılığı hesaplanır.
        </p>
        <MonteCarloProjection />
      </div>
    </main>
  )
}

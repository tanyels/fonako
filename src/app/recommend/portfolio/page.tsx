import { PortfolioOptimizer } from '@/components/recommend/PortfolioOptimizer'

export default function PortfolioPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Portföy Optimizer</h1>
        <p className="text-slate-600 mb-8">
          Risk seviyenize göre en iyi çeşitlendirilmiş fon portföyünü oluşturun.
          Çakışmayı minimize eden ve getiriyi optimize eden greedy algoritma kullanılır.
        </p>
        <PortfolioOptimizer />
      </div>
    </main>
  )
}

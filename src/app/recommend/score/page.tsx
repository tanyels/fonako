import { ScoreRecommender } from '@/components/recommend/ScoreRecommender'

export default function ScorePage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Fon Skorlama</h1>
        <p className="text-slate-600 mb-8">
          Risk toleransınıza göre fonları 5 farklı kriterde puanlayın: getiri, tutarlılık, büyüklük, popülerlik ve risk.
          Her fon 0-100 arası bir toplam skor alır.
        </p>
        <ScoreRecommender />
      </div>
    </main>
  )
}

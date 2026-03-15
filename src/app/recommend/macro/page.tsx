import { MacroRecommender } from '@/components/recommend/MacroRecommender'

export default function MacroPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Makro Rejim Analizi</h1>
        <p className="text-slate-600 mb-8">
          Makroekonomik beklentilerinize göre hangi fon kategorilerinin öne çıkacağını görün.
          Enflasyon, döviz, faiz ve borsa beklentilerinizi seçin.
        </p>
        <MacroRecommender />
      </div>
    </main>
  )
}

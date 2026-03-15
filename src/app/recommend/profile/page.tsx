import { ProfileRecommender } from '@/components/recommend/ProfileRecommender'

export default function ProfilePage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Yatırımcı Profili</h1>
        <p className="text-slate-600 mb-8">
          5 sorudan oluşan kısa anketimizle yatırımcı profilinizi belirleyin ve
          size uygun fonları keşfedin.
        </p>
        <ProfileRecommender />
      </div>
    </main>
  )
}

'use client'

import { useState } from 'react'

interface AgeGroup {
  range: string
  title: string
  description: string
  riskLevel: 'high' | 'medium' | 'low'
  recommendations: Recommendation[]
  allocation: Allocation
}

interface Recommendation {
  text: string
  priority: 'must' | 'should' | 'consider'
}

interface Allocation {
  gold: number
  foreign: number
  equity: number
  bond: number
  money: number
}

const AGE_GROUPS: AgeGroup[] = [
  {
    range: '25-35',
    title: 'Genç Yatırımcı',
    description: 'Uzun vade, yüksek risk kapasitesi',
    riskLevel: 'high',
    recommendations: [
      { text: 'USD bazlı getiri sağlayan fonlara odaklanın', priority: 'must' },
      { text: 'Altın ve döviz fonları ağırlıklı olsun', priority: 'must' },
      { text: 'Yabancı hisse fonlarını değerlendirin', priority: 'should' },
      { text: 'TL tahvil fonlarından uzak durun', priority: 'must' },
      { text: 'Kripto pozisyon için küçük bir pay ayırın', priority: 'consider' },
    ],
    allocation: { gold: 35, foreign: 30, equity: 20, bond: 5, money: 10 },
  },
  {
    range: '35-45',
    title: 'Orta Yaş Yatırımcı',
    description: 'Dengeli büyüme, orta risk',
    riskLevel: 'medium',
    recommendations: [
      { text: 'Portföy çeşitlendirmesine önem verin', priority: 'must' },
      { text: 'Altın fonları ana omurga olsun', priority: 'must' },
      { text: 'Döviz fonları ile TL riskini dengeyin', priority: 'should' },
      { text: 'Hisse fonları %20\'yi geçmesin', priority: 'should' },
      { text: 'Emekliliğe kalan süreyi hesaplayın', priority: 'consider' },
    ],
    allocation: { gold: 30, foreign: 25, equity: 15, bond: 15, money: 15 },
  },
  {
    range: '45-55',
    title: 'Emekliliğe Hazırlık',
    description: 'Sermaye koruma, düşük-orta risk',
    riskLevel: 'low',
    recommendations: [
      { text: 'Sermaye korumasını ön planda tutun', priority: 'must' },
      { text: 'Döviz ve altın ağırlığını artırın', priority: 'must' },
      { text: 'Hisse fonlarını kademeli azaltın', priority: 'should' },
      { text: 'BES\'ten çıkış stratejisi planlayın', priority: 'should' },
      { text: 'Vergi avantajlarını değerlendirin', priority: 'consider' },
    ],
    allocation: { gold: 35, foreign: 30, equity: 10, bond: 10, money: 15 },
  },
  {
    range: '55+',
    title: 'Emeklilik Dönemi',
    description: 'Maksimum koruma, minimum risk',
    riskLevel: 'low',
    recommendations: [
      { text: 'Anaparanızı korumak en önemli öncelik', priority: 'must' },
      { text: 'Döviz ve altın fonları ağırlıklı olsun', priority: 'must' },
      { text: 'Hisse fonlarını minimize edin', priority: 'must' },
      { text: 'Cezasız çıkış hakkınızı değerlendirin', priority: 'should' },
      { text: 'Kısmi çekim stratejisi uygulayın', priority: 'consider' },
    ],
    allocation: { gold: 40, foreign: 35, equity: 5, bond: 10, money: 10 },
  },
]

export function AgeRecommendations() {
  const [selectedAge, setSelectedAge] = useState('35-45')
  const [userAge, setUserAge] = useState('40')

  const ageGroup = AGE_GROUPS.find(g => g.range === selectedAge) || AGE_GROUPS[1]

  return (
    <div className="bg-surface border border-border-default rounded-xl p-6 shadow-sm">
      <p className="text-body mb-6">
        Yaşınıza göre BES fon dağılımı önerileri. Risk toleransınızı göz önünde bulundurun.
        <span className="block text-sm text-muted mt-1">
          Age-based pension fund allocation recommendations.
        </span>
      </p>

      {/* Age Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-body mb-2">
          Yaşınız / Your Age
        </label>
        <div className="flex gap-4 items-center">
          <input
            type="number"
            value={userAge}
            onChange={(e) => {
              setUserAge(e.target.value)
              const age = parseInt(e.target.value)
              if (age < 35) setSelectedAge('25-35')
              else if (age < 45) setSelectedAge('35-45')
              else if (age < 55) setSelectedAge('45-55')
              else setSelectedAge('55+')
            }}
            className="w-24 border border-border-strong rounded-lg px-3 py-2 text-body"
            min="18"
            max="80"
          />
          <div className="flex gap-2">
            {AGE_GROUPS.map((g) => (
              <button
                key={g.range}
                onClick={() => setSelectedAge(g.range)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  selectedAge === g.range
                    ? 'bg-heading text-surface'
                    : 'bg-surface-inset text-body hover:bg-surface-inset'
                }`}
              >
                {g.range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Age Group Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Recommendations */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-xl font-bold text-heading">{ageGroup.title}</h3>
            <span className={`px-2 py-1 rounded text-xs font-semibold ${
              ageGroup.riskLevel === 'high' ? 'bg-red-100 text-red-700' :
              ageGroup.riskLevel === 'medium' ? 'bg-amber-100 text-amber-700' :
              'bg-emerald-100 text-emerald-700'
            }`}>
              {ageGroup.riskLevel === 'high' ? 'Yüksek Risk' :
               ageGroup.riskLevel === 'medium' ? 'Orta Risk' : 'Düşük Risk'}
            </span>
          </div>
          <p className="text-body mb-4">{ageGroup.description}</p>

          <h4 className="font-semibold text-heading mb-3">Öneriler</h4>
          <ul className="space-y-2">
            {ageGroup.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                  rec.priority === 'must' ? 'bg-red-100 text-red-700' :
                  rec.priority === 'should' ? 'bg-amber-100 text-amber-700' :
                  'bg-surface-inset text-body'
                }`}>
                  {rec.priority === 'must' ? '!' : rec.priority === 'should' ? '•' : '?'}
                </span>
                <span className="text-body">{rec.text}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 text-xs text-muted">
            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-100"></span> Mutlaka</span>
            <span className="inline-flex items-center gap-1 ml-3"><span className="w-3 h-3 rounded-full bg-amber-100"></span> Tavsiye</span>
            <span className="inline-flex items-center gap-1 ml-3"><span className="w-3 h-3 rounded-full bg-surface-inset"></span> Düşünülebilir</span>
          </div>
        </div>

        {/* Right: Allocation Chart */}
        <div>
          <h4 className="font-semibold text-heading mb-4">Önerilen Dağılım</h4>

          <div className="space-y-3">
            <AllocationBar label="Altın Fonları" value={ageGroup.allocation.gold} color="bg-amber-400" />
            <AllocationBar label="Yabancı/Döviz" value={ageGroup.allocation.foreign} color="bg-blue-400" />
            <AllocationBar label="Hisse Fonları" value={ageGroup.allocation.equity} color="bg-emerald-400" />
            <AllocationBar label="Tahvil Fonları" value={ageGroup.allocation.bond} color="bg-purple-400" />
            <AllocationBar label="Para Piyasası" value={ageGroup.allocation.money} color="bg-slate-400" />
          </div>

          {/* Pie-like visual */}
          <div className="mt-6 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full relative overflow-hidden"
              style={{
                background: `conic-gradient(
                  #f59e0b 0% ${ageGroup.allocation.gold}%,
                  #3b82f6 ${ageGroup.allocation.gold}% ${ageGroup.allocation.gold + ageGroup.allocation.foreign}%,
                  #10b981 ${ageGroup.allocation.gold + ageGroup.allocation.foreign}% ${ageGroup.allocation.gold + ageGroup.allocation.foreign + ageGroup.allocation.equity}%,
                  #8b5cf6 ${ageGroup.allocation.gold + ageGroup.allocation.foreign + ageGroup.allocation.equity}% ${ageGroup.allocation.gold + ageGroup.allocation.foreign + ageGroup.allocation.equity + ageGroup.allocation.bond}%,
                  #64748b ${ageGroup.allocation.gold + ageGroup.allocation.foreign + ageGroup.allocation.equity + ageGroup.allocation.bond}% 100%
                )`
              }}>
              <div className="absolute inset-4 bg-surface rounded-full flex items-center justify-center">
                <span className="text-xs font-semibold text-body">Dağılım</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className="mt-6 p-4 bg-surface-inset rounded-lg">
        <p className="text-sm text-body">
          ⚠️ <strong>Önemli:</strong> Bu öneriler genel bilgi amaçlıdır. Kişisel mali durumunuz,
          risk toleransınız ve hedefleriniz farklı olabilir. Profesyonel bir danışmana başvurmanızı öneririz.
        </p>
      </div>
    </div>
  )
}

function AllocationBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-body">{label}</span>
        <span className="font-semibold text-heading">{value}%</span>
      </div>
      <div className="h-3 bg-surface-inset rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

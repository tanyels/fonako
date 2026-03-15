import type { FundDetail, FundReturn, ProfileResult } from './types'

export interface SurveyAnswers {
  purpose: 1 | 2 | 3       // Yatırım amacı: koruma / büyüme / maks getiri
  riskComfort: 1 | 2 | 3   // Risk rahatlığı: -10% / -20% / -30%
  timeHorizon: 1 | 2 | 3   // Zaman ufku: <2y / 2-5y / >5y
  incomeStability: 1 | 2 | 3 // Gelir istikrarı
  marketView: 1 | 2 | 3    // Piyasa görüşü
}

export const SURVEY_QUESTIONS = [
  {
    key: 'purpose' as const,
    question: 'Yatırım amacınız nedir?',
    options: [
      { value: 1 as const, label: 'Paramı korumak istiyorum', description: 'Enflasyona karşı değer kaybetmemek' },
      { value: 2 as const, label: 'Dengeli büyüme istiyorum', description: 'Orta vadede değer artışı' },
      { value: 3 as const, label: 'Maksimum getiri istiyorum', description: 'Yüksek risk, yüksek potansiyel' },
    ],
  },
  {
    key: 'riskComfort' as const,
    question: 'Portföyünüz bir ayda ne kadar değer kaybetse rahatsız olursunuz?',
    options: [
      { value: 1 as const, label: '%10 kayıp bile çok', description: 'Düşük risk toleransı' },
      { value: 2 as const, label: '%20\'ye kadar dayanabilirim', description: 'Orta risk toleransı' },
      { value: 3 as const, label: '%30+ olsa bile sorun değil', description: 'Yüksek risk toleransı' },
    ],
  },
  {
    key: 'timeHorizon' as const,
    question: 'Yatırım süreniz ne kadar?',
    options: [
      { value: 1 as const, label: '2 yıldan az', description: 'Kısa vadeli' },
      { value: 2 as const, label: '2-5 yıl', description: 'Orta vadeli' },
      { value: 3 as const, label: '5 yıldan fazla', description: 'Uzun vadeli' },
    ],
  },
  {
    key: 'incomeStability' as const,
    question: 'Gelir durumunuz nasıl?',
    options: [
      { value: 1 as const, label: 'Değişken / düzensiz gelir', description: 'Likit kalma öncelikli' },
      { value: 2 as const, label: 'Düzenli ama sınırlı', description: 'Dengeli yaklaşım' },
      { value: 3 as const, label: 'Yüksek ve istikrarlı gelir', description: 'Agresif yatırım kapasitesi' },
    ],
  },
  {
    key: 'marketView' as const,
    question: 'Önümüzdeki dönem piyasa beklentiniz?',
    options: [
      { value: 1 as const, label: 'Belirsizlik / durgunluk', description: 'Savunmacı strateji' },
      { value: 2 as const, label: 'Yatay / nötr', description: 'Dengeli dağılım' },
      { value: 3 as const, label: 'Yükseliş bekliyorum', description: 'Agresif pozisyon' },
    ],
  },
]

interface ProfileDef {
  name: string
  description: string
  minScore: number
  maxScore: number
  rules: Record<string, string>
  matchFn: (alloc: Record<string, number>) => boolean
}

const PROFILES: ProfileDef[] = [
  {
    name: 'Muhafazakar',
    description: 'Sermaye koruma odaklı, düşük riskli yatırım stratejisi. Tahvil, mevduat ve repo ağırlıklı fonlar.',
    minScore: 5,
    maxScore: 7,
    rules: { 'tahvil+mevduat+repo': '> %60' },
    matchFn: (alloc) => {
      const safe = (alloc['tahvil'] ?? 0) + (alloc['mevduat'] ?? 0) + (alloc['repo'] ?? 0) + (alloc['devlet tahvili'] ?? 0) + (alloc['özel sektör tahvili'] ?? 0)
      return safe > 60
    },
  },
  {
    name: 'Dengeli',
    description: 'Hisse ve tahvil dengesi ile hem büyüme hem koruma. Orta riskli portföy.',
    minScore: 8,
    maxScore: 9,
    rules: { 'hisse': '%20-%50', 'tahvil': '%20-%50' },
    matchFn: (alloc) => {
      const equity = (alloc['hisse'] ?? 0) + (alloc['hisse senedi'] ?? 0)
      const bond = (alloc['tahvil'] ?? 0) + (alloc['devlet tahvili'] ?? 0) + (alloc['özel sektör tahvili'] ?? 0)
      return equity >= 20 && equity <= 50 && bond >= 20 && bond <= 50
    },
  },
  {
    name: 'Büyüme',
    description: 'Hisse senedi ağırlıklı, uzun vadeli büyüme hedefli. Orta-yüksek risk.',
    minScore: 10,
    maxScore: 11,
    rules: { 'hisse': '> %50' },
    matchFn: (alloc) => {
      const equity = (alloc['hisse'] ?? 0) + (alloc['hisse senedi'] ?? 0)
      return equity > 50
    },
  },
  {
    name: 'Enflasyon Koruması',
    description: 'Kıymetli maden ve döviz ağırlıklı, enflasyona karşı koruma stratejisi.',
    minScore: 12,
    maxScore: 13,
    rules: { 'kıymetli maden+döviz': '> %40' },
    matchFn: (alloc) => {
      const hedge = (alloc['altın'] ?? 0) + (alloc['kıymetli maden'] ?? 0) + (alloc['döviz'] ?? 0) + (alloc['eurobond'] ?? 0)
      return hedge > 40
    },
  },
  {
    name: 'Agresif',
    description: 'Yabancı hisse ve serbest fonlar ağırlıklı, maksimum getiri hedefli. Yüksek risk.',
    minScore: 14,
    maxScore: 15,
    rules: { 'yabancı hisse+serbest': '> %30' },
    matchFn: (alloc) => {
      const aggressive = (alloc['yabancı hisse'] ?? 0) + (alloc['serbest'] ?? 0) + (alloc['yabancı hisse senedi'] ?? 0)
      return aggressive > 30
    },
  },
]

export function getProfile(answers: SurveyAnswers): ProfileDef {
  const total = answers.purpose + answers.riskComfort + answers.timeHorizon + answers.incomeStability + answers.marketView
  const profile = PROFILES.find((p) => total >= p.minScore && total <= p.maxScore)
  return profile ?? PROFILES[0]
}

export function matchFundsToProfile(
  answers: SurveyAnswers,
  fundDetails: FundDetail[],
  fundReturns: FundReturn[],
): ProfileResult {
  const profile = getProfile(answers)
  const total = answers.purpose + answers.riskComfort + answers.timeHorizon + answers.incomeStability + answers.marketView

  // Build return lookup (1Y USD)
  const returnMap = new Map<string, number>()
  fundReturns.forEach((fr) => {
    if (fr.period === '1Y' && fr.usd_return !== null) {
      returnMap.set(fr.fund_code, fr.usd_return)
    }
  })

  // Match funds using asset_allocation
  const matched: { code: string; name: string; category: string; returnUsd: number }[] = []

  fundDetails.forEach((d) => {
    if (d.asset_allocation && profile.matchFn(d.asset_allocation)) {
      matched.push({
        code: d.fund_code,
        name: d.name,
        category: d.category,
        returnUsd: returnMap.get(d.fund_code) ?? 0,
      })
    }
  })

  // If no asset_allocation data, fallback: match by category heuristic
  if (matched.length === 0) {
    const categoryMap: Record<string, string[]> = {
      'Muhafazakar': ['Tahvil', 'Para Piyasası'],
      'Dengeli': ['Karma', 'Tahvil', 'Hisse'],
      'Büyüme': ['Hisse'],
      'Enflasyon Koruması': ['Altın', 'Döviz'],
      'Agresif': ['Yabancı Hisse', 'Hisse'],
    }
    const targetCategories = categoryMap[profile.name] ?? []

    fundDetails.forEach((d) => {
      if (targetCategories.includes(d.category)) {
        matched.push({
          code: d.fund_code,
          name: d.name,
          category: d.category,
          returnUsd: returnMap.get(d.fund_code) ?? 0,
        })
      }
    })
  }

  // Sort by USD return, take top 10
  matched.sort((a, b) => b.returnUsd - a.returnUsd)

  return {
    profileName: profile.name,
    profileDescription: profile.description,
    score: total,
    rules: profile.rules,
    matchedFunds: matched.slice(0, 10),
  }
}

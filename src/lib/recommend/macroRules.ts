import type { MacroDirection, MacroCategoryScore } from './types'

interface MacroInputs {
  inflation: MacroDirection
  usdTry: MacroDirection
  interest: MacroDirection
  bist: MacroDirection
}

// category × factor × direction → delta
const RULES: Record<string, Record<string, Record<MacroDirection, number>>> = {
  'Altın': {
    inflation: { up: 30, stable: 0, down: -15 },
    usdTry: { up: 15, stable: 0, down: -10 },
    interest: { up: -10, stable: 0, down: 10 },
    bist: { up: -10, stable: 0, down: 15 },
  },
  'Hisse': {
    inflation: { up: -15, stable: 5, down: 10 },
    usdTry: { up: -20, stable: 5, down: 15 },
    interest: { up: -20, stable: 0, down: 25 },
    bist: { up: 40, stable: 5, down: -35 },
  },
  'Yabancı Hisse': {
    inflation: { up: 5, stable: 0, down: -5 },
    usdTry: { up: 30, stable: 0, down: -25 },
    interest: { up: -10, stable: 0, down: 10 },
    bist: { up: 5, stable: 0, down: 10 },
  },
  'Tahvil': {
    inflation: { up: -20, stable: 5, down: 15 },
    usdTry: { up: -10, stable: 5, down: 10 },
    interest: { up: -30, stable: 0, down: 30 },
    bist: { up: -5, stable: 0, down: 10 },
  },
  'Para Piyasası': {
    inflation: { up: 10, stable: 5, down: -5 },
    usdTry: { up: 0, stable: 5, down: 0 },
    interest: { up: 30, stable: 5, down: -20 },
    bist: { up: 0, stable: 5, down: 5 },
  },
  'Döviz': {
    inflation: { up: 15, stable: 0, down: -10 },
    usdTry: { up: 40, stable: 0, down: -35 },
    interest: { up: -5, stable: 0, down: 5 },
    bist: { up: -5, stable: 0, down: 10 },
  },
  'Karma': {
    inflation: { up: 0, stable: 5, down: 0 },
    usdTry: { up: 5, stable: 5, down: -5 },
    interest: { up: -10, stable: 0, down: 10 },
    bist: { up: 15, stable: 5, down: -10 },
  },
}

const REASONS: Record<string, Record<string, Record<MacroDirection, string>>> = {
  'Altın': {
    inflation: { up: 'Enflasyon artışı altın talebini artırır', stable: '', down: 'Düşen enflasyon altın cazibesini azaltır' },
    usdTry: { up: 'TL değer kaybı altını TL bazında yukarı iter', stable: '', down: 'Güçlü TL altın getirisini sınırlar' },
    interest: { up: 'Yüksek faiz, getirisi olmayan altının cazibesini azaltır', stable: '', down: 'Düşen faiz altını cazip kılar' },
    bist: { up: 'Yükselen borsa güvenli liman talebini azaltır', stable: '', down: 'Düşen borsa güvenli liman olarak altına yönlendirir' },
  },
  'Hisse': {
    inflation: { up: 'Yüksek enflasyon şirket maliyetlerini artırır', stable: '', down: 'Düşük enflasyon kar marjlarını destekler' },
    usdTry: { up: 'TL değer kaybı USD bazlı getiriyi eritir', stable: '', down: 'Güçlü TL yabancı yatırımcı çeker' },
    interest: { up: 'Yüksek faiz hisse senedi değerlemelerini baskılar', stable: '', down: 'Düşen faiz hisse piyasasını destekler' },
    bist: { up: 'Yükselen trend hisse getirilerini doğrudan artırır', stable: '', down: 'Düşen borsa hisse fonlarını olumsuz etkiler' },
  },
  'Yabancı Hisse': {
    inflation: { up: 'Yurt dışı hisseler enflasyon koruması sağlar', stable: '', down: '' },
    usdTry: { up: 'Dolar artışı yabancı hisse TL getirisini artırır', stable: '', down: 'Güçlü TL yabancı hisse getirisini düşürür' },
    interest: { up: 'Yüksek TL faizi yurt dışına çıkış maliyetini artırır', stable: '', down: 'Düşen faiz yabancı alternatifleri cazip kılar' },
    bist: { up: '', stable: '', down: 'Zayıf BIST yatırımcıyı yurt dışına yönlendirir' },
  },
  'Tahvil': {
    inflation: { up: 'Yüksek enflasyon tahvil reel getirisini eritir', stable: '', down: 'Düşen enflasyon tahvil reel getirisini artırır' },
    usdTry: { up: 'TL değer kaybı tahvil reel getirisini eritir', stable: '', down: 'Güçlü TL tahvil cazibesini artırır' },
    interest: { up: 'Faiz artışı mevcut tahvil fiyatlarını düşürür', stable: '', down: 'Faiz düşüşü tahvil fiyatlarını yükseltir' },
    bist: { up: '', stable: '', down: 'Düşen borsa güvenli liman olarak tahvile yönlendirir' },
  },
  'Para Piyasası': {
    inflation: { up: 'Kısa vadeli enstrümanlar enflasyona hızlı uyum sağlar', stable: '', down: '' },
    usdTry: { up: '', stable: '', down: '' },
    interest: { up: 'Yüksek faiz para piyasası getirilerini doğrudan artırır', stable: '', down: 'Düşen faiz para piyasası cazibesini azaltır' },
    bist: { up: '', stable: '', down: '' },
  },
  'Döviz': {
    inflation: { up: 'Yüksek enflasyon döviz talebini artırır', stable: '', down: 'Düşen enflasyon döviz ihtiyacını azaltır' },
    usdTry: { up: 'Dolar artışı döviz fonlarına doğrudan fayda sağlar', stable: '', down: 'Güçlü TL döviz fonlarını olumsuz etkiler' },
    interest: { up: '', stable: '', down: '' },
    bist: { up: '', stable: '', down: 'Düşen borsa dövize kaçışı hızlandırır' },
  },
  'Karma': {
    inflation: { up: '', stable: '', down: '' },
    usdTry: { up: '', stable: '', down: '' },
    interest: { up: 'Yüksek faiz karma fonlardaki tahvil kısmını baskılar', stable: '', down: 'Düşen faiz karma fonları dengeli destekler' },
    bist: { up: 'Yükselen borsa karma fonların hisse kısmını destekler', stable: '', down: 'Düşen borsa karma fonları olumsuz etkiler' },
  },
}

export function calculateMacroScores(inputs: MacroInputs): MacroCategoryScore[] {
  const categories = Object.keys(RULES)
  const factors: (keyof MacroInputs)[] = ['inflation', 'usdTry', 'interest', 'bist']

  return categories.map((category) => {
    let score = 50 // base
    const reasons: string[] = []

    factors.forEach((factor) => {
      const direction = inputs[factor]
      const delta = RULES[category]?.[factor]?.[direction] ?? 0
      score += delta

      const reason = REASONS[category]?.[factor]?.[direction]
      if (reason) {
        reasons.push(reason)
      }
    })

    // Clamp 0-100
    score = Math.max(0, Math.min(100, score))

    return { category, score, reasons }
  }).sort((a, b) => b.score - a.score)
}

export const FACTOR_LABELS: Record<string, string> = {
  inflation: 'Enflasyon',
  usdTry: 'USD/TRY',
  interest: 'Faiz Oranları',
  bist: 'BIST (Borsa)',
}

export const DIRECTION_LABELS: Record<MacroDirection, string> = {
  up: 'Artacak',
  stable: 'Stabil',
  down: 'Düşecek',
}

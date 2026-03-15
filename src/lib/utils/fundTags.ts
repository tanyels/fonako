const TAG_DEFINITIONS: { label: string; keywords: string[] }[] = [
  { label: 'Emeklilik', keywords: ['EMEKLİLİK'] },
  { label: 'Hisse', keywords: ['HİSSE'] },
  { label: 'Altın', keywords: ['ALTIN'] },
  { label: 'Tahvil', keywords: ['BORÇLANMA', 'TAHVİL', 'BONO'] },
  { label: 'Para Piyasası', keywords: ['PARA PİYASASI', 'LİKİT'] },
  { label: 'Döviz', keywords: ['DÖVİZ', 'DOLAR', 'EURO'] },
  { label: 'Katılım', keywords: ['KATILIM'] },
  { label: 'Serbest', keywords: ['SERBEST'] },
  { label: 'Değişken', keywords: ['DEĞİŞKEN'] },
  { label: 'Karma', keywords: ['KARMA', 'DENGELİ'] },
  { label: 'Fon Sepeti', keywords: ['FON SEPETİ'] },
  { label: 'Yabancı', keywords: ['YABANCI', 'DIŞ', 'YURTDIŞI'] },
  { label: 'Teknoloji', keywords: ['TEKNOLOJİ'] },
  { label: 'Banka', keywords: ['BANKA'] },
  { label: 'BIST', keywords: ['BIST'] },
  { label: 'Kısa Vadeli', keywords: ['KISA VADELİ'] },
  { label: 'OKS', keywords: ['OKS'] },
  { label: 'Büyüme', keywords: ['BÜYÜME', 'ATAK', 'AGRESİF'] },
]

/** Extract matching tag labels from a fund name */
export function extractTags(name: string): string[] {
  const upper = name.toUpperCase()
  return TAG_DEFINITIONS
    .filter((t) => t.keywords.some((kw) => upper.includes(kw)))
    .map((t) => t.label)
}

/** Check if a fund name matches ALL of the given tags */
export function matchesAllTags(name: string, tags: string[]): boolean {
  const fundTags = extractTags(name)
  return tags.every((t) => fundTags.includes(t))
}

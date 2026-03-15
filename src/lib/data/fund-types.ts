export interface FundInfo {
  code: string
  name: string
  category: string
  manager: string
}

export const FUND_CATEGORIES = [
  'Altın',
  'Hisse',
  'Yabancı Hisse',
  'Tahvil',
  'Para Piyasası',
  'Döviz',
  'Karma',
  'Katılım',
  'Emeklilik',
  'Serbest',
  'Değişken',
  'Fon Sepeti',
  'Diğer',
] as const

export type FundCategory = (typeof FUND_CATEGORIES)[number]

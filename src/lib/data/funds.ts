/**
 * Initial list of Turkish funds to track
 * This is the starter list - will expand based on Supabase data
 */

export interface FundInfo {
  code: string
  name: string
  category: string
  manager: string
  is_tefas: boolean
}

export const FUNDS: FundInfo[] = [
  // Gold Funds (Altın Fonları)
  {
    code: 'TYH',
    name: 'Yapı Kredi Portföy Altın Fonu',
    category: 'Altın',
    manager: 'Yapı Kredi Portföy',
    is_tefas: true,
  },
  {
    code: 'GAL',
    name: 'Garanti Portföy Altın Fonu',
    category: 'Altın',
    manager: 'Garanti Portföy',
    is_tefas: true,
  },

  // Equity Funds (Hisse Senedi Fonları)
  {
    code: 'IPB',
    name: 'İş Portföy BIST Banka Endeksi Fonu',
    category: 'Hisse',
    manager: 'İş Portföy',
    is_tefas: true,
  },
  {
    code: 'TTE',
    name: 'TEB Portföy Hisse Senedi Fonu',
    category: 'Hisse',
    manager: 'TEB Portföy',
    is_tefas: true,
  },

  // Foreign/US Funds (Yabancı Fonlar)
  {
    code: 'MAC',
    name: 'Ak Portföy Amerika Yabancı Hisse Fonu',
    category: 'Yabancı Hisse',
    manager: 'Ak Portföy',
    is_tefas: true,
  },
  {
    code: 'AFA',
    name: 'Ak Portföy BIST 30 Fonu',
    category: 'Hisse',
    manager: 'Ak Portföy',
    is_tefas: true,
  },

  // Bond Funds (Tahvil Fonları)
  {
    code: 'IST',
    name: 'İş Portföy Devlet Tahvili Fonu',
    category: 'Tahvil',
    manager: 'İş Portföy',
    is_tefas: true,
  },

  // Money Market (Para Piyasası)
  {
    code: 'AK1',
    name: 'Ak Portföy Para Piyasası Fonu',
    category: 'Para Piyasası',
    manager: 'Ak Portföy',
    is_tefas: true,
  },
  {
    code: 'YKP',
    name: 'Yapı Kredi Para Piyasası Fonu',
    category: 'Para Piyasası',
    manager: 'Yapı Kredi Portföy',
    is_tefas: true,
  },

  // Currency Funds (Döviz Fonları)
  {
    code: 'GAE',
    name: 'Garanti Portföy Euro Fonu',
    category: 'Döviz',
    manager: 'Garanti Portföy',
    is_tefas: true,
  },
]

export const FUND_CATEGORIES = [
  'Altın',
  'Hisse',
  'Yabancı Hisse',
  'Tahvil',
  'Para Piyasası',
  'Döviz',
  'Karma',
] as const

export type FundCategory = (typeof FUND_CATEGORIES)[number]

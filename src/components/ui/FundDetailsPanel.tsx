'use client'

import { useFundDetails } from '@/lib/hooks/useFundDetails'

const ALLOCATION_LABELS: Record<string, string> = {
  stock: 'Hisse Senedi',
  foreign_equity: 'Yabancı Hisse',
  government_bond: 'Devlet Tahvili',
  treasury_bill: 'Hazine Bonosu',
  eurobonds: 'Eurobond',
  private_sector_bond: 'Özel Sektör Tahvili',
  term_deposit: 'Vadeli Mevduat',
  term_deposit_tl: 'Vadeli Mevduat (TL)',
  term_deposit_d: 'Vadeli Mevduat (Döviz)',
  term_deposit_au: 'Vadeli Mevduat (Altın)',
  repo: 'Repo',
  reverse_repo: 'Ters Repo',
  fund_participation_certificate: 'Fon Katılma Belgesi',
  precious_metals: 'Kıymetli Madenler',
  precious_metals_byf: 'Kıymetli Madenler (BYF)',
  precious_metals_kba: 'Kıymetli Madenler (KBA)',
  precious_metals_kks: 'Kıymetli Madenler (KKS)',
  derivatives: 'Türev Araçlar',
  real_estate_certificate: 'Gayrimenkul Sertifikası',
  participation_account: 'Katılım Hesabı',
  participation_account_tl: 'Katılım Hesabı (TL)',
  participation_account_d: 'Katılım Hesabı (Döviz)',
  participation_account_au: 'Katılım Hesabı (Altın)',
  government_lease_certificates: 'Kamu Kira Sertifikası',
  government_lease_certificates_tl: 'Kamu Kira Sertifikası (TL)',
  government_lease_certificates_d: 'Kamu Kira Sertifikası (Döviz)',
  government_lease_certificates_foreign: 'Kamu Kira Sertifikası (Yabancı)',
  private_sector_lease_certificates: 'Özel Sektör Kira Sertifikası',
  private_sector_international_lease_certificate: 'Uluslararası Kira Sertifikası',
  exchange_traded_fund: 'Borsa Yatırım Fonu',
  foreign_exchange_traded_funds: 'Yabancı BYF',
  real_estate_investment_fund_participation: 'GYF Katılma Payı',
  venture_capital_investment_fund_participation: 'GSYF Katılma Payı',
  foreign_investment_fund_participation_shares: 'Yabancı Fon Payı',
  public_domestic_debt_instruments: 'Kamu İç Borçlanma',
  foreign_debt_instruments: 'Yabancı Borçlanma',
  foreign_domestic_debt_instruments: 'Yabancı Kamu Borçlanma',
  foreign_private_sector_debt_instruments: 'Yabancı Özel Sektör Borçlanma',
  government_bonds_and_bills_fx: 'Kamu Döviz Tahvil/Bono',
  bank_bills: 'Banka Bonosu',
  asset_backed_securities: 'Varlığa Dayalı Menkul',
  fx_payable_bills: 'Döviz Ödemeli Bono',
  foreign_currency_bills: 'Döviz Bonosu',
  commercial_paper: 'Finansman Bonosu',
  tmm: 'Takasbank Para Piyasası',
  futures_cash_collateral: 'Vadeli Nakit Teminat',
  foreign_securities: 'Yabancı Menkul Kıymetler',
  private_sector_foreign_debt_instruments: 'Özel Sektör Yabancı Borçlanma',
  other: 'Diğer',
}

const BAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
  'bg-purple-500', 'bg-cyan-500', 'bg-orange-500', 'bg-teal-500',
  'bg-pink-500', 'bg-indigo-500', 'bg-lime-500', 'bg-red-400',
]

function formatMarketCap(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)} Milyar ₺`
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)} Milyon ₺`
  }
  return `${value.toLocaleString('tr-TR')} ₺`
}

function formatNumber(value: number): string {
  return value.toLocaleString('tr-TR')
}

export function FundDetailsPanel({ fundCode }: { fundCode: string }) {
  const { details, loading } = useFundDetails(fundCode)

  if (loading) {
    return (
      <div className="text-sm text-subtle animate-pulse py-4">
        Fon detayları yükleniyor...
      </div>
    )
  }

  if (!details) return null

  // Sort allocations descending by value, filter out zeros
  const allocations = Object.entries(details.asset_allocation)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)

  const updatedDate = new Date(details.updated_at).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="space-y-4">
      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {details.market_cap != null && (
          <div className="bg-surface-raised rounded-lg p-4">
            <p className="text-xs font-medium text-muted">Fon Büyüklüğü</p>
            <p className="text-lg font-bold text-heading">
              {formatMarketCap(details.market_cap)}
            </p>
          </div>
        )}
        {details.number_of_investors != null && (
          <div className="bg-surface-raised rounded-lg p-4">
            <p className="text-xs font-medium text-muted">Yatırımcı Sayısı</p>
            <p className="text-lg font-bold text-heading">
              {formatNumber(details.number_of_investors)}
            </p>
          </div>
        )}
        {details.number_of_shares != null && (
          <div className="bg-surface-raised rounded-lg p-4">
            <p className="text-xs font-medium text-muted">Pay Sayısı</p>
            <p className="text-lg font-bold text-heading">
              {formatNumber(Math.round(details.number_of_shares))}
            </p>
          </div>
        )}
      </div>

      {/* Asset allocation */}
      {allocations.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted mb-2">Varlık Dağılımı</p>

          {/* Stacked bar */}
          <div className="flex h-4 rounded-full overflow-hidden mb-3">
            {allocations.map(([key, value], i) => (
              <div
                key={key}
                className={`${BAR_COLORS[i % BAR_COLORS.length]} transition-all`}
                style={{ width: `${value}%` }}
                title={`${ALLOCATION_LABELS[key] || key}: %${value.toFixed(1)}`}
              />
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {allocations.map(([key, value], i) => (
              <div key={key} className="flex items-center gap-1.5 text-xs">
                <span
                  className={`w-2.5 h-2.5 rounded-sm ${BAR_COLORS[i % BAR_COLORS.length]}`}
                />
                <span className="text-body">
                  {ALLOCATION_LABELS[key] || key}
                </span>
                <span className="font-medium text-heading">
                  %{value.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-subtle">Son güncelleme: {updatedDate}</p>
    </div>
  )
}

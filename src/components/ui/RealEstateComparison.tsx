'use client'

import { useState, useEffect, useCallback } from 'react'
import { useFundLookup } from '@/lib/hooks/useFundLookup'
import { FundSearch } from './FundSearch'
import { calculateRealReturns, calculateYearlyUsdReturns } from '@/lib/utils/calculations'

interface CityData {
  code: string
  name: string
  avgPriceM2_2024: number
  returns: { [year: string]: number }
  rentalYield: number
}

// S&P 500 annual USD returns (reference)
const SP500_RETURNS: Record<string, number> = {
  '2020': 16.3,
  '2021': 26.9,
  '2022': -19.4,
  '2023': 24.2,
  '2024': 23.3,
}

const CITY_DATA: CityData[] = [
  { code: 'IST', name: 'İstanbul', avgPriceM2_2024: 85000, returns: { '2020': 15, '2021': 25, '2022': 45, '2023': 35, '2024': 28 }, rentalYield: 3.5 },
  { code: 'ANK', name: 'Ankara', avgPriceM2_2024: 42000, returns: { '2020': 12, '2021': 18, '2022': 38, '2023': 28, '2024': 22 }, rentalYield: 4.2 },
  { code: 'IZM', name: 'İzmir', avgPriceM2_2024: 55000, returns: { '2020': 18, '2021': 22, '2022': 42, '2023': 32, '2024': 25 }, rentalYield: 3.8 },
  { code: 'ANT', name: 'Antalya', avgPriceM2_2024: 65000, returns: { '2020': 25, '2021': 35, '2022': 55, '2023': 40, '2024': 32 }, rentalYield: 5.2 },
  { code: 'BUR', name: 'Bursa', avgPriceM2_2024: 38000, returns: { '2020': 10, '2021': 15, '2022': 35, '2023': 25, '2024': 20 }, rentalYield: 4.5 },
  { code: 'TR', name: 'Türkiye Ortalaması', avgPriceM2_2024: 45000, returns: { '2020': 14, '2021': 20, '2022': 40, '2023': 30, '2024': 24 }, rentalYield: 4.0 },
]

export function RealEstateComparison() {
  const [selectedFund, setSelectedFund] = useState('')
  const [selectedCity, setSelectedCity] = useState('IST')
  const [investmentTL, setInvestmentTL] = useState('500000')
  const [startYear, setStartYear] = useState('2020')
  const [includeRent, setIncludeRent] = useState(true)
  const [fundUsdReturn, setFundUsdReturn] = useState<number | null>(null)
  const [fundYearlyReturns, setFundYearlyReturns] = useState<{ year: number; usdReturn: number }[]>([])
  const [loadingFund, setLoadingFund] = useState(false)
  const [fundError, setFundError] = useState(false)

  const fund = useFundLookup(selectedFund || undefined)
  const city = CITY_DATA.find(c => c.code === selectedCity)

  const initialTL = parseFloat(investmentTL) || 500000
  const usdRate2020 = 7.5
  const initialUSD = initialTL / usdRate2020

  // Calculate m² that could be bought
  const m2In2020 = initialTL / (city?.avgPriceM2_2024 || 45000) * 2.5

  // Calculate real fund returns
  const computeFundReturn = useCallback(async () => {
    if (!selectedFund) {
      setFundUsdReturn(null)
      setFundYearlyReturns([])
      return
    }
    setLoadingFund(true)
    setFundError(false)
    try {
      const [result, yearly] = await Promise.all([
        calculateRealReturns({
          fundCode: selectedFund,
          startDate: `${startYear}-01-01`,
          amountTry: initialTL,
        }),
        calculateYearlyUsdReturns(selectedFund, parseInt(startYear), 2024),
      ])
      setFundUsdReturn(result.usdReturn)
      setFundYearlyReturns(yearly)
    } catch {
      setFundUsdReturn(null)
      setFundYearlyReturns([])
      setFundError(true)
    } finally {
      setLoadingFund(false)
    }
  }, [selectedFund, startYear, initialTL])

  useEffect(() => {
    computeFundReturn()
  }, [computeFundReturn])

  // Calculate real estate returns
  const years = ['2020', '2021', '2022', '2023', '2024'].filter(y => parseInt(y) >= parseInt(startYear))
  const cityReturns = city?.returns || CITY_DATA[0].returns
  const rentalYield = city?.rentalYield || 4

  let realEstateValueUSD = initialUSD
  let totalRentUSD = 0

  const yearlyData = years.map(year => {
    realEstateValueUSD *= (1 + (cityReturns[year] || 0) / 100)
    if (includeRent) {
      totalRentUSD += realEstateValueUSD * (rentalYield / 100)
    }

    const fundYearReturn = fundYearlyReturns.find(f => f.year === parseInt(year))

    return {
      year,
      realEstateValueUSD: Math.round(realEstateValueUSD),
      totalRentUSD: Math.round(totalRentUSD),
      realEstateReturn: cityReturns[year] || 0,
      fundReturn: fundYearReturn?.usdReturn ?? null,
      sp500Return: SP500_RETURNS[year] ?? null,
    }
  })

  const finalRealEstateUSD = yearlyData[yearlyData.length - 1]?.realEstateValueUSD || initialUSD
  const finalTotalRentUSD = yearlyData[yearlyData.length - 1]?.totalRentUSD || 0
  const totalRealEstateUSD = finalRealEstateUSD + (includeRent ? finalTotalRentUSD : 0)

  // Fund final value in USD
  const hasFundData = fundUsdReturn !== null && selectedFund
  const finalFundUSD = hasFundData
    ? Math.round(initialUSD * (1 + fundUsdReturn / 100))
    : initialUSD

  return (
    <div className="space-y-6">
      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-800">
          Türkiye&apos;de konut, geleneksel olarak güvenli liman olarak görülür. Peki fonlarla karşılaştırıldığında nasıl performans gösteriyor?
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Fon</label>
            <FundSearch value={selectedFund} onChange={setSelectedFund} placeholder="Fon ara..." />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Şehir</label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700 bg-white"
            >
              {CITY_DATA.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Başlangıç Yılı</label>
            <select
              value={startYear}
              onChange={(e) => setStartYear(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700 bg-white"
            >
              {['2020', '2021', '2022', '2023', '2024'].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Yatırım (TL)</label>
            <input
              type="number"
              value={investmentTL}
              onChange={(e) => setInvestmentTL(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={includeRent}
            onChange={(e) => setIncludeRent(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300"
          />
          <span className="text-sm text-slate-600">Kira gelirini dahil et ({city?.rentalYield}% yıllık)</span>
        </label>
      </div>

      {/* Fund Error */}
      {fundError && selectedFund && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-red-700 mb-2">Fon verisi yüklenirken hata oluştu.</p>
          <button onClick={computeFundReturn} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium">
            Tekrar Dene
          </button>
        </div>
      )}

      {/* m² Comparison */}
      <div className="bg-slate-100 rounded-lg p-4">
        <p className="text-slate-700">
          <strong>₺{initialTL.toLocaleString('tr-TR')}</strong> ile {startYear} yılında {city?.name}&apos;da yaklaşık <strong>{m2In2020.toFixed(0)} m²</strong> konut alınabilirdi.
        </p>
        <p className="text-sm text-slate-500 mt-1">
          Bugün aynı konutun değeri: ~₺{(m2In2020 * (city?.avgPriceM2_2024 || 45000)).toLocaleString('tr-TR')}
        </p>
      </div>

      {/* Results Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <p className="text-sm text-slate-600 mb-1">{fund?.name || 'Fon seçin'}</p>
          {loadingFund ? (
            <div className="animate-pulse">
              <div className="h-9 bg-slate-100 rounded mt-1 mb-1" />
              <div className="h-4 w-20 bg-slate-100 rounded" />
            </div>
          ) : hasFundData ? (
            <>
              <p className="text-3xl font-bold text-slate-800">${finalFundUSD.toLocaleString()}</p>
              <p className={`text-sm font-semibold ${fundUsdReturn >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {fundUsdReturn >= 0 ? '+' : ''}{fundUsdReturn.toFixed(0)}% USD
              </p>
            </>
          ) : (
            <p className="text-slate-400 mt-1">Fon seçin</p>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <p className="text-sm text-slate-600 mb-1">{city?.name} Konut</p>
          <p className="text-3xl font-bold text-slate-800">${totalRealEstateUSD.toLocaleString()}</p>
          <p className="text-sm font-semibold text-emerald-600">
            +{((totalRealEstateUSD / initialUSD - 1) * 100).toFixed(0)}% USD
            {includeRent && <span className="text-slate-500 font-normal"> (kira dahil)</span>}
          </p>
        </div>

        {hasFundData && (
          <div className={`rounded-xl p-6 shadow-sm ${totalRealEstateUSD > finalFundUSD ? 'bg-blue-50 border border-blue-200' : 'bg-emerald-50 border border-emerald-200'}`}>
            <p className="text-sm text-slate-600 mb-1">Kazanan</p>
            <p className={`text-2xl font-bold ${totalRealEstateUSD > finalFundUSD ? 'text-blue-700' : 'text-emerald-700'}`}>
              {totalRealEstateUSD > finalFundUSD ? `${city?.name} Konut` : `${fund?.code}`}
            </p>
            <p className="text-sm text-slate-600">
              ${Math.abs(totalRealEstateUSD - finalFundUSD).toLocaleString()} fark
            </p>
          </div>
        )}
      </div>

      {/* Year by Year */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Yıl</th>
              <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">Konut USD</th>
              <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">Getiri</th>
              {includeRent && <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">Kümülatif Kira</th>}
              {hasFundData && <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">{fund?.code} USD Getiri</th>}
              <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">S&P 500</th>
            </tr>
          </thead>
          <tbody>
            {yearlyData.map((data) => (
              <tr key={data.year} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-700">{data.year}</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-700">${data.realEstateValueUSD.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">
                  <span className="text-xs text-emerald-600">+{data.realEstateReturn}%</span>
                </td>
                {includeRent && (
                  <td className="px-4 py-3 text-right text-slate-600">${data.totalRentUSD.toLocaleString()}</td>
                )}
                {hasFundData && (
                  <td className="px-4 py-3 text-right">
                    {loadingFund ? (
                      <span className="inline-block w-12 h-4 bg-slate-100 rounded animate-pulse" />
                    ) : data.fundReturn !== null ? (
                      <span className={`font-semibold ${data.fundReturn >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {data.fundReturn >= 0 ? '+' : ''}{data.fundReturn.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                )}
                <td className="px-4 py-3 text-right">
                  {data.sp500Return !== null ? (
                    <span className={`font-semibold ${data.sp500Return >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {data.sp500Return >= 0 ? '+' : ''}{data.sp500Return.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {hasFundData && (
          <div className="border-t border-slate-200 px-4 py-3 bg-slate-50">
            <p className="text-sm text-slate-600">
              {fund?.code} kümülatif USD getirisi: <span className={`font-semibold ${fundUsdReturn! >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {fundUsdReturn! >= 0 ? '+' : ''}{fundUsdReturn!.toFixed(1)}%
              </span>
              {' '}→ ${finalFundUSD.toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800 mb-2">Gayrimenkul Avantajları</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>Türkiye&apos;de USD bazında değer kazandı</li>
            <li>Kira geliri ek getiri sağlar</li>
            <li>Enflasyona karşı koruma</li>
            <li>Fiziksel, somut varlık</li>
          </ul>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <h4 className="font-semibold text-slate-800 mb-2">Fon Avantajları</h4>
          <ul className="text-sm text-slate-700 space-y-1">
            <li>Likidite - anında nakde çevrilebilir</li>
            <li>Düşük giriş maliyeti</li>
            <li>Çeşitlendirme imkanı</li>
            <li>Bakım/vergi derdi yok</li>
          </ul>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        * Konut fiyatları TCMB Konut Fiyat Endeksi ve TUIK verilerine dayanmaktadır. Gerçek getiriler lokasyon, konut tipi ve piyasa koşullarına göre değişebilir.
      </p>
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useFundLookup } from '@/lib/hooks/useFundLookup'
import { FundSearch } from './FundSearch'
import { calculateRealReturns, calculateYearlyUsdReturns } from '@/lib/utils/calculations'

interface CryptoData {
  symbol: string
  name: string
  returns: { [year: string]: number }
  volatility: string
  riskLevel: 'high' | 'very-high'
}

// S&P 500 annual USD returns (reference)
const SP500_RETURNS: Record<string, number> = {
  '2020': 16.3,
  '2021': 26.9,
  '2022': -19.4,
  '2023': 24.2,
  '2024': 23.3,
}

const CRYPTO_DATA: CryptoData[] = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    returns: { '2020': 305, '2021': 60, '2022': -65, '2023': 155, '2024': 125 },
    volatility: '~75%',
    riskLevel: 'very-high',
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    returns: { '2020': 470, '2021': 400, '2022': -68, '2023': 85, '2024': 65 },
    volatility: '~85%',
    riskLevel: 'very-high',
  },
  {
    symbol: 'USDT',
    name: 'Tether (Stablecoin)',
    returns: { '2020': 0, '2021': 0, '2022': 0, '2023': 0, '2024': 0 },
    volatility: '~0%',
    riskLevel: 'high',
  },
]

export function CryptoComparison() {
  const [selectedFund, setSelectedFund] = useState('')
  const [selectedCrypto, setSelectedCrypto] = useState('BTC')
  const [amount, setAmount] = useState('10000')
  const [startYear, setStartYear] = useState('2020')
  const [fundUsdReturn, setFundUsdReturn] = useState<number | null>(null)
  const [fundYearlyReturns, setFundYearlyReturns] = useState<{ year: number; usdReturn: number }[]>([])
  const [loadingFund, setLoadingFund] = useState(false)
  const [fundError, setFundError] = useState(false)

  const fund = useFundLookup(selectedFund || undefined)
  const crypto = CRYPTO_DATA.find(c => c.symbol === selectedCrypto)

  const initialAmount = parseFloat(amount) || 10000

  // Calculate real fund returns when fund or start year changes
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
          amountTry: initialAmount * 30,
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
  }, [selectedFund, startYear, initialAmount])

  useEffect(() => {
    computeFundReturn()
  }, [computeFundReturn])

  // Calculate crypto cumulative return
  const years = ['2020', '2021', '2022', '2023', '2024'].filter(y => parseInt(y) >= parseInt(startYear))
  const cryptoReturns = crypto?.returns || CRYPTO_DATA[0].returns

  let cryptoValue = initialAmount
  const yearlyData = years.map(year => {
    const cryptoReturn = cryptoReturns[year] || 0
    cryptoValue *= (1 + cryptoReturn / 100)

    // Find matching fund yearly return
    const fundYearReturn = fundYearlyReturns.find(f => f.year === parseInt(year))

    return {
      year,
      cryptoValue: Math.round(cryptoValue),
      cryptoReturn,
      fundReturn: fundYearReturn?.usdReturn ?? null,
      sp500Return: SP500_RETURNS[year] ?? null,
    }
  })

  const finalCryptoValue = yearlyData[yearlyData.length - 1]?.cryptoValue || initialAmount

  // Fund final value based on real USD return
  const finalFundValue = fundUsdReturn !== null
    ? Math.round(initialAmount * (1 + fundUsdReturn / 100))
    : initialAmount

  const hasFundData = fundUsdReturn !== null && selectedFund

  return (
    <div className="space-y-6">
      {/* Warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-amber-800 font-medium">
          Kripto paralar son derece volatildir. Bu karşılaştırma sadece bilgi amaçlıdır, yatırım tavsiyesi değildir.
        </p>
        <p className="text-amber-700 text-sm mt-1">
          Cryptocurrencies are extremely volatile. This comparison is for informational purposes only.
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Fon</label>
            <FundSearch value={selectedFund} onChange={setSelectedFund} placeholder="Fon ara..." />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Kripto</label>
            <select
              value={selectedCrypto}
              onChange={(e) => setSelectedCrypto(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700 bg-white"
            >
              {CRYPTO_DATA.map((c) => (
                <option key={c.symbol} value={c.symbol}>{c.name} ({c.symbol})</option>
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
            <label className="block text-sm font-medium text-slate-600 mb-1">Yatırım (USD)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-700"
            />
          </div>
        </div>
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

      {/* Results Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <p className="text-sm text-slate-600 mb-1">{fund?.name || 'Fon seçin'}</p>
          {loadingFund ? (
            <div className="animate-pulse">
              <div className="h-9 bg-slate-100 rounded mt-1 mb-1" />
              <div className="h-4 w-16 bg-slate-100 rounded" />
            </div>
          ) : hasFundData ? (
            <>
              <p className="text-3xl font-bold text-slate-800">${finalFundValue.toLocaleString()}</p>
              <p className={`text-sm font-semibold ${fundUsdReturn >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {fundUsdReturn >= 0 ? '+' : ''}{fundUsdReturn.toFixed(0)}%
              </p>
            </>
          ) : (
            <p className="text-slate-400 mt-1">Fon seçin</p>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <p className="text-sm text-slate-600 mb-1">{crypto?.name || 'Kripto'}</p>
          <p className="text-3xl font-bold text-slate-800">${finalCryptoValue.toLocaleString()}</p>
          <p className={`text-sm font-semibold ${finalCryptoValue >= initialAmount ? 'text-emerald-600' : 'text-red-600'}`}>
            {finalCryptoValue >= initialAmount ? '+' : ''}{((finalCryptoValue / initialAmount - 1) * 100).toFixed(0)}%
          </p>
        </div>

        {hasFundData && (
          <div className={`rounded-xl p-6 shadow-sm ${finalCryptoValue > finalFundValue ? 'bg-purple-50 border border-purple-200' : 'bg-emerald-50 border border-emerald-200'}`}>
            <p className="text-sm text-slate-600 mb-1">Fark</p>
            <p className={`text-3xl font-bold ${finalCryptoValue > finalFundValue ? 'text-purple-700' : 'text-emerald-700'}`}>
              ${Math.abs(finalCryptoValue - finalFundValue).toLocaleString()}
            </p>
            <p className="text-sm text-slate-600">
              {finalCryptoValue > finalFundValue ? `${crypto?.symbol} daha iyi` : `${fund?.code} daha iyi`}
            </p>
          </div>
        )}
      </div>

      {/* Year by Year Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">Yıl</th>
              <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">{crypto?.symbol} Getiri</th>
              <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">{crypto?.symbol} Değer</th>
              {hasFundData && (
                <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">{fund?.code} USD Getiri</th>
              )}
              <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">S&P 500</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-slate-100 bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-700">Başlangıç</td>
              <td className="px-4 py-3 text-right text-slate-500">-</td>
              <td className="px-4 py-3 text-right font-semibold text-slate-700">${initialAmount.toLocaleString()}</td>
              {hasFundData && <td className="px-4 py-3 text-right text-slate-500">-</td>}
              <td className="px-4 py-3 text-right text-slate-500">-</td>
            </tr>
            {yearlyData.map((data) => (
              <tr key={data.year} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-700">{data.year}</td>
                <td className={`px-4 py-3 text-right font-semibold ${data.cryptoReturn >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {data.cryptoReturn >= 0 ? '+' : ''}{data.cryptoReturn}%
                </td>
                <td className="px-4 py-3 text-right font-semibold text-slate-700">${data.cryptoValue.toLocaleString()}</td>
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
              {' '}→ ${finalFundValue.toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* Risk Comparison */}
      <div className="bg-slate-100 rounded-lg p-4">
        <h4 className="font-semibold text-slate-800 mb-3">Risk Karşılaştırması</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4">
            <p className="font-medium text-slate-700">{fund?.name || 'Yatırım Fonu'}</p>
            <p className="text-sm text-slate-500">Volatilite: ~15-25%</p>
            <p className="text-sm text-slate-500">Risk: Orta</p>
            <p className="text-sm text-slate-500">Regülasyon: SPK denetimli</p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <p className="font-medium text-slate-700">{crypto?.name}</p>
            <p className="text-sm text-slate-500">Volatilite: {crypto?.volatility}</p>
            <p className="text-sm text-red-600">Risk: Çok Yüksek</p>
            <p className="text-sm text-slate-500">Regülasyon: Sınırlı</p>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          * Kripto paralar yüksek getiri potansiyeline sahip olsa da, %50-90 düşüşler yaşanabilir.
          Sadece kaybetmeyi göze alabileceğiniz tutarı yatırın.
        </p>
      </div>
    </div>
  )
}

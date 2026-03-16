import { BESCalculator } from '@/components/bes/BESCalculator'
import { BESProviderRankings } from '@/components/bes/BESProviderRankings'
import { DevletKatkisi } from '@/components/bes/DevletKatkisi'
import { BESvsRegularFund } from '@/components/bes/BESvsRegularFund'
import { WithdrawalCalculator } from '@/components/bes/WithdrawalCalculator'
import { AgeRecommendations } from '@/components/bes/AgeRecommendations'

export default function BESPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-heading mb-2">
          BES Analizi
        </h1>
        <p className="text-body">
          Bireysel Emeklilik Sistemi fonlarınızın gerçek performansını görün
        </p>
        <p className="text-muted text-sm mt-1">
          See the real performance of your pension funds in USD, EUR, and gold
        </p>
      </div>

      {/* Warning Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
        <p className="text-amber-800 font-medium">
          ⚠️ BES fonlarınız TL bazında kazandırıyor görünebilir, ama gerçek getiriyi biliyor musunuz?
        </p>
        <p className="text-amber-700 text-sm mt-1">
          Your pension fund may show gains in TL, but do you know the real return?
        </p>
      </div>

      {/* Section A & B: BES Calculator */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-heading mb-4">
          BES Hesaplayıcı / Pension Calculator
        </h2>
        <BESCalculator />
      </section>

      {/* Section C: Devlet Katkısı Reality Check */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-heading mb-4">
          Devlet Katkısı Gerçeği / Government Match Reality
        </h2>
        <DevletKatkisi />
      </section>

      {/* Section D: BES vs Regular Fund */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-heading mb-4">
          BES vs Normal Fon / Pension vs Regular Fund
        </h2>
        <BESvsRegularFund />
      </section>

      {/* Section E: Provider Rankings */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-heading mb-4">
          Şirket Sıralaması / Provider Rankings
        </h2>
        <BESProviderRankings />
      </section>

      {/* Section F: Withdrawal Calculator */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-heading mb-4">
          Çıkış Hesaplayıcı / Withdrawal Calculator
        </h2>
        <WithdrawalCalculator />
      </section>

      {/* Section G: Age-Based Recommendations */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-heading mb-4">
          Yaşa Göre Öneriler / Age-Based Recommendations
        </h2>
        <AgeRecommendations />
      </section>
    </div>
  )
}

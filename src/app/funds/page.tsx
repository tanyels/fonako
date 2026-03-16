import { FundAnalyzer } from '@/components/ui/FundAnalyzer'

export default function FundsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-heading mb-2">Fon Analizi</h1>
      <p className="text-body mb-8">
        Bir fon seçin ve gerçek getirisini görün / Select a fund to see its real returns
      </p>

      <FundAnalyzer />
    </div>
  )
}

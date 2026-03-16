import { RealEstateComparison } from '@/components/ui/RealEstateComparison'

export default function RealEstatePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-heading mb-2">Gayrimenkul Karşılaştırma</h1>
      <p className="text-body mb-2">
        Fonlarınızı konut yatırımıyla karşılaştırın
      </p>
      <p className="text-muted text-sm mb-8">
        Compare your fund investments against real estate (housing) returns
      </p>

      <RealEstateComparison />
    </div>
  )
}

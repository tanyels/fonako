import { ComparisonTool } from '@/components/ui/ComparisonTool'

export default function ComparePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-heading mb-2">Karşılaştır</h1>
      <p className="text-body mb-8">
        Fonu USD, EUR veya altın tutmakla karşılaştırın / Compare fund vs holding USD, EUR, or gold
      </p>

      <ComparisonTool />
    </div>
  )
}

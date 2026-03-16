import { SectorHeatmap } from '@/components/ui/SectorHeatmap'

export default function HeatmapPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-heading mb-2">Sektör Haritası</h1>
      <p className="text-body mb-2">
        Fon kategorilerinin yıllara göre performans haritası
      </p>
      <p className="text-muted text-sm mb-8">
        Visual heatmap showing fund category performance by year
      </p>

      <SectorHeatmap />
    </div>
  )
}

import { FundReportCards } from '@/components/ui/FundReportCards'

export default function ReportCardsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-heading mb-2">Fon Karneleri</h1>
      <p className="text-body mb-2">
        Her fonun USD bazında gerçek performans notu (A-F)
      </p>
      <p className="text-muted text-sm mb-8">
        Fund report cards showing real performance grades (A-F) based on USD returns
      </p>

      <FundReportCards />
    </div>
  )
}

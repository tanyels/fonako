import { LiveTicker } from '@/components/ui/LiveTicker'
import { HeroVisual } from '@/components/ui/HeroVisual'

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <LiveTicker />
      <HeroVisual />
    </div>
  )
}

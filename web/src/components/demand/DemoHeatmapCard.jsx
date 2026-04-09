import { Minus, ArrowUpRight } from 'lucide-react'

export default function DemoHeatmapCard({ demand }) {
  const isRising = demand.trend === 'rising' || (demand.trend !== 'down')
  const totalQty = demand.total_weekly_kg || demand.totalQty || 0
  const buyers = demand.buyer_count || demand.buyers || 0

  return (
    <div className="rounded-xl p-4 bg-card border border-border hover:border-primary/20 transition-colors">
      <div className="flex justify-between items-center mb-3">
        <span className="font-bold capitalize text-foreground">{demand.crop}</span>
        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
          isRising
            ? 'bg-primary/10 text-primary'
            : 'bg-muted text-muted-foreground'
        }`}>
          {isRising ? <ArrowUpRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
          {demand.trend || 'Stable'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <p className="text-2xl font-bold text-foreground">{totalQty}</p>
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">kg/week</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-foreground">{buyers}</p>
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">buyers</p>
        </div>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${Math.min((totalQty / 2000) * 100, 100)}%`,
            background: isRising
              ? 'linear-gradient(90deg, #22c55e, #4ade80)'
              : 'linear-gradient(90deg, #333, #444)',
          }}
        />
      </div>
    </div>
  )
}

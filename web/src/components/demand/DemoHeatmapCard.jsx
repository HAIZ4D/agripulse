import { TrendingUp, Minus, ArrowUpRight } from 'lucide-react'

export default function DemoHeatmapCard({ demand }) {
  const isRising = demand.trend === 'rising' || (demand.trend !== 'down')
  const totalQty = demand.total_weekly_kg || demand.totalQty || 0
  const buyers = demand.buyer_count || demand.buyers || 0
  
  return (
    <div className="group glow-card rounded-2xl p-5 overflow-hidden relative">
      {/* Top accent */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] ${isRising ? 'bg-gradient-to-r from-primary/60 via-primary to-primary/60' : 'bg-gradient-to-r from-transparent via-border to-transparent'}`} />

      <div className="relative z-10">
        <div className="flex justify-between items-center mb-4">
          <span className="font-bold capitalize text-foreground text-lg">{demand.crop}</span>
          <span
            className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full border ${
              isRising
                ? 'bg-primary/15 text-primary border-primary/25'
                : 'bg-muted/80 text-muted-foreground border-border/50'
            }`}
          >
            {isRising ? <ArrowUpRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            {demand.trend || 'Stable'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <p className="text-3xl font-bold text-foreground font-mono-stat">{totalQty}</p>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mt-1">kg/week</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-foreground font-mono-stat">{buyers}</p>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mt-1">buyers</p>
          </div>
        </div>
        <div className="h-2.5 bg-muted/60 rounded-full overflow-hidden relative">
          <div
            className="h-full rounded-full transition-all duration-1000 relative overflow-hidden"
            style={{
              width: `${Math.min((totalQty / 2000) * 100, 100)}%`, // adjusted max for real scale
              background: isRising
                ? 'linear-gradient(90deg, hsl(152, 60%, 35%), hsl(152, 55%, 48%))'
                : 'linear-gradient(90deg, hsl(152, 40%, 30%), hsl(152, 35%, 40%))',
              boxShadow: isRising ? '0 0 12px hsl(152, 60%, 42%, 0.3)' : 'none',
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, hsla(0,0%,100%,0.12) 50%, transparent 100%)',
                animation: 'shimmer 3s ease-in-out infinite',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

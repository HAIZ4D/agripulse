import { ShoppingCart, Users, Flame, TrendingUp, ArrowUpRight } from 'lucide-react'

const iconMap = [ShoppingCart, Users, Flame, TrendingUp]
const glowColors = [
  { bg: 'bg-primary/12', border: 'border-primary/18', text: 'text-primary', accent: 'primary' },
  { bg: 'bg-blue-500/12', border: 'border-blue-500/18', text: 'text-blue-400', accent: 'blue' },
  { bg: 'bg-orange-500/12', border: 'border-orange-500/18', text: 'text-orange-400', accent: 'orange' },
  { bg: 'bg-emerald-500/12', border: 'border-emerald-500/18', text: 'text-emerald-400', accent: 'emerald' },
]
const changes = ['+12%', '+3', '', '']
const sparklines = [
  [30, 35, 28, 40, 38, 45, 55],
  [1, 1, 2, 1, 2, 2, 2],
  null,
  null,
]

function MiniSparkline({ data, color }) {
  if (!data) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const w = 80
  const h = 24
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ')
  return (
    <svg width={w} height={h} className="mt-2 opacity-40">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`text-${color === 'primary' ? 'primary' : `${color}-400`}`} />
    </svg>
  )
}

export default function DemoMarketPulse({ demands }) {
  const totalDemand = demands.reduce((s, d) => s + (d.totalQty || 0), 0)
  const topCrop = demands.length
    ? demands.reduce((a, b) => (a.totalQty > b.totalQty ? a : b)).crop
    : '—'
  const stats = [
    { label: 'Total Demand', value: `${totalDemand} kg` },
    { label: 'Active Buyers', value: demands.reduce((s, d) => s + (d.buyers || 0), 0) },
    { label: 'Trending Crop', value: topCrop },
    { label: 'Rising Crops', value: 0 },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s, i) => {
        const Icon = iconMap[i]
        const c = glowColors[i]
        return (
          <div
            key={s.label}
            className="group relative glow-card rounded-2xl p-5 overflow-hidden"
          >
            {/* Top accent bar */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-600" />
            {/* Corner glow */}
            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-primary/[0.04] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-600" />

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center transition-all duration-400 group-hover:scale-105 group-hover:shadow-lg`}>
                  <Icon className={`w-[18px] h-[18px] ${c.text}`} />
                </div>
                {changes[i] && (
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-primary bg-primary/8 border border-primary/12 px-2 py-0.5 rounded-lg">
                    <ArrowUpRight className="w-3 h-3" />
                    {changes[i]}
                  </span>
                )}
              </div>
              <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-[0.12em] mb-1.5">{s.label}</p>
              <p className="text-2xl font-extrabold text-foreground capitalize font-mono-stat leading-none">{s.value}</p>
              <MiniSparkline data={sparklines[i]} color={c.accent} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

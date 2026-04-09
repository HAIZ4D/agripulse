import { useTranslation } from 'react-i18next'
import { ShoppingCart, Users, Flame, TrendingUp, ArrowUpRight } from 'lucide-react'

const iconMap = [ShoppingCart, Users, Flame, TrendingUp]
const iconColors = [
  'bg-primary/10 text-primary',
  'bg-blue-500/10 text-blue-400',
  'bg-amber-500/10 text-amber-400',
  'bg-emerald-500/10 text-emerald-400',
]
const changes = ['+12.4% vs last week', '12 New accounts', '', '']

export default function DemoMarketPulse({ demands }) {
  const { t } = useTranslation()
  const totalDemand = demands.reduce((s, d) => s + (d.total_weekly_kg || d.totalQty || 0), 0)
  const topCrop = demands.length
    ? demands.reduce((a, b) => ((a.total_weekly_kg || a.totalQty) > (b.total_weekly_kg || b.totalQty) ? a : b)).crop
    : '—'
  const risingCrops = demands.filter((d) => d.trend === 'rising').map((d) => d.crop)

  const stats = [
    { label: t('demandIntel.totalWeekly').toUpperCase(), value: `${totalDemand.toLocaleString()}`, unit: 'MT' },
    { label: t('demandIntel.activeBuyers').toUpperCase(), value: demands.reduce((s, d) => s + (d.buyer_count || d.buyers || 0), 0) },
    { label: t('demandIntel.trendingCrop').toUpperCase(), value: topCrop, subtitle: 'Central Market Peak' },
    { label: t('demandIntel.risingCrops').toUpperCase(), pills: risingCrops.length > 0 ? risingCrops.slice(0, 3) : ['—'] },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s, i) => {
        const Icon = iconMap[i]
        return (
          <div key={i} className="stat-card">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">{s.label}</p>

            {s.pills ? (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {s.pills.map((p, j) => (
                  <span key={j} className="px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-semibold capitalize">{p}</span>
                ))}
              </div>
            ) : (
              <>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-2xl font-extrabold text-foreground capitalize leading-none">{s.value}</p>
                  {s.unit && <span className="text-xs text-muted-foreground font-semibold">{s.unit}</span>}
                </div>
                {s.subtitle && <p className="text-xs text-muted-foreground mt-1">{s.subtitle}</p>}
              </>
            )}

            {changes[i] && (
              <p className={`text-[11px] font-semibold mt-2 flex items-center gap-1 ${i === 1 ? 'text-primary' : 'text-primary'}`}>
                <ArrowUpRight className="w-3 h-3" />
                {changes[i]}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}

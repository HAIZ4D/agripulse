import { useTranslation } from 'react-i18next'
import { TrendingUp, TrendingDown, Minus, ShoppingCart } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'

const trendConfig = {
  rising: {
    icon: TrendingUp,
    color: 'text-green-600',
    borderColor: 'border-l-green-500',
    badgeBg: 'bg-green-100 text-green-700',
    sparkData: [{ v: 30 }, { v: 45 }, { v: 60 }, { v: 80 }],
    sparkColor: '#22c55e',
  },
  stable: {
    icon: Minus,
    color: 'text-yellow-600',
    borderColor: 'border-l-yellow-500',
    badgeBg: 'bg-yellow-100 text-yellow-700',
    sparkData: [{ v: 50 }, { v: 52 }, { v: 48 }, { v: 50 }],
    sparkColor: '#eab308',
  },
  falling: {
    icon: TrendingDown,
    color: 'text-red-600',
    borderColor: 'border-l-red-500',
    badgeBg: 'bg-red-100 text-red-700',
    sparkData: [{ v: 80 }, { v: 60 }, { v: 45 }, { v: 30 }],
    sparkColor: '#ef4444',
  },
}

export default function DemandHeatmap({ demands }) {
  const { t } = useTranslation()

  if (!demands || demands.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-primary" />
          {t('demandIntel.heatmap')}
        </h3>
        <div className="text-center py-8">
          <p className="text-muted-foreground">{t('demandIntel.noBuyers')}</p>
          <p className="text-sm text-muted-foreground mt-1">{t('demandIntel.waitingData')}</p>
        </div>
      </div>
    )
  }

  const maxDemand = Math.max(...demands.map((d) => d.total_weekly_kg || 0))
  const sorted = [...demands].sort((a, b) => (b.total_weekly_kg || 0) - (a.total_weekly_kg || 0))

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <ShoppingCart className="w-5 h-5 text-primary" />
        {t('demandIntel.heatmap')}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map((item, index) => {
          const trend = item.trend || 'stable'
          const config = trendConfig[trend] || trendConfig.stable
          const TrendIcon = config.icon
          const intensity = maxDemand > 0 ? (item.total_weekly_kg || 0) / maxDemand : 0

          return (
            <div
              key={item.crop}
              className={`bg-card border border-border rounded-xl p-4 border-l-4 ${config.borderColor} animate-fade-in-up hover:shadow-md transition-shadow`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Header: crop name + trend badge */}
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm">{item.crop}</h4>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.badgeBg}`}>
                  <TrendIcon className="w-3 h-3" />
                  {t(`demandIntel.${trend}`)}
                </span>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xl font-bold">{item.total_weekly_kg?.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{t('demandIntel.kgPerWeek')}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold">{item.buyer_count}</p>
                  <p className="text-xs text-muted-foreground">{t('demandIntel.buyers').toLowerCase()}</p>
                </div>
              </div>

              {/* Intensity bar */}
              <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-3">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-700"
                  style={{ width: `${Math.max(intensity * 100, 5)}%` }}
                />
              </div>

              {/* Mini sparkline */}
              <div className="h-[30px]">
                <ResponsiveContainer width="100%" height={30}>
                  <AreaChart data={config.sparkData}>
                    <Area
                      type="monotone"
                      dataKey="v"
                      stroke={config.sparkColor}
                      fill={config.sparkColor}
                      fillOpacity={0.15}
                      strokeWidth={1.5}
                      dot={false}
                      animationDuration={800}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

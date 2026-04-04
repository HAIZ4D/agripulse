import { useTranslation } from 'react-i18next'
import { AlertTriangle, ArrowRight } from 'lucide-react'

export default function DemandGap({ demands }) {
  const { t } = useTranslation()

  if (!demands || demands.length === 0) return null

  // Show crops with rising demand (opportunities for farmers)
  const opportunities = demands
    .filter((d) => d.trend === 'rising' || (d.total_weekly_kg || 0) > 100)
    .sort((a, b) => (b.total_weekly_kg || 0) - (a.total_weekly_kg || 0))
    .slice(0, 5)

  if (opportunities.length === 0) return null

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-amber-500" />
        {t('demandIntel.supplyGap')}
      </h3>
      <div className="space-y-3">
        {opportunities.map((item) => {
          const gapPercent = Math.min(100, ((item.total_weekly_kg || 0) / 500) * 100)
          return (
            <div key={item.crop} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{item.crop}</span>
                <span className="text-muted-foreground">
                  {item.total_weekly_kg?.toLocaleString()} {t('common.kg')}{t('common.perWeek')}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-red-500 transition-all"
                  style={{ width: `${gapPercent}%` }}
                />
              </div>
              <div className="flex items-center gap-1 text-xs text-amber-600">
                <ArrowRight className="w-3 h-3" />
                <span>
                  {item.buyer_count} {t('recommendation.buyersDemanding')}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

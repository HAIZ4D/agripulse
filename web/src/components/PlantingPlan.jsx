import { useTranslation } from 'react-i18next'
import { ClipboardList, Trash2, ChevronRight } from 'lucide-react'

const statusColors = {
  planned: 'bg-blue-100 text-blue-700',
  growing: 'bg-green-100 text-green-700',
  harvested: 'bg-amber-100 text-amber-700',
}

const statusCycle = ['planned', 'growing', 'harvested']

export default function PlantingPlan({ plan, onRemove, onStatusChange }) {
  const { t } = useTranslation()

  if (!plan || plan.length === 0) return null

  return (
    <div className="bg-card rounded-xl border border-border p-6 animate-fade-in-up">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <ClipboardList className="w-5 h-5 text-primary" />
        {t('demandIntel.plantingPlan')}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {plan.map((item, i) => {
          const currentStatus = item.status || 'planned'
          const nextStatus = statusCycle[(statusCycle.indexOf(currentStatus) + 1) % statusCycle.length]

          return (
            <div
              key={item.crop + i}
              className="border border-border rounded-lg p-4 animate-fade-in-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">{item.crop}</h4>
                <button
                  onClick={() => onRemove?.(item.crop)}
                  className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive transition-colors"
                  title={t('demandIntel.removeFromPlan')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {item.projected_profit && (
                <p className="text-sm text-green-600 font-medium mb-2">
                  {t('recommendation.margin')}: {item.projected_profit.margin_percentage}%
                </p>
              )}

              <button
                onClick={() => onStatusChange?.(item.crop, nextStatus)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${statusColors[currentStatus]}`}
              >
                {t(`demandIntel.${currentStatus}`)}
                <ChevronRight className="w-3 h-3" />
              </button>

              {item.confidence && (
                <p className="text-xs text-muted-foreground mt-2">
                  {t('recommendation.aiConfidence')}: {Math.round(item.confidence * 100)}%
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

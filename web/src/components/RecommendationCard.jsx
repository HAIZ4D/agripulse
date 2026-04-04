import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ShoppingCart,
  CloudSun,
  TrendingUp,
  Leaf,
  DollarSign,
  Brain,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Loader2,
} from 'lucide-react'

export default function RecommendationCard({ recommendation, onAccept, onOverride, accepted, loading }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  if (!recommendation) return null

  const { crop, confidence, reasoning, projected_profit } = recommendation
  const confidencePercent = Math.round((confidence || 0) * 100)

  const confidenceColor =
    confidencePercent >= 75 ? 'text-green-400 bg-green-500/10 border border-green-500/20' :
    confidencePercent >= 50 ? 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/20' :
    'text-red-400 bg-red-500/10 border border-red-500/20'

  return (
    <div className={`bg-card rounded-xl border overflow-hidden transition-colors ${accepted ? 'border-green-300 bg-green-50/30' : 'border-border'}`}>
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${accepted ? 'bg-green-500/10 border-green-500/20' : 'bg-primary/10 border-primary/20'}`}>
            {accepted ? (
              <Check className="w-5 h-5 text-green-400" />
            ) : (
              <Leaf className="w-5 h-5 text-primary" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-lg">{crop}</h4>
              {accepted && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-green-500/10 border border-green-500/20 text-green-400 uppercase tracking-wide">
                  <Check className="w-3 h-3" />
                  {t('demandIntel.accepted')}
                </span>
              )}
            </div>
            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${confidenceColor}`}>
              <Brain className="w-3 h-3" />
              {t('recommendation.aiConfidence')}: {confidencePercent}%
            </div>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {/* Glass-Box Reasoning (expandable) */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {reasoning?.demand && (
            <ReasoningSection
              icon={ShoppingCart}
              title={t('recommendation.localDemand')}
              content={reasoning.demand}
              color="text-blue-400 bg-blue-500/10 border-blue-500/20"
            />
          )}
          {reasoning?.weather && (
            <ReasoningSection
              icon={CloudSun}
              title={t('recommendation.weather')}
              content={reasoning.weather}
              color="text-sky-400 bg-sky-500/10 border-sky-500/20"
            />
          )}
          {reasoning?.market && (
            <ReasoningSection
              icon={TrendingUp}
              title={t('recommendation.market')}
              content={reasoning.market}
              color="text-purple-400 bg-purple-500/10 border-purple-500/20"
            />
          )}
          {reasoning?.farm_suitability && (
            <ReasoningSection
              icon={Leaf}
              title={t('recommendation.farmHealth')}
              content={reasoning.farm_suitability}
              color="text-green-400 bg-green-500/10 border-green-500/20"
            />
          )}

          {/* Projected Profit */}
          {projected_profit && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 relative overflow-hidden mt-4">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
              <div className="flex items-center gap-2 mb-3 relative z-10">
                <DollarSign className="w-4 h-4 text-amber-400" />
                <span className="font-semibold text-sm text-amber-300">
                  {t('recommendation.projectedProfit')}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm relative z-10">
                <div>
                  <p className="text-muted-foreground text-[11px] uppercase tracking-wider mb-0.5">{t('recommendation.cost')}</p>
                  <p className="font-semibold text-amber-100 font-mono-stat">RM {projected_profit.cost_per_hectare?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[11px] uppercase tracking-wider mb-0.5">{t('recommendation.revenue')}</p>
                  <p className="font-semibold text-amber-100 font-mono-stat">RM {projected_profit.revenue_per_hectare?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[11px] uppercase tracking-wider mb-0.5">{t('recommendation.margin')}</p>
                  <p className="font-bold text-green-400 font-mono-stat">{projected_profit.margin_percentage}%</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            {accepted ? (
              <button
                onClick={() => onOverride?.(recommendation)}
                className="flex-1 flex items-center justify-center gap-2 border border-border py-2 px-4 rounded-lg text-sm font-medium hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
              >
                <X className="w-4 h-4" />
                {t('recommendation.removeFromPlan')}
              </button>
            ) : (
              <>
                <button
                  onClick={() => onAccept?.(recommendation)}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2 px-4 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {t('recommendation.accept')}
                </button>
                <button
                  onClick={() => onOverride?.(recommendation)}
                  className="flex items-center justify-center gap-2 border border-border py-2 px-4 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4" />
                  {t('recommendation.override')}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ReasoningSection({ icon: Icon, title, content, color }) {
  // `color` string comes in as "text-color bg-color border-color", so we apply all of them to the wrapper
  const [textColor, bgColor, borderColor] = color.split(' ')
  return (
    <div className={`rounded-xl p-3.5 border relative overflow-hidden ${bgColor} ${borderColor}`}>
      <div className="absolute inset-0 bg-white/[0.02] pointer-events-none" />
      <div className="flex items-center gap-2 mb-2 relative z-10">
        <Icon className={`w-4 h-4 ${textColor}`} />
        <span className={`font-semibold text-sm ${textColor}`}>{title}</span>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed relative z-10">{content}</p>
    </div>
  )
}

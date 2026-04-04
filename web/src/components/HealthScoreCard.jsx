import { useTranslation } from 'react-i18next'
import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react'

const trendIcons = { up: TrendingUp, down: TrendingDown, stable: Minus }

function getScoreColor(score) {
  if (score >= 75) return { ring: 'stroke-green-500', text: 'text-green-600', bg: 'bg-green-50' }
  if (score >= 50) return { ring: 'stroke-yellow-500', text: 'text-yellow-600', bg: 'bg-yellow-50' }
  if (score >= 25) return { ring: 'stroke-orange-500', text: 'text-orange-600', bg: 'bg-orange-50' }
  return { ring: 'stroke-red-500', text: 'text-red-600', bg: 'bg-red-50' }
}

function getStatusKey(score) {
  if (score >= 75) return 'healthy'
  if (score >= 50) return 'moderate'
  if (score >= 25) return 'stressed'
  return 'critical'
}

export default function HealthScoreCard({ score, trend, ndviAvg }) {
  const { t } = useTranslation()

  if (score == null) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 text-center">
        <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-muted-foreground text-sm">{t('demandIntel.waitingData')}</p>
      </div>
    )
  }

  const colors = getScoreColor(score)
  const statusKey = getStatusKey(score)
  const TrendIcon = trendIcons[trend] || Minus
  const circumference = 2 * Math.PI * 40
  const offset = circumference - (score / 100) * circumference

  return (
    <div className={`rounded-xl border border-border p-6 ${colors.bg}`}>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-primary" />
        {t('farmMonitor.healthScore')}
      </h3>
      <div className="flex items-center gap-6">
        {/* Circular gauge */}
        <div className="relative w-24 h-24">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-border" />
            <circle
              cx="50" cy="50" r="40" fill="none" strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className={colors.ring}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-2xl font-bold ${colors.text}`}>{score}</span>
          </div>
        </div>
        {/* Details */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-lg font-semibold ${colors.text}`}>
              {t(`farmMonitor.${statusKey}`)}
            </span>
            <TrendIcon className={`w-4 h-4 ${colors.text}`} />
          </div>
          {ndviAvg != null && (
            <p className="text-sm text-muted-foreground">
              NDVI: {ndviAvg.toFixed(3)}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

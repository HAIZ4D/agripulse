import { useTranslation } from 'react-i18next'
import { Lightbulb, CloudRain, Sun, CloudSun } from 'lucide-react'

function generateInsights(weather, demands, t) {
  const insights = []

  if (!weather || weather.length === 0) {
    return [
      {
        icon: CloudSun,
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        title: t('weatherInsight.normal'),
        detail: t('weatherInsight.normalDetail'),
        crops: [],
      },
    ]
  }

  const rainyDays = weather.filter(
    (d) =>
      d.summary_forecast?.toLowerCase().includes('hujan') ||
      d.summary_forecast?.toLowerCase().includes('ribut') ||
      d.summary_forecast?.toLowerCase().includes('rain') ||
      d.summary_forecast?.toLowerCase().includes('thunder')
  )

  const hotDays = weather.filter((d) => (d.max_temp || d.max || 0) > 33)

  if (rainyDays.length >= 2) {
    const risingLeafy = demands.filter(
      (d) =>
        d.trend === 'rising' &&
        ['kangkung', 'bayam', 'sawi'].some((c) => d.crop?.toLowerCase().includes(c))
    )

    insights.push({
      icon: CloudRain,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      title: t('weatherInsight.rainExpected'),
      detail: t('weatherInsight.rainDetail'),
      crops: ['Kangkung', 'Bayam', 'Sawi'],
    })
  }

  if (hotDays.length >= 2) {
    insights.push({
      icon: Sun,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      title: t('weatherInsight.heatExpected'),
      detail: t('weatherInsight.heatDetail'),
      crops: ['Timun', 'Tembikai'],
    })
  }

  if (insights.length === 0) {
    insights.push({
      icon: CloudSun,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      title: t('weatherInsight.normal'),
      detail: t('weatherInsight.normalDetail'),
      crops: [],
    })
  }

  return insights
}

export default function WeatherDemandInsight({ weather, demands }) {
  const { t } = useTranslation()

  const insights = generateInsights(weather, demands, t)

  return (
    <div className="bg-card rounded-xl border border-border p-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Lightbulb className="w-5 h-5 text-amber-500" />
        {t('demandIntel.weatherInsights')}
      </h3>
      <div className="space-y-3">
        {insights.map((insight, i) => {
          const Icon = insight.icon
          return (
            <div key={i} className={`rounded-lg p-4 ${insight.bgColor}`}>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg ${insight.bgColor} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${insight.color}`} />
                </div>
                <div className="flex-1">
                  <p className={`font-semibold text-sm ${insight.color}`}>{insight.title}</p>
                  <p className="text-sm text-foreground/80 mt-1">{insight.detail}</p>
                  {insight.crops.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {insight.crops.map((crop) => (
                        <span
                          key={crop}
                          className="bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs font-medium"
                        >
                          {crop}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

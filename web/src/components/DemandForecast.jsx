import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Brain, Loader2, Sparkles, Info, Calendar, Globe } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import { generateDemandForecast } from '../services/gemini'

const COLORS = ['#2d6a4f', '#40916c', '#52b788', '#74c69d', '#95d5b2']

function ForecastTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.stroke }}>
          {p.name}: {p.value?.toLocaleString()} kg
        </p>
      ))}
    </div>
  )
}

export default function DemandForecast({ demands, weather, area, language }) {
  const { t, i18n } = useTranslation()
  const [forecast, setForecast] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const lang = language || i18n.language || 'ms'

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    try {
      const result = await generateDemandForecast({
        demandData: demands,
        weatherData: weather || [],
        area: area || 'Unknown',
        language: lang,
      })
      setForecast(result)
    } catch (err) {
      console.error('Forecast error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Transform forecast data for the area chart
  const chartData = forecast?.forecasts
    ? [
        {
          name: t('demandIntel.now'),
          ...Object.fromEntries(
            forecast.forecasts.map((f) => [f.crop, f.current_weekly_kg || 0])
          ),
        },
        ...Array.from({ length: 4 }, (_, i) => ({
          name: t('demandIntel.weekN', { n: i + 1 }),
          ...Object.fromEntries(
            forecast.forecasts.map((f) => [
              f.crop,
              f.predicted_weeks?.[i]?.predicted_kg || 0,
            ])
          ),
        })),
      ]
    : []

  const cropNames = forecast?.forecasts?.map((f) => f.crop) || []

  return (
    <div className="bg-card rounded-xl border border-border p-6 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          {t('demandIntel.forecast')}
        </h3>
        {!forecast && !loading && (
          <button
            onClick={handleGenerate}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            {t('demandIntel.generateForecast')}
          </button>
        )}
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{t('demandIntel.analyzingMarket')}</p>
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-4 text-sm">
          <p>{error}</p>
          <button
            onClick={handleGenerate}
            className="mt-2 text-sm font-medium underline"
          >
            {t('common.retry')}
          </button>
        </div>
      )}

      {forecast && !loading && (
        <div className="space-y-4">
          {/* Area Chart */}
          {chartData.length > 0 && (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData} margin={{ left: 10, right: 10, top: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d8e8d0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}kg`} />
                <Tooltip content={<ForecastTooltip />} />
                <Legend />
                {cropNames.map((crop, i) => (
                  <Area
                    key={crop}
                    type="monotone"
                    dataKey={crop}
                    name={crop}
                    stroke={COLORS[i % COLORS.length]}
                    fill={COLORS[i % COLORS.length]}
                    fillOpacity={0.1}
                    strokeWidth={2}
                    animationDuration={1500}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}

          {/* Market Insight */}
          {forecast.market_insight && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
              <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5 relative z-10" />
              <div className="relative z-10">
                <p className="font-semibold text-sm text-blue-300">{t('demandIntel.marketInsight')}</p>
                <p className="text-sm text-blue-100 mt-1 leading-relaxed">{forecast.market_insight}</p>
              </div>
            </div>
          )}

          {/* Events Impact */}
          {forecast.events_impact?.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
              <div className="flex items-center gap-2 mb-3 relative z-10">
                <Calendar className="w-4 h-4 text-amber-400" />
                <p className="font-semibold text-sm text-amber-300">
                  {i18n.language === 'ms' ? 'Kesan Acara & Perayaan' : 'Events & Festive Impact'}
                </p>
              </div>
              <div className="space-y-2.5 relative z-10">
                {forecast.events_impact.map((evt, i) => (
                  <div key={i} className="flex flex-col sm:flex-row gap-1 sm:gap-2 text-sm border-l-2 border-amber-500/30 pl-3">
                    <span className="font-semibold text-amber-200 shrink-0">{evt.event}:</span>
                    <span className="text-amber-50 leading-relaxed">{evt.effect}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Per-crop reasoning */}
          <div className="space-y-3">
            {forecast.forecasts?.map((f, i) => (
              <div key={f.crop} className="bg-card border border-border rounded-xl p-3.5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary/60" />
                <p className="font-bold text-sm text-foreground capitalize pl-2">{f.crop}</p>
                <p className="text-sm text-muted-foreground mt-1.5 pl-2 leading-relaxed">{f.reasoning}</p>
              </div>
            ))}
          </div>

          {/* Regenerate button */}
          <button
            onClick={handleGenerate}
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {t('demandIntel.generateForecast')}
          </button>
        </div>
      )}
    </div>
  )
}

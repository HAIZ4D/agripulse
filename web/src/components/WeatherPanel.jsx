import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { CloudSun, CloudRain, Sun, Cloud, Loader2, AlertTriangle } from 'lucide-react'
import { fetchForecast } from '../services/weatherMY'

const forecastIcons = {
  'Panas': Sun,
  'Cerah': Sun,
  'Tiada hujan': Sun,
  'Hujan': CloudRain,
  'Ribut petir': CloudRain,
  'default': CloudSun,
}

function getIcon(forecast) {
  if (!forecast) return Cloud
  for (const [key, Icon] of Object.entries(forecastIcons)) {
    if (key !== 'default' && forecast.includes(key)) return Icon
  }
  return forecastIcons.default
}

export default function WeatherPanel({ areaName }) {
  const { t } = useTranslation()
  const [forecasts, setForecasts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!areaName) return
    setLoading(true)
    setError(null)
    fetchForecast(areaName)
      .then((data) => {
        setForecasts(Array.isArray(data) ? data.slice(0, 7) : [])
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [areaName])

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="text-lg font-semibold mb-4">{t('weather.title')}</h3>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">{t('common.loading')}</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="text-lg font-semibold mb-4">{t('weather.title')}</h3>
        <div className="flex items-center gap-2 text-destructive py-4">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </div>
    )
  }

  if (forecasts.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="text-lg font-semibold mb-4">{t('weather.title')}</h3>
        <p className="text-muted-foreground py-4">{t('demandIntel.waitingData')}</p>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <h3 className="text-lg font-semibold mb-4">{t('weather.title')}</h3>
      <div className="grid gap-3">
        {forecasts.map((day, i) => {
          const Icon = getIcon(day.summary_forecast)
          return (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">{day.date}</p>
                  <p className="text-xs text-muted-foreground">{day.summary_forecast}</p>
                </div>
              </div>
              <div className="text-right text-sm">
                <span className="text-blue-600">{day.min_temp}°</span>
                <span className="text-muted-foreground mx-1">—</span>
                <span className="text-red-500">{day.max_temp}°</span>
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-3 text-right">{t('weather.source')}</p>
    </div>
  )
}

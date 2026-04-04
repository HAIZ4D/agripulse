import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  TrendingUp, TrendingDown, Minus, Loader2, Sparkles,
  ShieldAlert, Sprout, Target, ChevronDown, ChevronUp,
  ArrowUpRight, ArrowDownRight, ArrowRight,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { generateHealthPrediction } from '../services/gemini'

const trajectoryConfig = {
  improving: { icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50 border-green-200', label: 'prediction.improving' },
  stable: { icon: Minus, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', label: 'prediction.stable' },
  declining: { icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50 border-red-200', label: 'prediction.declining' },
}

const probabilityColor = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
}

const outlookIcon = {
  improving: ArrowUpRight,
  stable: ArrowRight,
  declining: ArrowDownRight,
}

export default function HealthPrediction({ report, history, weather, farm, area, language }) {
  const { t } = useTranslation()
  const [prediction, setPrediction] = useState(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState({ risks: true, crops: true })

  const handlePredict = async () => {
    setLoading(true)
    try {
      const reportHistory = history.map((h) => ({
        date: h.id,
        ndvi: h.ndvi_average,
        ndwi: h.ndwi_average,
        health_score: h.health_score,
      }))
      if (report && !reportHistory.find((r) => r.date === report.id)) {
        reportHistory.unshift({
          date: report.id,
          ndvi: report.ndvi_average,
          ndwi: report.ndwi_average,
          health_score: report.health_score,
        })
      }

      const result = await generateHealthPrediction({
        reportHistory,
        weatherData: weather,
        cropInfo: farm?.current_crops || [],
        farmArea: area,
        language,
      })
      setPrediction(result)
    } catch (err) {
      console.error('Prediction error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Build chart data from history + predictions
  const buildChartData = () => {
    if (!prediction) return []
    const data = []

    // Historical data points
    const sortedHistory = [...(history || [])].reverse()
    sortedHistory.forEach((h) => {
      data.push({ name: h.id?.slice(5) || '', score: h.health_score, type: 'actual' })
    })
    if (report && !sortedHistory.find((h) => h.id === report.id)) {
      data.push({ name: report.id?.slice(5) || t('prediction.now'), score: report.health_score, type: 'actual' })
    }

    // Predicted data points
    prediction.predicted_scores?.forEach((p) => {
      data.push({
        name: t('prediction.weekN', { n: p.week }),
        predicted: p.predicted_score,
        confidence: p.confidence,
        type: 'predicted',
      })
    })

    // Connect actual to predicted with bridge point
    if (data.length > 0) {
      const lastActual = data.filter((d) => d.type === 'actual').pop()
      const firstPredicted = data.find((d) => d.type === 'predicted')
      if (lastActual && firstPredicted) {
        firstPredicted.score = lastActual.score
      }
    }

    return data
  }

  const traj = prediction ? trajectoryConfig[prediction.health_trajectory] || trajectoryConfig.stable : null
  const TrajIcon = traj?.icon || Minus

  return (
    <div className="overflow-hidden">
      <div className="pb-4 border-b border-border/50 mb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {t('prediction.title')}
          </h3>
          <button
            onClick={handlePredict}
            disabled={loading || !report}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('prediction.analyzing') : t('prediction.predict')}
          </button>
        </div>
        {!report && (
          <p className="text-sm text-muted-foreground mt-2">{t('prediction.needsData')}</p>
        )}
      </div>

      {loading && (
        <div className="py-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t('prediction.analyzingDetail')}</p>
        </div>
      )}

      {prediction && !loading && (
        <div className="divide-y divide-border/50">
          {/* Trajectory Badge + Summary */}
          <div className="py-4">
            <div className="flex items-center gap-3 mb-3">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${traj?.bg}`}>
                <TrajIcon className={`w-4 h-4 ${traj?.color}`} />
                <span className={`text-sm font-semibold ${traj?.color}`}>
                  {t(traj?.label)}
                </span>
              </div>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed">{prediction.summary}</p>
          </div>

          {/* Prediction Chart */}
          {prediction.predicted_scores?.length > 0 && (
            <div className="py-4">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-muted-foreground" />
                {t('prediction.healthForecast')}
              </h4>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={buildChartData()} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2d6a4f" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2d6a4f" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="predictGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid #e5e7eb' }}
                      formatter={(value, name) => [
                        value != null ? `${Math.round(value)}/100` : '—',
                        name === 'score' ? t('prediction.actual') : t('prediction.predicted'),
                      ]}
                    />
                    <ReferenceLine y={75} stroke="#22c55e" strokeDasharray="3 3" strokeOpacity={0.5} />
                    <ReferenceLine y={50} stroke="#eab308" strokeDasharray="3 3" strokeOpacity={0.5} />
                    <Area type="monotone" dataKey="score" stroke="#2d6a4f" strokeWidth={2} fill="url(#actualGrad)" dot={{ r: 3 }} />
                    <Area type="monotone" dataKey="predicted" stroke="#7c3aed" strokeWidth={2} strokeDasharray="6 3" fill="url(#predictGrad)" dot={{ r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-6 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#2d6a4f] rounded" /> {t('prediction.actual')}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#7c3aed] rounded border-dashed" style={{ borderBottom: '2px dashed #7c3aed', height: 0 }} /> {t('prediction.predicted')}
                </span>
              </div>
            </div>
          )}

          {/* Risk Forecast */}
          {prediction.risk_forecast?.length > 0 && (
            <div className="p-5">
              <button
                onClick={() => setExpanded((p) => ({ ...p, risks: !p.risks }))}
                className="w-full flex items-center justify-between mb-3"
              >
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-orange-500" />
                  {t('prediction.riskForecast')} ({prediction.risk_forecast.length})
                </h4>
                {expanded.risks ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {expanded.risks && (
                <div className="space-y-2">
                  {prediction.risk_forecast.map((risk, i) => (
                    <div key={i} className="rounded-lg border border-border p-3 bg-muted/30">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-medium text-sm">{risk.risk}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${probabilityColor[risk.probability] || probabilityColor.low}`}>
                          {risk.probability}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{risk.timeframe} — {risk.impact}</p>
                      <p className="text-xs text-primary font-medium">{t('prediction.prevention')}: {risk.prevention}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Crop Predictions */}
          {prediction.crop_predictions?.length > 0 && (
            <div className="p-5">
              <button
                onClick={() => setExpanded((p) => ({ ...p, crops: !p.crops }))}
                className="w-full flex items-center justify-between mb-3"
              >
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Sprout className="w-4 h-4 text-green-600" />
                  {t('prediction.cropPredictions')} ({prediction.crop_predictions.length})
                </h4>
                {expanded.crops ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {expanded.crops && (
                <div className="space-y-2">
                  {prediction.crop_predictions.map((crop, i) => {
                    const OutlookIcon = outlookIcon[crop.health_outlook] || ArrowRight
                    const outlookColor = crop.health_outlook === 'improving' ? 'text-green-600' : crop.health_outlook === 'declining' ? 'text-red-600' : 'text-blue-600'

                    return (
                      <div key={i} className="rounded-lg border border-border p-4 bg-muted/20">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Sprout className="w-4 h-4 text-green-600" />
                            <span className="font-semibold text-sm">{crop.crop}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <OutlookIcon className={`w-4 h-4 ${outlookColor}`} />
                            <span className={`text-xs font-medium ${outlookColor}`}>{t(`prediction.${crop.health_outlook}`)}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">{t('prediction.harvest')}:</span>
                            <span className="ml-1 font-medium">{crop.estimated_harvest}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{t('prediction.yield')}:</span>
                            <span className="ml-1 font-medium">{crop.yield_estimate?.replace(/_/g, ' ')}</span>
                          </div>
                        </div>
                        <p className="text-xs text-primary font-medium mt-2">{crop.key_action}</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

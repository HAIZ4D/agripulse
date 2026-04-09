import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Brain, Loader2, Sparkles, Bug, Sprout, Droplets, Calendar,
  AlertTriangle, CheckCircle2, Clock, ShieldAlert, CloudRain,
  ChevronDown, ChevronUp, Zap, Target,
} from 'lucide-react'
import { generateFarmAdvisory } from '../services/gemini'

const riskColors = {
  low: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', badge: 'bg-green-500/20 text-green-400' },
  medium: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', badge: 'bg-yellow-500/20 text-yellow-400' },
  'medium-high': { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', badge: 'bg-orange-500/20 text-orange-400' },
  high: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', badge: 'bg-red-500/20 text-red-400' },
}

const healthColors = {
  healthy: 'text-green-400 bg-green-500/20',
  moderate: 'text-yellow-400 bg-yellow-500/20',
  stressed: 'text-orange-400 bg-orange-500/20',
  critical: 'text-red-400 bg-red-500/20',
}

const priorityConfig = {
  high: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', icon: Zap },
  medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30', icon: Clock },
  low: { color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30', icon: CheckCircle2 },
}

const statusConfig = {
  excellent: { color: 'text-green-400', bg: 'bg-green-500/10', label: 'Excellent' },
  good: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'Good' },
  attention_needed: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: 'Needs Attention' },
  critical: { color: 'text-red-400', bg: 'bg-red-500/10', label: 'Critical' },
}

export default function AIFarmAdvisor({
  report, weather, farm, area, language,
  zoneStats = null, changeDetection = null, criticalZones = null,
  ndreAverage = null, ndwiAverage = null,
}) {
  const { t, i18n } = useTranslation()
  const [advisory, setAdvisory] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [expandedSections, setExpandedSections] = useState({ pest: true, crops: true, tasks: true, zone: true })

  const lang = language || i18n.language || 'ms'

  function toggleSection(key) {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    try {
      const result = await generateFarmAdvisory({
        ndviData: {
          ndvi_average: report?.ndvi_average,
          ndwi_average: report?.ndwi_average,
          ndre_average: report?.ndre_average,
          health_score: report?.health_score,
          area_hectares: farm?.area_hectares || farm?.boundary?.area_hectares,
          data_quality: report?.data_quality,
          composite_days: report?.composite_days,
        },
        weatherData: weather || [],
        cropInfo: farm?.current_crops || [],
        farmArea: area,
        language: lang,
        zoneStats: zoneStats || report?.zone_stats || null,
        changeDetection: changeDetection || report?.change_detection || null,
        criticalZones: criticalZones || (report?.zones || []).filter((z) => z.classification === 'critical'),
        ndreAverage: ndreAverage ?? report?.ndre_average ?? null,
        ndwiAverage: ndwiAverage ?? report?.ndwi_average ?? null,
      })
      setAdvisory(result)
    } catch (err) {
      console.error('Farm advisory error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const status = statusConfig[advisory?.farm_status] || statusConfig.good

  return (
    <div className="overflow-hidden">
      {/* Header */}
      <div className="pb-4 border-b border-border/50 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">{t('farmMonitor.aiAdvisor')}</h3>
            <p className="text-xs text-muted-foreground">{t('farmMonitor.aiAdvisorDesc')}</p>
          </div>
        </div>
        {!advisory && !loading && (
          <button
            onClick={handleGenerate}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            {t('farmMonitor.analyzeNow')}
          </button>
        )}
        {advisory && !loading && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${status.bg}`}>
            <div className={`w-2 h-2 rounded-full ${status.color === 'text-green-600' ? 'bg-green-500' : status.color === 'text-emerald-600' ? 'bg-emerald-500' : status.color === 'text-yellow-600' ? 'bg-yellow-500' : 'bg-red-500'}`} />
            <span className={`text-sm font-semibold ${status.color}`}>{status.label}</span>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="relative">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <Brain className="w-4 h-4 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-sm text-muted-foreground">{t('farmMonitor.aiAnalyzing')}</p>
          <p className="text-xs text-muted-foreground/60">{t('farmMonitor.aiAnalyzingDetail')}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="py-4">
          <div className="bg-destructive/10 text-destructive rounded-lg p-4 text-sm">
            <p>{error}</p>
            <button onClick={handleGenerate} className="mt-2 text-sm font-medium underline">
              {t('common.retry')}
            </button>
          </div>
        </div>
      )}

      {/* Advisory Results */}
      {advisory && !loading && (
        <div className="divide-y divide-border">
          {/* Summary */}
          {advisory.summary && (
            <div className="py-4">
              <div className="bg-primary/5 rounded-lg p-4 flex gap-3">
                <Brain className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm leading-relaxed">{advisory.summary}</p>
              </div>
            </div>
          )}

          {/* Zone Insight — precision zoning banner */}
          {advisory.zone_insight && (
            <div className="py-4">
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 flex gap-3">
                <Target className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-xs text-blue-400 mb-1">Zone Precision Insight</p>
                  <p className="text-sm leading-relaxed text-foreground/80">{advisory.zone_insight}</p>
                </div>
              </div>
            </div>
          )}

          {/* Weather Warning */}
          {advisory.weather_warning && (
            <div className="px-5 py-4">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex gap-3">
                <CloudRain className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm text-amber-400">{t('farmMonitor.weatherWarning')}</p>
                  <p className="text-sm text-amber-300/80 mt-1">{advisory.weather_warning}</p>
                </div>
              </div>
            </div>
          )}

          {/* Pest & Disease Risks */}
          {advisory.pest_risks?.length > 0 && (
            <div className="py-4">
              <button
                onClick={() => toggleSection('pest')}
                className="w-full flex items-center justify-between mb-3"
              >
                <h4 className="font-semibold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-500" />
                  {t('farmMonitor.pestRisk')}
                  <span className="text-xs font-normal text-muted-foreground">({advisory.pest_risks.length})</span>
                </h4>
                {expandedSections.pest ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {expandedSections.pest && (
                <div className="space-y-3">
                  {advisory.pest_risks.map((pest, i) => {
                    const colors = riskColors[pest.risk_level] || riskColors.low
                    return (
                      <div key={i} className={`rounded-lg border p-4 ${colors.bg} ${colors.border}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Bug className={`w-4 h-4 ${colors.text}`} />
                            <span className={`font-semibold text-sm ${colors.text}`}>{pest.pest}</span>
                          </div>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.badge}`}>
                            {pest.risk_level}
                          </span>
                        </div>
                        {pest.affected_crops?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {pest.affected_crops.map((crop, j) => (
                              <span key={j} className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-foreground/80 font-medium">
                                {crop}
                              </span>
                            ))}
                          </div>
                        )}
                        {pest.signs && (
                          <p className="text-xs text-foreground/70 mb-1">
                            <span className="font-medium text-foreground/90">{t('farmMonitor.lookFor')}:</span> {pest.signs}
                          </p>
                        )}
                        {pest.prevention && (
                          <p className="text-xs text-foreground/70">
                            <span className="font-medium text-foreground/90">{t('farmMonitor.prevention')}:</span> {pest.prevention}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Crop-by-Crop Advice */}
          {advisory.crop_advice?.length > 0 && (
            <div className="py-4">
              <button
                onClick={() => toggleSection('crops')}
                className="w-full flex items-center justify-between mb-3"
              >
                <h4 className="font-semibold flex items-center gap-2">
                  <Sprout className="w-4 h-4 text-green-600" />
                  {t('farmMonitor.cropAdvice')}
                </h4>
                {expandedSections.crops ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {expandedSections.crops && (
                <div className="space-y-3">
                  {advisory.crop_advice.map((crop, i) => {
                    const hColor = healthColors[crop.health] || healthColors.moderate
                    return (
                      <div key={i} className="rounded-lg border border-border bg-muted/30 overflow-hidden">
                        {/* Crop Header */}
                        <div className="p-3 flex items-center justify-between border-b border-border/50">
                          <div className="flex items-center gap-2">
                            <Sprout className="w-4 h-4 text-primary" />
                            <span className="font-semibold text-sm">{crop.crop}</span>
                          </div>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${hColor}`}>
                            {crop.health}
                          </span>
                        </div>
                        {/* Crop Details */}
                        <div className="p-3 space-y-2 text-sm">
                          {crop.action && (
                            <div className="flex gap-2">
                              <Target className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                              <div>
                                <span className="font-medium text-xs text-muted-foreground">{t('farmMonitor.action')}</span>
                                <p className="text-sm">{crop.action}</p>
                              </div>
                            </div>
                          )}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {crop.irrigation && (
                              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2.5">
                                <div className="flex items-center gap-1 mb-1">
                                  <Droplets className="w-3 h-3 text-blue-400" />
                                  <span className="text-xs font-medium text-blue-400">{t('farmMonitor.irrigation')}</span>
                                </div>
                                <p className="text-xs text-foreground/70">{crop.irrigation}</p>
                              </div>
                            )}
                            {crop.fertilizer && (
                              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5">
                                <div className="flex items-center gap-1 mb-1">
                                  <Sprout className="w-3 h-3 text-amber-400" />
                                  <span className="text-xs font-medium text-amber-400">{t('farmMonitor.fertilizer')}</span>
                                </div>
                                <p className="text-xs text-foreground/70">{crop.fertilizer}</p>
                              </div>
                            )}
                            {crop.harvest_window && (
                              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2.5">
                                <div className="flex items-center gap-1 mb-1">
                                  <Calendar className="w-3 h-3 text-green-400" />
                                  <span className="text-xs font-medium text-green-400">{t('farmMonitor.harvestWindow')}</span>
                                </div>
                                <p className="text-xs text-foreground/70">{crop.harvest_window}</p>
                              </div>
                            )}
                          </div>
                          {crop.market_tip && (
                            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-2.5 flex gap-2">
                              <Sparkles className="w-3 h-3 text-purple-400 shrink-0 mt-0.5" />
                              <div>
                                <span className="text-xs font-medium text-purple-400">{t('farmMonitor.marketTip')}</span>
                                <p className="text-xs text-foreground/70">{crop.market_tip}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Weekly Task List */}
          {advisory.weekly_tasks?.length > 0 && (
            <div className="py-4">
              <button
                onClick={() => toggleSection('tasks')}
                className="w-full flex items-center justify-between mb-3"
              >
                <h4 className="font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  {t('farmMonitor.weeklyTasks')}
                </h4>
                {expandedSections.tasks ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {expandedSections.tasks && (
                <div className="space-y-2">
                  {advisory.weekly_tasks.map((task, i) => {
                    const config = priorityConfig[task.priority] || priorityConfig.medium
                    const PriorityIcon = config.icon
                    return (
                      <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${config.bg}`}>
                        <PriorityIcon className={`w-4 h-4 shrink-0 mt-0.5 ${config.color}`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-semibold text-muted-foreground">{task.day}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${config.color} bg-white/10`}>
                              {task.priority}
                            </span>
                          </div>
                          <p className="text-sm">{task.task}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Regenerate */}
          <div className="p-4">
            <button
              onClick={handleGenerate}
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {t('farmMonitor.regenerateAdvice')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

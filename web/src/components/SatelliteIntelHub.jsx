import { useState } from 'react'
import {
  Satellite, TrendingUp, TrendingDown, Minus, AlertTriangle,
  Droplets, Leaf, FlaskConical, Search, CheckCircle2, Zap,
  ChevronDown, ChevronUp, Info, Loader2, Play, RefreshCw,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { triggerCloudAnalysis } from '../services/satelliteAnalysis'

// ─── Index metadata ───────────────────────────────────────────────────────────
const INDEX_META = {
  ndvi: {
    label: 'NDVI',
    fullName: 'Vegetation Health',
    description: 'Overall crop greenness and biomass. Higher = denser healthy vegetation.',
    bands: 'B8 / B4',
    goodRange: [0.45, 1.0],
    warnRange: [0.25, 0.45],
    icon: Leaf,
    color: 'green',
    thresholds: { critical: 0.15, moderate: 0.30, healthy: 0.45 },
    unit: '',
  },
  ndwi: {
    label: 'NDWI',
    fullName: 'Water Stress',
    description: 'Crop water content — detects drought stress and over-irrigation.',
    bands: 'B3 / B8',
    goodRange: [-0.10, 0.30],
    warnRange: [-0.25, -0.10],
    icon: Droplets,
    color: 'blue',
    thresholds: { critical: -0.35, moderate: -0.20, healthy: -0.10 },
    unit: '',
    invertScale: true,
  },
  ndre: {
    label: 'NDRE',
    fullName: 'Early Stress (N)',
    description: 'Red-Edge index — detects nitrogen/chlorophyll deficiency 2–3 weeks before NDVI drops.',
    bands: 'B8 / B5',
    goodRange: [0.28, 1.0],
    warnRange: [0.18, 0.28],
    icon: FlaskConical,
    color: 'amber',
    thresholds: { critical: 0.18, moderate: 0.28, healthy: 0.35 },
    unit: '',
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getIndexStatus(index, value) {
  if (value === null || value === undefined) return 'nodata'
  const { thresholds, invertScale } = INDEX_META[index]
  if (invertScale) {
    if (value < thresholds.critical) return 'critical'
    if (value < thresholds.moderate) return 'moderate'
    return 'healthy'
  }
  if (value < thresholds.critical) return 'critical'
  if (value < thresholds.moderate) return 'moderate'
  if (value >= thresholds.healthy) return 'healthy'
  return 'moderate'
}

const STATUS_STYLES = {
  healthy: {
    badge: 'bg-green-500/15 text-green-400 border-green-500/30',
    bar: 'bg-green-500',
    text: 'text-green-400',
    label: 'Healthy',
  },
  moderate: {
    badge: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    bar: 'bg-yellow-400',
    text: 'text-yellow-400',
    label: 'Moderate',
  },
  critical: {
    badge: 'bg-red-500/15 text-red-400 border-red-500/30',
    bar: 'bg-red-500',
    text: 'text-red-400',
    label: 'Critical',
  },
  nodata: {
    badge: 'bg-muted/30 text-muted-foreground border-border',
    bar: 'bg-muted',
    text: 'text-muted-foreground',
    label: '—',
  },
}

function toBarPct(index, value) {
  if (value === null || value === undefined) return 0
  const clamped = Math.max(-1, Math.min(1, value))
  return ((clamped + 1) / 2) * 100
}

function TrendIcon({ trend }) {
  if (trend === 'improving') return <TrendingUp className="w-3.5 h-3.5 text-green-400" />
  if (trend === 'declining') return <TrendingDown className="w-3.5 h-3.5 text-red-400" />
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />
}

const ACTION_META = {
  irrigate: { icon: Droplets, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/25', label: 'Irrigate' },
  fertilize: { icon: FlaskConical, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/25', label: 'Fertilize (N)' },
  inspect: { icon: Search, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/25', label: 'Inspect' },
  monitor: { icon: Info, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/25', label: 'Monitor' },
  plant: { icon: Leaf, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/25', label: 'Plant' },
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function IndexCard({ indexKey, value, meta }) {
  const [showInfo, setShowInfo] = useState(false)
  const status = getIndexStatus(indexKey, value)
  const styles = STATUS_STYLES[status]
  const IndexIcon = meta.icon
  const barPct = toBarPct(indexKey, value)

  return (
    <div className="p-4 rounded-xl border border-border/50 bg-muted/20 flex flex-col gap-2 relative group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <IndexIcon className={`w-4 h-4 ${styles.text}`} />
          <span className="font-bold text-sm text-foreground">{meta.label}</span>
        </div>
        <button
          onClick={() => setShowInfo((p) => !p)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-muted-foreground hover:text-foreground"
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className={`text-2xl font-extrabold tracking-tight ${styles.text}`}>
        {value !== null && value !== undefined ? value.toFixed(3) : '—'}
      </div>
      <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${styles.bar}`} style={{ width: `${barPct}%` }} />
      </div>
      <span className={`self-start text-[10px] font-bold px-2 py-0.5 rounded-full border ${styles.badge}`}>
        {styles.label}
      </span>
      {showInfo && (
        <div className="absolute top-full left-0 mt-1 z-50 w-56 bg-card border border-border rounded-xl p-3 shadow-xl text-xs text-muted-foreground leading-relaxed">
          <p className="font-semibold text-foreground mb-1">{meta.fullName}</p>
          <p>{meta.description}</p>
          <p className="mt-1 font-mono text-[10px]">Bands: {meta.bands}</p>
        </div>
      )}
    </div>
  )
}

function ZoneBar({ healthy, moderate, critical, total }) {
  if (!total) return null
  const hPct = (healthy / total) * 100
  const mPct = (moderate / total) * 100
  const cPct = (critical / total) * 100
  return (
    <div className="flex gap-0.5 h-2.5 rounded-full overflow-hidden w-full">
      <div className="bg-green-500 rounded-l-full transition-all duration-700" style={{ width: `${hPct}%` }} title={`Healthy: ${healthy}`} />
      <div className="bg-yellow-400 transition-all duration-700" style={{ width: `${mPct}%` }} title={`Moderate: ${moderate}`} />
      <div className="bg-red-500 rounded-r-full transition-all duration-700" style={{ width: `${cPct}%` }} title={`Critical: ${critical}`} />
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SatelliteIntelHub({ report, boundary, farmerId }) {
  const { t } = useTranslation()
  const [showZones, setShowZones] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [progress, setProgress] = useState({ message: '', pct: 0 })
  const [error, setError] = useState(null)

  const hasData = report && (report.ndvi_average !== null && report.ndvi_average !== undefined)
  const hasZones = report?.zones?.length > 0
  const zoneStats = report?.zone_stats
  const changeDetection = report?.change_detection
  const criticalZones = (report?.zones || []).filter((z) => z.classification === 'critical')
  const actionZones = (report?.zones || []).filter((z) => z.action_needed && z.action_needed !== 'monitor')

  const overallTrend = changeDetection?.overall_trend ?? null
  const isComposite = report?.data_quality === 'composite'
  const canRunAnalysis = boundary?.coordinates && farmerId

  async function handleRunAnalysis() {
    if (analyzing) return
    setAnalyzing(true)
    setError(null)
    setProgress({ message: 'Triggering server-side analysis...', pct: 5 })

    try {
      // Cloud Function mode — uses Firebase service account, no token needed
      setProgress({ message: 'Running satellite analysis on server (this may take 2–4 minutes)...', pct: 10 })
      await triggerCloudAnalysis((message, pct) => setProgress({ message, pct }))
      // The Firestore subscription will auto-update the report with all indices
    } catch (cloudErr) {
      console.error('Cloud Function failed:', cloudErr.message)
      setError(
        'Satellite analysis is still processing on the server. ' +
        'This can take 2–4 minutes for all farms. Please wait and refresh the page, ' +
        'or check the Firebase Console for the latest report.'
      )
    }

    setAnalyzing(false)
  }

  // --- Build key insights list ---
  const insights = []
  if (criticalZones.length > 0) {
    const byAction = {}
    criticalZones.forEach((z) => {
      const a = z.action_needed || 'inspect'
      if (!byAction[a]) byAction[a] = []
      byAction[a].push(z.zone_id)
    })
    Object.entries(byAction).forEach(([action, ids]) => {
      const meta = ACTION_META[action]
      insights.push({ action, meta, zones: ids, severity: 'critical' })
    })
  }
  if (report?.ndre_average !== null && report?.ndre_average !== undefined) {
    if (report.ndre_average < 0.18) {
      insights.push({
        action: 'fertilize',
        meta: ACTION_META.fertilize,
        label: `NDRE ${report.ndre_average.toFixed(3)} — severe nitrogen deficiency. Apply N-fertilizer immediately.`,
        severity: 'critical',
      })
    } else if (report.ndre_average < 0.28) {
      insights.push({
        action: 'fertilize',
        meta: ACTION_META.fertilize,
        label: `NDRE ${report.ndre_average.toFixed(3)} — low nitrogen. Schedule fertilization within 7 days.`,
        severity: 'warning',
      })
    }
  }
  if (report?.ndwi_average !== null && report?.ndwi_average !== undefined) {
    if (report.ndwi_average < -0.30) {
      insights.push({
        action: 'irrigate',
        meta: ACTION_META.irrigate,
        label: `NDWI ${report.ndwi_average.toFixed(3)} — severe water stress. Irrigate now.`,
        severity: 'critical',
      })
    }
  }
  if (changeDetection?.zones_critical_new > 0) {
    insights.push({
      action: 'inspect',
      meta: ACTION_META.inspect,
      label: `${changeDetection.zones_critical_new} zone(s) newly became critical since last scan.`,
      severity: 'warning',
    })
  }
  if (insights.length === 0 && hasData) {
    insights.push({
      action: null,
      meta: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/25', label: 'All Clear' },
      label: 'No critical issues detected. Farm looks healthy.',
      severity: 'ok',
    })
  }

  return (
    <div className="dashboard-card p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Satellite className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Satellite Intelligence</h3>
            <p className="text-xs text-muted-foreground">
              {isComposite ? `${report?.composite_days ?? 30}-day cloud-masked composite` : 'Live satellite data'}
              {report?.id ? ` · ${report.id}` : ''}
            </p>
          </div>
        </div>
        {overallTrend && (
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border ${
            overallTrend === 'improving' ? 'bg-green-500/10 border-green-500/25 text-green-400'
            : overallTrend === 'declining' ? 'bg-red-500/10 border-red-500/25 text-red-400'
            : 'bg-muted/30 border-border text-muted-foreground'
          }`}>
            <TrendIcon trend={overallTrend} />
            <span className="capitalize">{overallTrend}</span>
          </div>
        )}
        {/* Run Analysis / Refresh button */}
        {canRunAnalysis && (
          <button
            onClick={handleRunAnalysis}
            disabled={analyzing}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              analyzing
                ? 'bg-muted/30 border-border text-muted-foreground cursor-wait'
                : 'bg-primary/10 border-primary/25 text-primary hover:bg-primary/20'
            }`}
          >
            {analyzing
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing...</>
              : hasZones
              ? <><RefreshCw className="w-3.5 h-3.5" /> Re-Scan</>
              : <><Play className="w-3.5 h-3.5" /> Run Analysis</>
            }
          </button>
        )}
      </div>

      {/* Progress bar during analysis */}
      {analyzing && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{progress.message}</span>
            <span className="text-primary font-mono">{progress.pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress.pct}%` }} />
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-400">
          <p className="font-semibold mb-1">Analysis failed</p>
          <p>{error}</p>
        </div>
      )}

      {!hasData && !analyzing ? (
        /* No data state */
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center">
            <Satellite className="w-7 h-7 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">No satellite data yet</p>
          <p className="text-xs text-muted-foreground/60 max-w-xs">
            Click "Run Analysis" to fetch NDVI, NDWI, NDRE for your farm and generate micro-zone analysis.
          </p>
          {canRunAnalysis && (
            <button
              onClick={handleRunAnalysis}
              className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
            >
              <Play className="w-4 h-4" />
              Run Satellite Analysis
            </button>
          )}
        </div>
      ) : (
        <>
          {/* 3-Index Cards */}
          <div className="grid grid-cols-3 gap-3">
            <IndexCard indexKey="ndvi" value={report.ndvi_average} meta={INDEX_META.ndvi} />
            <IndexCard indexKey="ndwi" value={report.ndwi_average} meta={INDEX_META.ndwi} />
            <IndexCard indexKey="ndre" value={report.ndre_average} meta={INDEX_META.ndre} />
          </div>

          {/* Zone Summary Bar */}
          {zoneStats && zoneStats.total_zones > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">{zoneStats.total_zones} Micro-Zones</span>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />{zoneStats.healthy_count} healthy</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />{zoneStats.moderate_count} moderate</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />{zoneStats.critical_count} critical</span>
                </div>
              </div>
              <ZoneBar
                healthy={zoneStats.healthy_count}
                moderate={zoneStats.moderate_count}
                critical={zoneStats.critical_count}
                total={zoneStats.total_zones}
              />
            </div>
          )}

          {/* Key Actions (Insights Banner) */}
          {insights.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-primary" /> Priority Actions
              </p>
              {insights.slice(0, 4).map((insight, i) => {
                const IconComp = insight.meta.icon
                const isCrit = insight.severity === 'critical'
                const zoneLabel = insight.zones?.length
                  ? `(${insight.zones.slice(0, 3).join(', ')}${insight.zones.length > 3 ? ` +${insight.zones.length - 3}` : ''})`
                  : ''
                return (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${insight.meta.bg}`}>
                    <IconComp className={`w-4 h-4 shrink-0 mt-0.5 ${insight.meta.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${insight.meta.color}`}>{insight.meta.label}</span>
                        {isCrit && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold">URGENT</span>}
                        {zoneLabel && <span className="text-[10px] text-muted-foreground font-mono">{zoneLabel}</span>}
                      </div>
                      <p className="text-xs text-foreground/80 mt-0.5 leading-relaxed">
                        {insight.label || (insight.zones?.length
                          ? `${insight.zones.length} zone(s) need action`
                          : `Action required`)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Change Detection */}
          {changeDetection && (
            <div className="p-3 rounded-xl bg-muted/20 border border-border/40">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-muted-foreground">Change vs last scan</span>
                <span className={`font-bold capitalize ${
                  changeDetection.overall_trend === 'improving' ? 'text-green-400'
                  : changeDetection.overall_trend === 'declining' ? 'text-red-400'
                  : 'text-muted-foreground'
                }`}>{changeDetection.overall_trend}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-1.5 rounded-lg bg-green-500/10">
                  <p className="font-bold text-green-400">{changeDetection.zones_improved}</p>
                  <p className="text-muted-foreground">Improved</p>
                </div>
                <div className="p-1.5 rounded-lg bg-muted/30">
                  <p className="font-bold text-foreground">{changeDetection.zones_stable}</p>
                  <p className="text-muted-foreground">Stable</p>
                </div>
                <div className="p-1.5 rounded-lg bg-red-500/10">
                  <p className="font-bold text-red-400">{changeDetection.zones_declined}</p>
                  <p className="text-muted-foreground">Declined</p>
                </div>
              </div>
            </div>
          )}

          {/* Zone drill-down toggle */}
          {actionZones.length > 0 && (
            <div>
              <button
                onClick={() => setShowZones((p) => !p)}
                className="w-full flex items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  {actionZones.length} zone{actionZones.length > 1 ? 's' : ''} need attention
                </span>
                {showZones ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showZones && (
                <div className="mt-2 space-y-1.5 max-h-52 overflow-y-auto">
                  {actionZones.map((zone) => {
                    const actionMeta = ACTION_META[zone.action_needed] || ACTION_META.monitor
                    const ActionIcon = actionMeta.icon
                    const clsStyle = STATUS_STYLES[zone.classification] || STATUS_STYLES.moderate
                    return (
                      <div
                        key={zone.zone_id}
                        className={`flex items-center justify-between p-2.5 rounded-lg border text-xs ${actionMeta.bg}`}
                      >
                        <div className="flex items-center gap-2">
                          <ActionIcon className={`w-3.5 h-3.5 ${actionMeta.color}`} />
                          <span className="font-mono font-semibold text-foreground">{zone.zone_id}</span>
                          <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${clsStyle.badge} border`}>
                            {zone.classification}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-muted-foreground font-mono">
                          {zone.ndvi !== null && <span>NDVI {zone.ndvi.toFixed(3)}</span>}
                          {zone.ndwi !== null && <span>NDWI {zone.ndwi.toFixed(3)}</span>}
                          {zone.ndre !== null && <span>NDRE {zone.ndre.toFixed(3)}</span>}
                          <TrendIcon trend={zone.change_trend} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

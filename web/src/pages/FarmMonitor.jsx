import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Satellite, Plus, Sparkles, Brain, CloudRain, Sun, CloudSun,
  Droplets, Thermometer, Wind, Leaf, AlertTriangle, TrendingUp,
  Activity, MapPin, Maximize2, ChevronRight, Trash2, Loader2,
  Megaphone, BarChart3, Clock, Zap, Eye
} from 'lucide-react'
import {
  getFarmer,
  updateFarmer,
  updateFarmCrops,
  subscribeSatelliteReport,
  getSatelliteHistory,
} from '../services/firebase'
import FarmBoundaryMap from '../components/FarmBoundaryMap'
import NDVIOverlay from '../components/NDVIOverlay'
import HealthReport from '../components/HealthReport'
import AIFarmAdvisor from '../components/AIFarmAdvisor'
import HealthPrediction from '../components/HealthPrediction'
import SurplusAnnounce from '../components/SurplusAnnounce'
import WeatherPanel from '../components/WeatherPanel'
import { fetchForecast } from '../services/weatherMY'

// Lovable UI components
import GlassCard from '../components/monitor/GlassCard'
import AnimatedCounter from '../components/monitor/AnimatedCounter'
import PulsingBadge from '../components/monitor/PulsingBadge'

export default function FarmMonitor() {
  const { t, i18n } = useTranslation()
  const [farmer, setFarmer] = useState(null)
  const [selectedFarmField, setSelectedFarmField] = useState(0)
  const [report, setReport] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddFarm, setShowAddFarm] = useState(false)
  const [newFarm, setNewFarm] = useState({ name: '', boundary: null, current_crops: [] })
  const [newCrop, setNewCrop] = useState({ crop: '', planted_date: '' })
  const [saving, setSaving] = useState(false)
  const [weather, setWeather] = useState(null)
  const [editCrop, setEditCrop] = useState({ crop: '', planted_date: '' })
  const [mapMode, setMapMode] = useState("ndvi")

  const farmerId = localStorage.getItem('agripulse-farmerId')
  const areaName = localStorage.getItem('agripulse-area')

  useEffect(() => {
    if (!farmerId) { setLoading(false); return }
    getFarmer(farmerId)
      .then((data) => {
        if (data?.farms) {
          data.farms = data.farms.map((f) => {
            try {
              if (f.boundary?.coordinates && typeof f.boundary.coordinates === 'string') {
                f.boundary = { ...f.boundary, coordinates: JSON.parse(f.boundary.coordinates) }
              }
            } catch (e) {
              console.error('Failed to parse boundary:', e)
              f.boundary = null
            }
            return f
          })
        }
        setFarmer(data)
        setLoading(false)
      })
      .catch((err) => { console.error('Load farmer error:', err); setLoading(false) })
  }, [farmerId])

  useEffect(() => {
    if (!farmerId || !farmer?.farms?.length) return
    const unsub = subscribeSatelliteReport(farmerId, selectedFarmField, (r) => {
      setReport(r)
    })
    getSatelliteHistory(farmerId, selectedFarmField)
      .then(setHistory)
      .catch((err) => console.error('History fetch error:', err))
    return unsub
  }, [farmerId, farmer, selectedFarmField])

  useEffect(() => {
    const area = areaName || farmer?.area_name
    if (!area) return
    fetchForecast(area)
      .then(setWeather)
      .catch((err) => console.error('Weather fetch error:', err))
  }, [areaName, farmer?.area_name])

  const handleAddFarm = async () => { /* ... (same as original, omitted for brevity, keeping actual logic) ... */
    if (!newFarm.name || !newFarm.boundary || saving) return
    setSaving(true)
    try {
      const existingFarmsForStorage = (farmer?.farms || []).map((f) => ({
        ...f,
        boundary: f.boundary ? {
          type: f.boundary.type || 'Polygon',
          coordinates: typeof f.boundary.coordinates === 'string'
            ? f.boundary.coordinates
            : JSON.stringify(f.boundary.coordinates),
          area_hectares: f.boundary.area_hectares || 0,
        } : null,
      }))
      const newFarmForStorage = {
        name: newFarm.name,
        boundary: {
          type: newFarm.boundary.type,
          coordinates: JSON.stringify(newFarm.boundary.coordinates),
          area_hectares: newFarm.boundary.area_hectares || 0,
        },
        area_hectares: newFarm.boundary.area_hectares || 0,
        current_crops: newFarm.current_crops,
      }
      const updatedFarms = [...existingFarmsForStorage, newFarmForStorage]
      await updateFarmer(farmerId, { farms: updatedFarms })
      setFarmer((prev) => ({ ...prev, farms: [...(prev?.farms || []), { ...newFarmForStorage, boundary: newFarm.boundary }] }))
      setShowAddFarm(false)
      setNewFarm({ name: '', boundary: null, current_crops: [] })
    } catch (err) {
      console.error(err)
      alert('Error saving farm')
    } finally {
      setSaving(false)
    }
  }

  const addCropToFarm = () => {
    if (!newCrop.crop) return
    setNewFarm((prev) => ({
      ...prev,
      current_crops: [...prev.current_crops, { ...newCrop, expected_harvest: '' }],
    }))
    setNewCrop({ crop: '', planted_date: '' })
  }

  const handleDeleteFarm = async (index) => {
    if (!farmerId || saving) return
    if (!confirm(t('farmMonitor.confirmDelete'))) return
    setSaving(true)
    try {
      const updatedFarms = (farmer?.farms || [])
        .filter((_, i) => i !== index)
        .map((f) => ({
          ...f,
          boundary: f.boundary ? {
            ...f.boundary,
            coordinates: typeof f.boundary.coordinates === 'string' ? f.boundary.coordinates : JSON.stringify(f.boundary.coordinates),
          } : null,
        }))
      await updateFarmer(farmerId, { farms: updatedFarms })
      setFarmer((prev) => ({ ...prev, farms: (prev?.farms || []).filter((_, i) => i !== index) }))
      if (selectedFarmField >= updatedFarms.length) setSelectedFarmField(Math.max(0, updatedFarms.length - 1))
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleAddCropToExistingFarm = async () => {
    if (!editCrop.crop || !farmerId || saving) return
    setSaving(true)
    try {
      const currentCrops = [...(currentFarm?.current_crops || []), { ...editCrop, expected_harvest: '' }]
      await updateFarmCrops(farmerId, selectedFarmField, currentCrops)
      setFarmer((prev) => {
        const f = [...(prev?.farms || [])]
        f[selectedFarmField] = { ...f[selectedFarmField], current_crops: currentCrops }
        return { ...prev, farms: f }
      })
      setEditCrop({ crop: '', planted_date: '' })
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveCropFromFarm = async (cropIndex) => {
    if (!farmerId || saving) return
    setSaving(true)
    try {
      const currentCrops = (currentFarm?.current_crops || []).filter((_, i) => i !== cropIndex)
      await updateFarmCrops(farmerId, selectedFarmField, currentCrops)
      setFarmer((prev) => {
        const f = [...(prev?.farms || [])]
        f[selectedFarmField] = { ...f[selectedFarmField], current_crops: currentCrops }
        return { ...prev, farms: f }
      })
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="farm-monitor-theme flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground text-sm font-medium">{t('common.loading')}</p>
      </div>
    )
  }

  const farms = farmer?.farms || []
  const currentFarm = farms[selectedFarmField]

  const healthScore = report?.health_score ?? 0
  const ndviAvg = report?.ndvi_average ?? 0

  return (
    <div className="farm-monitor-theme">
      <div className="min-h-screen px-4 py-6 md:px-8 lg:px-10 w-full space-y-8">
        
        {/* ===== HEADER ===== */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in-up">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center glow-primary">
                <Satellite className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-gradient">{t('farmMonitor.title')}</span>
            </h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              {t('farmMonitor.subtitle')}
            </p>
          </div>
          <button onClick={() => setShowAddFarm(true)} className="flex items-center gap-2 gradient-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold glow-primary hover:scale-105 transition-all duration-300">
            <Plus className="w-4 h-4" />
            {t('farmMonitor.addFarm')}
          </button>
        </div>

        {/* ===== FARM SELECTOR ===== */}
        <div className="flex gap-2 overflow-x-auto pb-1 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          {farms.map((farm, i) => (
            <div key={i} className="flex items-center group">
              <button
                onClick={() => setSelectedFarmField(i)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all duration-300 whitespace-nowrap rounded-l-xl ${
                  selectedFarmField === i
                    ? "gradient-primary text-primary-foreground glow-primary"
                    : "glass text-muted-foreground hover:text-foreground"
                }`}
              >
                <Satellite className="w-3.5 h-3.5" />
                {farm.name}
                {selectedFarmField === i && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => handleDeleteFarm(i)}
                className={`px-3 py-2.5 rounded-r-xl text-sm transition-all duration-300 ${
                  selectedFarmField === i
                    ? "bg-primary/60 text-primary-foreground hover:bg-destructive"
                    : "glass text-muted-foreground opacity-50 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10"
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {farms.length === 0 && !showAddFarm && (
          <GlassCard className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 glow-primary">
              <Satellite className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">{t('farmMonitor.noFarms')}</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">{t('farmMonitor.addFirst')}</p>
          </GlassCard>
        )}

        {/* Add Farm Form */}
        {showAddFarm && (
          <GlassCard className="space-y-4 glow-primary">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-foreground">
              <Plus className="w-5 h-5 text-primary" />
              {t('farmMonitor.addFarm')}
            </h3>

            <div>
              <label className="block text-sm font-medium mb-1 text-muted-foreground">{t('farmMonitor.farmName')}</label>
              <input
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-black/20 text-foreground focus:outline-none focus:border-primary transition-colors"
                value={newFarm.name}
                onChange={(e) => setNewFarm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={t('farmMonitor.farmNamePlaceholder')}
              />
            </div>

            <div className="rounded-xl overflow-hidden border border-border">
              <FarmBoundaryMap
                boundary={newFarm.boundary}
                onBoundaryChange={(b) => setNewFarm((prev) => ({ ...prev, boundary: b }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-muted-foreground">{t('farmMonitor.currentCrops')}</label>
              <div className="flex gap-2 mb-2">
                <input
                  className="flex-1 px-3 py-2 rounded-lg border border-border bg-black/20 text-foreground text-sm focus:outline-none focus:border-primary"
                  placeholder={t('demandIntel.crop')}
                  value={newCrop.crop}
                  onChange={(e) => setNewCrop((prev) => ({ ...prev, crop: e.target.value }))}
                />
                <input
                  type="date"
                  className="px-3 py-2 rounded-lg border border-border bg-black/20 text-foreground text-sm focus:outline-none focus:border-primary"
                  value={newCrop.planted_date}
                  onChange={(e) => setNewCrop((prev) => ({ ...prev, planted_date: e.target.value }))}
                />
                <button
                  onClick={addCropToFarm}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {newFarm.current_crops.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {newFarm.current_crops.map((c, i) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-primary/10 border border-primary/20 text-primary text-sm px-3 py-1 rounded-full font-medium">
                      {c.crop}
                      {c.planted_date && <span className="text-[10px] opacity-70">({c.planted_date})</span>}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleAddFarm}
                disabled={!newFarm.name || !newFarm.boundary || saving}
                className="flex items-center justify-center gap-2 gradient-primary text-primary-foreground px-6 py-2.5 rounded-xl font-medium hover:scale-[1.02] disabled:opacity-50 transition-all"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Satellite className="w-4 h-4" />}
                {saving ? t('common.loading') : t('common.save')}
              </button>
              <button
                onClick={() => { setShowAddFarm(false); setNewFarm({ name: '', boundary: null, current_crops: [] }) }}
                className="px-6 py-2.5 glass text-foreground rounded-xl font-medium hover:bg-white/5 transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </GlassCard>
        )}

        {currentFarm && !showAddFarm && (
          <>
            {/* ===== STATS BAR ===== */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: MapPin, label: t('farmMonitor.farmArea'), value: currentFarm.area_hectares, suffix: ` ${t('common.hectares')}`, decimals: 2, color: "text-primary" },
                { icon: Leaf, label: t('farmMonitor.activeCrops'), value: currentFarm.current_crops?.length || 0, suffix: ` ${t('farmMonitor.crops')}`, decimals: 0, color: "text-secondary" },
                { icon: Activity, label: t('farmMonitor.healthScore'), value: healthScore || null, suffix: "/100", decimals: 0, color: healthScore >= 75 ? "text-primary" : "text-yellow-400" },
                { icon: Clock, label: t('farmMonitor.lastScan'), value: null, suffix: "", textValue: report?.id || "—", color: "text-secondary" },
              ].map((stat, i) => (
                <GlassCard key={i} delay={200 + i * 80} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center ${stat.color}`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                      {stat.value !== null ? (
                        <p className="text-xl font-bold text-foreground">
                          <AnimatedCounter value={stat.value} decimals={stat.decimals} suffix={stat.suffix} />
                        </p>
                      ) : (
                        <p className="text-sm font-bold text-foreground mt-0.5">{stat.textValue || '—'}</p>
                      )}
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>

            {/* ===== SATELLITE MAP HERO ===== */}
            <GlassCard delay={500} hover={false} className="p-0 overflow-hidden relative group">
              <div className="relative h-[500px] md:h-[600px] xl:h-[700px] overflow-hidden bg-black/50">
                <NDVIOverlay
                  boundary={currentFarm.boundary}
                  ndviAverage={report?.ndvi_average}
                  ndviZones={report?.ndvi_zones}
                />
                
                {/* Scan line effect placed over map */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20 z-10 mix-blend-overlay">
                  <div className="w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan-line" />
                </div>
              </div>
            </GlassCard>

            {/* ===== HEALTH SCORE + CROP STATUS ===== */}
            <div className="grid lg:grid-cols-2 gap-6">
              <GlassCard delay={600} glow={healthScore >= 75 ? "primary" : undefined}>
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">{t('farmMonitor.healthScore')}</h3>
                  {healthScore > 0 && <PulsingBadge label="LIVE" color="primary" />}
                </div>
                <div className="flex items-center gap-8">
                  <div className="relative w-28 h-28">
                    <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="hsla(217,33%,100%,0.1)" strokeWidth="8" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke={healthScore >= 75 ? "hsl(142,71%,45%)" : "hsl(48,96%,53%)"} strokeWidth="8"
                        strokeDasharray={`${(healthScore || 0) * 2.51} 251`}
                        strokeLinecap="round"
                        className={healthScore >= 75 ? "drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]" : ""}
                        style={{ transition: "stroke-dasharray 1.5s ease-out" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-2xl font-bold ${healthScore >= 75 ? "text-primary" : healthScore >= 50 ? "text-yellow-400" : "text-muted-foreground"}`}>
                        <AnimatedCounter value={healthScore} />
                      </span>
                    </div>
                  </div>
                  <div className="space-y-4 flex-1">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">{t('farmMonitor.ndviAverage')}</p>
                      <p className="text-xl font-bold text-secondary">
                        {ndviAvg ? ndviAvg.toFixed(3) : '—'}
                      </p>
                    </div>
                    {history.length >= 2 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">{t('farmMonitor.trend')}</p>
                        <div className={`flex items-center gap-1 ${
                          history[0]?.health_score > history[1]?.health_score ? "text-primary" : 
                          history[0]?.health_score < history[1]?.health_score ? "text-red-400" : "text-yellow-400"
                        }`}>
                          <TrendingUp className={`w-4 h-4 ${history[0]?.health_score < history[1]?.health_score && "rotate-180"}`} />
                          <span className="text-sm font-semibold">
                            {history[0]?.health_score > history[1]?.health_score ? t('farmMonitor.improving') :
                             history[0]?.health_score < history[1]?.health_score ? t('farmMonitor.declining') : t('farmMonitor.stable')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </GlassCard>

              <GlassCard delay={700}>
                <div className="flex items-center gap-2 mb-4">
                  <Leaf className="w-5 h-5 text-secondary" />
                  <h3 className="font-semibold text-foreground">{t('farmMonitor.cropStatus')}</h3>
                </div>
                {/* Embedded actual logic for adding crops in the UI */}
                <div className="flex gap-2 mb-4">
                  <input
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-black/20 text-foreground text-sm focus:outline-none focus:border-primary"
                    placeholder={t('farmMonitor.newCropPlaceholder')}
                    value={editCrop.crop}
                    onChange={(e) => setEditCrop({ ...editCrop, crop: e.target.value })}
                  />
                  <input
                    type="date"
                    className="w-32 px-3 py-2 rounded-lg border border-border bg-black/20 text-foreground text-sm focus:outline-none focus:border-primary"
                    value={editCrop.planted_date}
                    onChange={(e) => setEditCrop({ ...editCrop, planted_date: e.target.value })}
                  />
                  <button onClick={handleAddCropToExistingFarm} disabled={saving} className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                
                {currentFarm.current_crops?.length > 0 ? (
                  <div className="space-y-2 max-h-[140px] overflow-y-auto pr-2 custom-scrollbar">
                    {currentFarm.current_crops.map((c, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50 hover:border-primary/30 transition-all duration-300">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                            <Leaf className="w-4 h-4 text-primary-foreground" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-foreground">{c.crop}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{t('farmMonitor.planted')}: {c.planted_date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-primary/10 text-primary tracking-wide uppercase">{t('farmMonitor.active')}</span>
                          <button onClick={() => handleRemoveCropFromFarm(i)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Leaf className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">{t('farmMonitor.noCrops')}</p>
                  </div>
                )}
              </GlassCard>
            </div>

            {/* ===== AI FARM ADVISOR / PREDICTION ===== */}
            <div className="grid lg:grid-cols-2 gap-6">
              <GlassCard delay={800} glow="secondary" className="p-0 overflow-hidden">
                <div className="p-6">
                  <AIFarmAdvisor
                    report={report}
                    weather={weather}
                    farm={currentFarm}
                    area={areaName || farmer?.area_name}
                    language={i18n.language}
                  />
                </div>
              </GlassCard>

              <GlassCard delay={850} className="p-0 overflow-hidden">
                <div className="p-6">
                   <HealthPrediction
                    report={report}
                    history={history}
                    weather={weather}
                    farm={currentFarm}
                    area={areaName || farmer?.area_name}
                    language={i18n.language}
                  />
                </div>
              </GlassCard>
            </div>

            {/* ===== DETAILED REPORT & SURPLUS ===== */}
            <div className="grid lg:grid-cols-2 gap-6">
              <GlassCard delay={900} className="p-0 overflow-hidden">
                <div className="p-6">
                  <HealthReport report={report} />
                </div>
              </GlassCard>

              <GlassCard delay={1000} glow="warning" className="border-orange-500/20 p-0 overflow-hidden">
                <div className="p-6 h-full flex flex-col justify-center">
                  <h3 className="font-bold text-lg text-orange-400 mb-2 flex items-center gap-2">
                    <Megaphone className="w-5 h-5" />
                    {t('surplus.title')}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">{t('farmMonitor.surplusDesc')}</p>
                  <SurplusAnnounce
                    farmerId={farmerId}
                    farm={currentFarm}
                    area={areaName || farmer?.area_name}
                  />
                </div>
              </GlassCard>
            </div>

            {/* ===== TIMELINE ===== */}
            <GlassCard delay={1200} hover={false}>
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">{t('farmMonitor.historicalScans')}</h3>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {history.map((h, i) => {
                  const score = h.health_score ?? 0;
                  const barColor = score >= 75 ? "hsl(142,71%,45%)" : score >= 50 ? "hsl(48,96%,53%)" : "hsl(0,84%,60%)";
                  const badgeClass = score >= 75
                    ? "text-primary bg-primary/10 border border-primary/20"
                    : score >= 50
                    ? "text-yellow-400 bg-yellow-400/10 border border-yellow-400/20"
                    : "text-red-400 bg-red-400/10 border border-red-400/20";
                  const dotClass = score >= 75 ? "bg-primary shadow-[0_0_6px_rgba(34,197,94,0.5)]" : score >= 50 ? "bg-yellow-400" : "bg-red-400";

                  return (
                    <div
                      key={i}
                      className="relative flex items-center justify-between p-4 rounded-xl bg-black/20 hover:bg-black/30 transition-all duration-300 overflow-hidden group border border-border"
                    >
                      <div
                        className="absolute inset-y-0 left-0 opacity-[0.15] transition-all duration-500 group-hover:opacity-25"
                        style={{ width: `${Math.max(score, 5)}%`, backgroundColor: barColor }}
                      />
                      <div className="relative flex items-center gap-4">
                        <div className={`w-2.5 h-2.5 rounded-full ${dotClass}`} />
                        <span className="text-sm font-semibold text-foreground">{h.id}</span>
                      </div>
                      <div className="relative flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground font-mono-stat text-xs">NDVI: {h.ndvi_average?.toFixed(3) ?? "—"}</span>
                        <span className={`font-bold px-2.5 py-1 rounded-lg text-xs tracking-wide ${badgeClass}`}>
                          {h.health_score ?? "—"}/100
                        </span>
                      </div>
                    </div>
                  );
                })}
                {history.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-6">{t('farmMonitor.noHistory')}</p>
                )}
              </div>
            </GlassCard>

          </>
        )}
      </div>
    </div>
  )
}

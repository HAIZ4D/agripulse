import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Satellite, Plus, Brain, CloudRain, Sun, CloudSun,
  Droplets, Thermometer, Wind, Leaf, AlertTriangle, TrendingUp,
  Activity, MapPin, ChevronRight, Trash2, Loader2,
  Megaphone, Clock, Map, Upload, Link2, FlaskConical,
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
import SatelliteIntelHub from '../components/SatelliteIntelHub'
import { fetchForecast } from '../services/weatherMY'

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
            } catch (e) { f.boundary = null }
            return f
          })
        }
        setFarmer(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [farmerId])

  useEffect(() => {
    if (!farmerId || !farmer?.farms?.length) return
    const unsub = subscribeSatelliteReport(farmerId, selectedFarmField, (r) => setReport(r))
    getSatelliteHistory(farmerId, selectedFarmField).then(setHistory).catch(() => {})
    return unsub
  }, [farmerId, farmer, selectedFarmField])

  useEffect(() => {
    const area = areaName || farmer?.area_name
    if (!area) return
    fetchForecast(area).then(setWeather).catch(() => {})
  }, [areaName, farmer?.area_name])

  const handleAddFarm = async () => {
    if (!newFarm.name || !newFarm.boundary || saving) return
    setSaving(true)
    try {
      const existingFarmsForStorage = (farmer?.farms || []).map((f) => ({
        ...f,
        boundary: f.boundary ? {
          type: f.boundary.type || 'Polygon',
          coordinates: typeof f.boundary.coordinates === 'string' ? f.boundary.coordinates : JSON.stringify(f.boundary.coordinates),
          area_hectares: f.boundary.area_hectares || 0,
        } : null,
      }))
      const newFarmForStorage = {
        name: newFarm.name,
        boundary: { type: newFarm.boundary.type, coordinates: JSON.stringify(newFarm.boundary.coordinates), area_hectares: newFarm.boundary.area_hectares || 0 },
        area_hectares: newFarm.boundary.area_hectares || 0,
        current_crops: newFarm.current_crops,
      }
      await updateFarmer(farmerId, { farms: [...existingFarmsForStorage, newFarmForStorage] })
      setFarmer((prev) => ({ ...prev, farms: [...(prev?.farms || []), { ...newFarmForStorage, boundary: newFarm.boundary }] }))
      setShowAddFarm(false)
      setNewFarm({ name: '', boundary: null, current_crops: [] })
    } catch (err) { alert('Error saving farm') }
    finally { setSaving(false) }
  }

  const addCropToFarm = () => {
    if (!newCrop.crop) return
    setNewFarm((prev) => ({ ...prev, current_crops: [...prev.current_crops, { ...newCrop, expected_harvest: '' }] }))
    setNewCrop({ crop: '', planted_date: '' })
  }

  const handleDeleteFarm = async (index) => {
    if (!farmerId || saving) return
    if (!confirm(t('farmMonitor.confirmDelete'))) return
    setSaving(true)
    try {
      const updatedFarms = (farmer?.farms || []).filter((_, i) => i !== index).map((f) => ({
        ...f, boundary: f.boundary ? { ...f.boundary, coordinates: typeof f.boundary.coordinates === 'string' ? f.boundary.coordinates : JSON.stringify(f.boundary.coordinates) } : null,
      }))
      await updateFarmer(farmerId, { farms: updatedFarms })
      setFarmer((prev) => ({ ...prev, farms: (prev?.farms || []).filter((_, i) => i !== index) }))
      if (selectedFarmField >= updatedFarms.length) setSelectedFarmField(Math.max(0, updatedFarms.length - 1))
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  const handleAddCropToExistingFarm = async () => {
    if (!editCrop.crop || !farmerId || saving) return
    setSaving(true)
    try {
      const currentCrops = [...(currentFarm?.current_crops || []), { ...editCrop, expected_harvest: '' }]
      await updateFarmCrops(farmerId, selectedFarmField, currentCrops)
      setFarmer((prev) => { const f = [...(prev?.farms || [])]; f[selectedFarmField] = { ...f[selectedFarmField], current_crops: currentCrops }; return { ...prev, farms: f } })
      setEditCrop({ crop: '', planted_date: '' })
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  const handleRemoveCropFromFarm = async (cropIndex) => {
    if (!farmerId || saving) return
    setSaving(true)
    try {
      const currentCrops = (currentFarm?.current_crops || []).filter((_, i) => i !== cropIndex)
      await updateFarmCrops(farmerId, selectedFarmField, currentCrops)
      setFarmer((prev) => { const f = [...(prev?.farms || [])]; f[selectedFarmField] = { ...f[selectedFarmField], current_crops: currentCrops }; return { ...prev, farms: f } })
    } catch (err) { console.error(err) }
    finally { setSaving(false) }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      </div>
    )
  }

  const farms = farmer?.farms || []
  const currentFarm = farms[selectedFarmField]
  const healthScore = report?.health_score ?? null
  const ndviAvg = report?.ndvi_average ?? null

  return (
    <div className="min-h-screen">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
              {t('farmMonitor.title')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{t('farmMonitor.subtitle')}</p>
          </div>
          <button
            onClick={() => setShowAddFarm(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
          >
            <Satellite className="w-4 h-4" />
            {t('farmMonitor.addFarm')}
          </button>
        </div>

        {/* Farm Selector */}
        {farms.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {farms.map((farm, i) => (
              <div key={i} className="flex items-center group">
                <button
                  onClick={() => setSelectedFarmField(i)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all whitespace-nowrap rounded-l-xl ${
                    selectedFarmField === i
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                      : 'bg-card border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/30'
                  }`}
                >
                  <Satellite className="w-3.5 h-3.5" />
                  {farm.name}
                </button>
                <button
                  onClick={() => handleDeleteFarm(i)}
                  className={`px-3 py-2.5 rounded-r-xl text-sm transition-all ${
                    selectedFarmField === i
                      ? 'bg-primary/70 text-primary-foreground hover:bg-destructive'
                      : 'bg-card border border-l-0 border-border/50 text-muted-foreground/50 group-hover:text-destructive hover:bg-destructive/10'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {farms.length === 0 && !showAddFarm && (
          <div className="dashboard-card text-center py-16">
            <div className="w-20 h-20 rounded-2xl bg-muted/30 border border-border/40 flex items-center justify-center mx-auto mb-6">
              <Satellite className="w-10 h-10 text-primary/40" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-3">{t('farmMonitor.noFarms')}</h3>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto mb-8 leading-relaxed">
              {t('farmMonitor.emptyDescription')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
              {[
                { icon: Map, title: t('farmMonitor.featureDrawBoundaries'), desc: t('farmMonitor.featureDrawDesc') },
                { icon: Upload, title: t('farmMonitor.featureUploadGeoJSON'), desc: t('farmMonitor.featureUploadDesc') },
                { icon: Link2, title: t('farmMonitor.featureConnectedApps'), desc: t('farmMonitor.featureConnectedDesc') },
              ].map((feature, i) => (
                <div key={i} className="p-5 rounded-xl bg-muted/20 border border-border/40 hover:border-primary/30 transition-colors text-center">
                  <feature.icon className="w-6 h-6 text-primary/60 mx-auto mb-3" />
                  <h4 className="text-sm font-bold text-foreground mb-1">{feature.title}</h4>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Farm Form */}
        {showAddFarm && (
          <div className="dashboard-card p-6 space-y-4">
            <h3 className="font-bold text-lg flex items-center gap-2 text-foreground">
              <Plus className="w-5 h-5 text-primary" />
              {t('farmMonitor.addFarm')}
            </h3>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-muted-foreground">{t('farmMonitor.farmName')}</label>
              <input
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/20 text-foreground focus:outline-none focus:border-primary/50 transition-colors"
                value={newFarm.name}
                onChange={(e) => setNewFarm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={t('farmMonitor.farmNamePlaceholder')}
              />
            </div>
            <div className="rounded-xl overflow-hidden border border-border">
              <FarmBoundaryMap boundary={newFarm.boundary} onBoundaryChange={(b) => setNewFarm((prev) => ({ ...prev, boundary: b }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-muted-foreground">{t('farmMonitor.currentCrops')}</label>
              <div className="flex gap-2 mb-2">
                <input className="flex-1 px-3 py-2 rounded-lg border border-border bg-muted/20 text-foreground text-sm focus:outline-none focus:border-primary/50" placeholder={t('demandIntel.crop')} value={newCrop.crop} onChange={(e) => setNewCrop((prev) => ({ ...prev, crop: e.target.value }))} />
                <input type="date" className="px-3 py-2 rounded-lg border border-border bg-muted/20 text-foreground text-sm focus:outline-none focus:border-primary/50" value={newCrop.planted_date} onChange={(e) => setNewCrop((prev) => ({ ...prev, planted_date: e.target.value }))} />
                <button onClick={addCropToFarm} className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors"><Plus className="w-4 h-4" /></button>
              </div>
              {newFarm.current_crops.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {newFarm.current_crops.map((c, i) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-primary/10 border border-primary/20 text-primary text-sm px-3 py-1 rounded-full font-medium">
                      {c.crop} {c.planted_date && <span className="text-[10px] opacity-70">({c.planted_date})</span>}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handleAddFarm} disabled={!newFarm.name || !newFarm.boundary || saving} className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Satellite className="w-4 h-4" />}
                {saving ? t('common.loading') : t('common.save')}
              </button>
              <button onClick={() => { setShowAddFarm(false); setNewFarm({ name: '', boundary: null, current_crops: [] }) }} className="px-6 py-2.5 bg-muted/30 border border-border/50 text-foreground rounded-xl font-medium hover:bg-muted/50 transition-colors">
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}

        {/* Farm Content */}
        {currentFarm && !showAddFarm && (
          <>
            {/* Stats Bar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: MapPin, label: t('farmMonitor.farmArea'), value: `${(currentFarm.area_hectares || 0).toFixed(2)} ${t('common.hectares')}` },
                { icon: Leaf, label: t('farmMonitor.activeCrops'), value: `${currentFarm.current_crops?.length || 0} ${t('farmMonitor.crops')}` },
                { icon: Activity, label: t('farmMonitor.healthScore'), value: healthScore ? `${healthScore}/100` : '—' },
                { icon: Clock, label: t('farmMonitor.lastScan'), value: report?.id || '—' },
              ].map((stat, i) => (
                <div key={i} className="stat-card">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <stat.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{stat.label}</p>
                      <p className="text-lg font-bold text-foreground">{stat.value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Satellite Map with index switcher + zone visualization */}
            <div className="dashboard-card p-0 overflow-hidden">
              <div className="relative h-[500px] md:h-[600px] bg-black/30">
                <NDVIOverlay boundary={currentFarm.boundary} report={report} />
              </div>
            </div>

            {/* Satellite Intelligence Hub — multi-index + zones + insights */}
            <SatelliteIntelHub
              report={report}
              boundary={currentFarm.boundary}
              farmerId={farmerId}
              farmIndex={selectedFarmField}
              farm={currentFarm}
            />

            {/* Health Score + Crop Status */}
            <div className="grid lg:grid-cols-2 gap-5">
              <div className="dashboard-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-foreground">{t('farmMonitor.healthScore')}</h3>
                </div>
                <div className="flex items-center gap-6">
                  {/* Circular gauge */}
                  <div className="relative w-28 h-28 shrink-0">
                    <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(155,14%,14%)" strokeWidth="8" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke={healthScore >= 75 ? 'hsl(142,71%,45%)' : 'hsl(48,96%,53%)'} strokeWidth="8" strokeDasharray={`${(healthScore || 0) * 2.51} 251`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 1.5s ease-out' }} />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-2xl font-bold ${healthScore >= 75 ? 'text-primary' : healthScore >= 50 ? 'text-yellow-400' : 'text-muted-foreground'}`}>{healthScore || '—'}</span>
                    </div>
                  </div>
                  {/* Multi-index stats */}
                  <div className="space-y-2.5 flex-1">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {[
                        { label: 'NDVI', value: ndviAvg, icon: Leaf, color: 'text-green-400' },
                        { label: 'NDWI', value: report?.ndwi_average ?? null, icon: Droplets, color: 'text-blue-400' },
                        { label: 'NDRE', value: report?.ndre_average ?? null, icon: FlaskConical, color: 'text-amber-400' },
                      ].map(({ label, value, icon: Icon, color }) => (
                        <div key={label} className="p-2 rounded-lg bg-muted/20 border border-border/30 text-center">
                          <div className="flex items-center justify-center gap-1 mb-0.5">
                            <Icon className={`w-3 h-3 ${color}`} />
                            <span className="font-bold" style={{fontSize:'9px'}}>{label}</span>
                          </div>
                          <p className={`text-sm font-extrabold ${color}`}>
                            {value !== null && value !== undefined ? value.toFixed(3) : '—'}
                          </p>
                        </div>
                      ))}
                    </div>
                    {history.length >= 2 && (
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">{t('farmMonitor.trend')}</p>
                        <span className={`text-sm font-semibold ${history[0]?.health_score > history[1]?.health_score ? 'text-primary' : history[0]?.health_score < history[1]?.health_score ? 'text-red-400' : 'text-yellow-400'}`}>
                          {history[0]?.health_score > history[1]?.health_score ? t('farmMonitor.improving') : history[0]?.health_score < history[1]?.health_score ? t('farmMonitor.declining') : t('farmMonitor.stable')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="dashboard-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Leaf className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-foreground">{t('farmMonitor.cropStatus')}</h3>
                </div>
                <div className="flex gap-2 mb-3">
                  <input className="flex-1 px-3 py-2 rounded-lg border border-border bg-muted/20 text-foreground text-sm focus:outline-none focus:border-primary/50" placeholder={t('farmMonitor.newCropPlaceholder')} value={editCrop.crop} onChange={(e) => setEditCrop({ ...editCrop, crop: e.target.value })} />
                  <input type="date" className="w-32 px-3 py-2 rounded-lg border border-border bg-muted/20 text-foreground text-sm focus:outline-none focus:border-primary/50" value={editCrop.planted_date} onChange={(e) => setEditCrop({ ...editCrop, planted_date: e.target.value })} />
                  <button onClick={handleAddCropToExistingFarm} disabled={saving} className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"><Plus className="w-4 h-4" /></button>
                </div>
                {currentFarm.current_crops?.length > 0 ? (
                  <div className="space-y-2 max-h-[140px] overflow-y-auto">
                    {currentFarm.current_crops.map((c, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/30">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><Leaf className="w-4 h-4 text-primary" /></div>
                          <div>
                            <p className="font-semibold text-sm text-foreground">{c.crop}</p>
                            <p className="text-xs text-muted-foreground">{t('farmMonitor.planted')}: {c.planted_date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary/10 text-primary uppercase">{t('farmMonitor.active')}</span>
                          <button onClick={() => handleRemoveCropFromFarm(i)} className="p-1.5 text-muted-foreground hover:text-destructive rounded-md transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6"><p className="text-sm text-muted-foreground">{t('farmMonitor.noCrops')}</p></div>
                )}
              </div>
            </div>

            {/* AI Advisor + Prediction */}
            <div className="grid lg:grid-cols-2 gap-5">
              <div className="dashboard-card p-5">
                <AIFarmAdvisor
                  report={report}
                  weather={weather}
                  farm={currentFarm}
                  area={areaName || farmer?.area_name}
                  language={i18n.language}
                  zoneStats={report?.zone_stats ?? null}
                  changeDetection={report?.change_detection ?? null}
                  criticalZones={(report?.zones || []).filter((z) => z.classification === 'critical')}
                  ndreAverage={report?.ndre_average ?? null}
                  ndwiAverage={report?.ndwi_average ?? null}
                />
              </div>
              <div className="dashboard-card p-5">
                <HealthPrediction report={report} history={history} weather={weather} farm={currentFarm} area={areaName || farmer?.area_name} language={i18n.language} />
              </div>
            </div>

            {/* Report + Surplus */}
            <div className="grid lg:grid-cols-2 gap-5">
              <div className="dashboard-card p-5">
                <HealthReport report={report} />
              </div>
              <div className="dashboard-card p-5">
                <h3 className="font-bold text-lg text-foreground mb-2 flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-amber-400" />
                  {t('surplus.title')}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">{t('farmMonitor.surplusDesc')}</p>
                <SurplusAnnounce farmerId={farmerId} farm={currentFarm} area={areaName || farmer?.area_name} />
              </div>
            </div>

            {/* Timeline */}
            <div className="dashboard-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-foreground">{t('farmMonitor.historicalScans')}</h3>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {history.map((h, i) => {
                  const score = h.health_score ?? 0
                  const barColor = score >= 75 ? 'hsl(142,71%,45%)' : score >= 50 ? 'hsl(48,96%,53%)' : 'hsl(0,84%,60%)'
                  const trend = h.change_detection?.overall_trend
                  const trendEl = trend === 'improving'
                    ? <span className="text-green-400 text-[10px] font-bold">↑</span>
                    : trend === 'declining'
                    ? <span className="text-red-400 text-[10px] font-bold">↓</span>
                    : null
                  const zs = h.zone_stats
                  return (
                    <div key={i} className="relative flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/30 overflow-hidden group hover:bg-muted/30 transition-colors">
                      <div className="absolute inset-y-0 left-0 opacity-10" style={{ width: `${Math.max(score, 5)}%`, backgroundColor: barColor }} />
                      <div className="relative flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${score >= 75 ? 'bg-primary' : score >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`} />
                        <span className="text-sm font-semibold text-foreground">{h.id}</span>
                        {trendEl}
                      </div>
                      <div className="relative flex items-center gap-3 text-xs">
                        <span className="text-muted-foreground font-mono hidden sm:inline">NDVI {h.ndvi_average?.toFixed(3) ?? '—'}</span>
                        {h.ndwi_average != null && <span className="text-blue-400 font-mono hidden md:inline">NDWI {h.ndwi_average.toFixed(3)}</span>}
                        {h.ndre_average != null && <span className="text-amber-400 font-mono hidden lg:inline">NDRE {h.ndre_average.toFixed(3)}</span>}
                        {zs && <span className="text-muted-foreground/60 hidden xl:inline">{zs.total_zones}z {zs.critical_count > 0 ? `· ${zs.critical_count} crit` : ''}</span>}
                        <span className={`font-bold px-2 py-0.5 rounded-md ${score >= 75 ? 'bg-primary/10 text-primary' : score >= 50 ? 'bg-yellow-400/10 text-yellow-400' : 'bg-red-400/10 text-red-400'}`}>
                          {score}/100
                        </span>
                      </div>
                    </div>
                  )
                })}
                {history.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">{t('farmMonitor.noHistory')}</p>}
              </div>
            </div>
          </>
        )}

        <div className="h-4" />
      </div>
    </div>
  )
}

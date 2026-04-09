import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar, Download, Loader2, CloudRain, Sun, Zap, DollarSign } from 'lucide-react'
import {
  subscribeDemandAggregates,
  subscribePlantingPlan,
  removeFromPlan,
  updatePlanStatus,
} from '../services/firebase'
import { fetchForecast } from '../services/weatherMY'
import { getDistrict } from '../lib/utils'

import DemoMarketPulse from '../components/demand/DemoMarketPulse'
import DemoDemandChart from '../components/demand/DemoDemandChart'
import DemoDemandDonut from '../components/demand/DemoDemandDonut'
import DemoHeatmapCard from '../components/demand/DemoHeatmapCard'
import CropProfitability from '../components/demand/CropProfitability'
import PlantingPlan from '../components/PlantingPlan'
import DemandForecast from '../components/DemandForecast'

export default function DemandIntel() {
  const { t, i18n } = useTranslation()
  const [demands, setDemands] = useState([])
  const [plantingPlan, setPlantingPlan] = useState([])
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  const farmerId = localStorage.getItem('agripulse-farmerId')
  const areaRaw = localStorage.getItem('agripulse-area')
  const areaName = getDistrict(areaRaw)

  function showToast(message, type = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 2500)
  }

  useEffect(() => {
    if (!areaName) { setLoading(false); return }
    setLoading(true)
    let loaded = 0
    const total = farmerId ? 2 : 1
    const checkDone = () => { if (++loaded >= total) setLoading(false) }

    const unsubDemand = subscribeDemandAggregates(areaName, (data) => {
      setDemands(data)
      checkDone()
    })

    let unsubPlan = () => {}
    if (farmerId) {
      unsubPlan = subscribePlantingPlan(farmerId, (data) => {
        setPlantingPlan(data)
        checkDone()
      })
    } else {
      checkDone()
    }

    fetchForecast(areaName)
      .then((data) => setWeather(data))
      .catch((err) => console.error('Weather fetch error:', err))

    const timeout = setTimeout(() => setLoading(false), 3000)
    return () => { unsubDemand(); unsubPlan(); clearTimeout(timeout) }
  }, [areaName, farmerId])

  async function handleRemove(cropName) {
    if (!farmerId) return
    try {
      await removeFromPlan(farmerId, cropName)
      showToast(t('demandIntel.removedFromPlan'))
    } catch (err) { console.error('Remove error:', err) }
  }

  async function handleStatusChange(cropName, newStatus) {
    if (!farmerId) return
    try { await updatePlanStatus(farmerId, cropName, newStatus) }
    catch (err) { console.error('Status change error:', err) }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-card border border-border/40 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
        <div className="text-center">
          <p className="text-foreground font-semibold text-sm">{t('demandIntel.loadingIntel')}</p>
          <p className="text-muted-foreground text-xs mt-1">{t('demandIntel.analyzingRealtime')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-medium border ${
          toast.type === 'error'
            ? 'bg-destructive/90 text-destructive-foreground border-destructive/40'
            : 'bg-primary/90 text-primary-foreground border-primary/40'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
              {t('demandIntel.title')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('demandIntel.realtimeInsights')}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/40 border border-border/50 text-sm font-medium text-foreground hover:bg-muted/60 transition-colors">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              {t('demandIntel.thisWeek')}
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
              <Download className="w-4 h-4" />
              {t('demandIntel.exportReport')}
            </button>
          </div>
        </div>

        {/* Market Pulse Stats */}
        <DemoMarketPulse demands={demands} />

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3 dashboard-card p-5">
            <div className="mb-4">
              <h3 className="text-base font-bold text-foreground">{t('demandIntel.demandComparison')}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{t('demandIntel.topCropsByVolume')}</p>
            </div>
            <DemoDemandChart demands={demands} />
          </div>
          <div className="lg:col-span-2 dashboard-card p-5">
            <div className="mb-4">
              <h3 className="text-base font-bold text-foreground">{t('demandIntel.distribution')}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{t('demandIntel.marketSegment')}</p>
            </div>
            <DemoDemandDonut demands={demands} />
          </div>
        </div>

        {/* Heatmap + Weather row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Heatmap */}
          <div className="dashboard-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-foreground">{t('demandIntel.demandHeatmap')}</h3>
              <button className="text-xs text-primary font-semibold hover:text-primary/80 transition-colors">
                {t('demandIntel.viewMapView')}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {demands.length > 0 ? demands.slice(0, 4).map((d) => (
                <DemoHeatmapCard key={d.crop} demand={d} />
              )) : <p className="text-sm text-muted-foreground col-span-2">{t('demandIntel.waitingDemand')}</p>}
            </div>
          </div>

          {/* Weather Insights */}
          <div className="dashboard-card p-5">
            <h3 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
              <CloudRain className="w-4 h-4 text-muted-foreground" />
              {t('demandIntel.weatherInsights')}
            </h3>
            <div className="space-y-3">
              {/* Rain card */}
              <div className="p-4 rounded-xl bg-muted/20 border border-border/30">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CloudRain className="w-4 h-4 text-primary" />
                  </span>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{t('demandIntel.rainExpected')}</p>
                    <p className="text-[11px] text-primary font-semibold">{t('demandIntel.demandRise20')}</p>
                  </div>
                </div>
                <p className="text-muted-foreground text-xs mb-2">{t('demandIntel.leafyGreensRain')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {['Kangkung', 'Bayam', 'Sawi'].map((c) => (
                    <span key={c} className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-semibold">{c}</span>
                  ))}
                </div>
              </div>
              {/* Hot card */}
              <div className="p-4 rounded-xl bg-muted/20 border border-border/30">
                <div className="flex items-center gap-3 mb-2">
                  <span className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Sun className="w-4 h-4 text-amber-400" />
                  </span>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{t('demandIntel.hotWeatherAhead')}</p>
                    <p className="text-[11px] text-amber-400 font-semibold">{t('demandIntel.demandRise15')}</p>
                  </div>
                </div>
                <p className="text-muted-foreground text-xs mb-2">{t('demandIntel.coolingVegetables')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {['Timun', 'Tembikai'].map((c) => (
                    <span key={c} className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 text-[11px] font-semibold">{c}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Forecast */}
        <div className="dashboard-card p-5">
          <div className="mb-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              {t('demandIntel.aiForecast')}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">{t('demandIntel.predictDemand')}</p>
          </div>
          <DemandForecast
            demands={demands}
            weather={weather}
            area={areaName}
            language={i18n.language}
          />
        </div>

        {/* Crop Profitability */}
        <div className="dashboard-card p-5">
          <div className="mb-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              {t('demandIntel.profitComparison')}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">{t('demandIntel.profitSubtitle')}</p>
          </div>
          <CropProfitability demands={demands} />
        </div>

        {/* Planting Plan */}
        <div className="dashboard-card p-5">
          <PlantingPlan
            plan={plantingPlan}
            onRemove={handleRemove}
            onStatusChange={handleStatusChange}
          />
        </div>

        <div className="h-4" />
      </div>
    </div>
  )
}

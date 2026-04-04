import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { BarChart3, Loader2, TrendingUp, Sparkles, CloudRain, Sun, Zap, Activity, DollarSign } from 'lucide-react'
import {
  subscribeDemandAggregates,
  subscribePlantingPlan,
  removeFromPlan,
  updatePlanStatus,
} from '../services/firebase'
import { fetchForecast } from '../services/weatherMY'
import { getDistrict } from '../lib/utils'

import { Section, SectionHeading } from '../components/demand/Section'
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
    if (!areaName) {
      setLoading(false)
      return
    }

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

    // Fetch weather
    fetchForecast(areaName)
      .then((data) => setWeather(data))
      .catch((err) => console.error('Weather fetch error:', err))

    const timeout = setTimeout(() => setLoading(false), 3000)

    return () => {
      unsubDemand()
      unsubPlan()
      clearTimeout(timeout)
    }
  }, [areaName, farmerId])

  async function handleRemove(cropName) {
    if (!farmerId) return
    try {
      await removeFromPlan(farmerId, cropName)
      showToast(t('demandIntel.removedFromPlan'))
    } catch (err) {
      console.error('Remove error:', err)
    }
  }

  async function handleStatusChange(cropName, newStatus) {
    if (!farmerId) return
    try {
      await updatePlanStatus(farmerId, cropName, newStatus)
    } catch (err) {
      console.error('Status change error:', err)
    }
  }

  if (loading) {
    return (
      <div className="demand-intel-theme min-h-screen bg-background flex flex-col items-center justify-center gap-5">
        {/* Ambient bg */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/[0.06] blur-[120px]" />
        </div>
        <div className="relative z-10 flex flex-col items-center gap-5">
          <div className="relative">
            <div className="absolute inset-[-12px] rounded-full bg-primary/8 animate-ping" style={{ animationDuration: '2s' }} />
            <div className="absolute inset-[-24px] rounded-full bg-primary/4 animate-pulse" />
            <div className="w-16 h-16 rounded-2xl bg-card border border-primary/20 flex items-center justify-center" style={{ boxShadow: 'var(--glow-primary)' }}>
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-foreground font-semibold">Loading intelligence…</p>
            <p className="text-muted-foreground text-xs mt-1.5">Analyzing market data in real-time</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="demand-intel-theme min-h-screen bg-background relative">
      {/* Ambient floating orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[8%] left-[12%] w-[500px] h-[500px] rounded-full bg-primary/[0.035] blur-[120px] animate-orb-1" />
        <div className="absolute bottom-[15%] right-[8%] w-[400px] h-[400px] rounded-full bg-primary/[0.025] blur-[100px] animate-orb-2" />
        <div className="absolute top-[55%] left-[45%] w-[350px] h-[350px] rounded-full bg-secondary/[0.015] blur-[100px] animate-orb-1" style={{ animationDelay: '-10s' }} />
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-medium animate-slide-in-right backdrop-blur-xl border ${
            toast.type === 'error'
              ? 'bg-destructive/80 text-destructive-foreground border-destructive/40'
              : 'bg-primary/80 text-primary-foreground border-primary/40'
          }`}
          style={{ boxShadow: toast.type === 'error' ? '0 0 30px hsl(0,65%,45%,0.3)' : 'var(--glow-primary)' }}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <header className="border-b border-border/30 bg-background/60 backdrop-blur-2xl sticky top-0 z-40 relative">
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
        <div className="w-full px-3 lg:px-8 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center" style={{ boxShadow: '0 0 20px hsl(152,60%,42%,0.25)' }}>
                <BarChart3 className="w-6 h-6 text-primary-foreground" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gradient">{t('demandIntel.title')}</h1>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                Real-time market insights
                <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                <span className="font-semibold text-foreground/60">{areaName || 'Kuala Lumpur'}</span>
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-muted/30 border border-border/40 text-xs text-muted-foreground">
              <Activity className="w-3.5 h-3.5 text-primary/60" />
              <span>Last sync: <span className="text-foreground/70 font-medium">Just now</span></span>
            </div>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/8 border border-primary/15 text-primary text-xs font-bold tracking-wide">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary glow-dot" />
              </span>
              LIVE
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-4 lg:px-8 py-10 space-y-8 relative z-10">

        {/* Market Pulse */}
        <section className="animate-fade-up">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-bold text-foreground/80 uppercase tracking-widest">Overview</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Key metrics at a glance</p>
            </div>
          </div>
          <DemoMarketPulse demands={demands} />
        </section>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <Section delay={1} className="lg:col-span-3">
            <SectionHeading icon={BarChart3}>Demand Comparison</SectionHeading>
            <DemoDemandChart demands={demands} />
          </Section>

          <Section delay={2} className="lg:col-span-2">
            <SectionHeading icon={Sparkles}>Distribution</SectionHeading>
            <DemoDemandDonut demands={demands} />
          </Section>
        </div>

        {/* Heatmap */}
        <Section delay={2}>
          <SectionHeading icon={TrendingUp} subtitle="Live demand intensity across crops">
            Demand Heatmap
          </SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {demands.length > 0 ? demands.slice(0, 4).map((d) => (
              <DemoHeatmapCard key={d.crop} demand={d} />
            )) : <p className="text-sm text-muted-foreground">Waiting for demand data...</p>}
          </div>
        </Section>

        {/* Weather Insights */}
        <Section delay={3}>
          <SectionHeading icon={CloudRain} subtitle="Weather impact on crop demand">
            Weather Insights
          </SectionHeading>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Rain */}
            <div className="group rounded-xl overflow-hidden relative border border-primary/12 transition-all duration-500 hover:border-primary/25 hover:shadow-[0_0_25px_hsl(152,60%,42%,0.08)]" style={{ background: 'linear-gradient(145deg, hsl(152, 32%, 13%) 0%, hsl(152, 28%, 9%) 100%)' }}>
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="p-5 relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-9 h-9 rounded-xl bg-primary/12 border border-primary/15 flex items-center justify-center">
                    <CloudRain className="w-4.5 h-4.5 text-primary" />
                  </span>
                  <div>
                    <p className="font-bold text-foreground text-[13px]">Rain expected</p>
                    <p className="text-[11px] text-primary font-bold mt-0.5">↑ 20-30% demand</p>
                  </div>
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed mb-3">
                  Leafy greens demand rises during rainy periods.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {['Kangkung', 'Bayam', 'Sawi'].map((c) => (
                    <span key={c} className="px-2.5 py-1 rounded-lg bg-primary/8 border border-primary/12 text-primary text-[11px] font-semibold">{c}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Hot */}
            <div className="group rounded-xl overflow-hidden relative border border-secondary/12 transition-all duration-500 hover:border-secondary/25 hover:shadow-[0_0_25px_hsl(46,70%,52%,0.08)]" style={{ background: 'linear-gradient(145deg, hsl(40, 22%, 12%) 0%, hsl(35, 18%, 8%) 100%)' }}>
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-secondary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="p-5 relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-9 h-9 rounded-xl bg-secondary/12 border border-secondary/15 flex items-center justify-center">
                    <Sun className="w-4.5 h-4.5 text-secondary" />
                  </span>
                  <div>
                    <p className="font-bold text-foreground text-[13px]">Hot weather ahead</p>
                    <p className="text-[11px] text-secondary font-bold mt-0.5">↑ 15% demand</p>
                  </div>
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed mb-3">
                  Cooling vegetables demand rises. Good for cucumber.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {['Timun', 'Tembikai'].map((c) => (
                    <span key={c} className="px-2.5 py-1 rounded-lg bg-secondary/8 border border-secondary/12 text-secondary text-[11px] font-semibold">{c}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />

        {/* AI Forecast */}
        <Section delay={3}>
          <SectionHeading icon={Zap} subtitle="Predict demand trends for the next 2 weeks">
            AI Forecast
          </SectionHeading>
          <div className="mt-[-1rem]">
            <DemandForecast
              demands={demands}
              weather={weather}
              area={areaName}
              language={i18n.language}
            />
          </div>
        </Section>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />

        {/* Crop Profitability */}
        <Section delay={4}>
          <SectionHeading icon={DollarSign} subtitle="Revenue vs cost analysis per hectare">
            Crop Profitability
          </SectionHeading>
          <CropProfitability demands={demands} />
        </Section>

        {/* My Planting Plan */}
        <div className="animate-fade-up-delay-4 glow-card p-6 rounded-2xl border border-primary/20 bg-background/50 backdrop-blur-xl">
           <PlantingPlan
            plan={plantingPlan}
            onRemove={handleRemove}
            onStatusChange={handleStatusChange}
          />
        </div>

        {/* Footer spacer */}
        <div className="h-4" />
      </main>
    </div>
  )
}

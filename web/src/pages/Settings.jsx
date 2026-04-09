import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Globe, Leaf, Info, Sprout, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getFarmer } from '../services/firebase'
import LanguageSwitcher from '../components/LanguageSwitcher'

export default function Settings() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [farmer, setFarmer] = useState(null)

  const farmerId = localStorage.getItem('agripulse-farmerId')

  useEffect(() => {
    if (farmerId) { getFarmer(farmerId).then(setFarmer) }
  }, [farmerId])

  return (
    <div className="min-h-screen">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
            {t('settings.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t('settings.configureDesc')}</p>
        </div>

        {/* Language + About row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Language */}
          <div className="dashboard-card p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">{t('settings.language')}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('settings.languageDesc')}</p>
                </div>
              </div>
              <LanguageSwitcher />
            </div>
          </div>

          {/* About */}
          <div className="dashboard-card p-6">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-11 h-11 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <Info className="w-5 h-5 text-violet-400" />
              </div>
              <h3 className="font-bold text-foreground">{t('settings.about')}</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-5">
              {t('settings.aboutDesc')}
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">{t('settings.systemVersion')}</span>
                <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">v1.0.0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">{t('settings.engineStatus')}</span>
                <span className="flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Manage Farms */}
        <div className="dashboard-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sprout className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">{t('settings.farms')}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {farmer?.farms?.length || 0} {t('farmMonitor.registered')}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/farm')}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              {t('farmMonitor.manageFarms')}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {farmer?.farms?.length > 0 ? (
            <div className="space-y-2">
              {farmer.farms.map((farm, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/30 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Leaf className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{farm.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {farm.area_hectares} {t('common.hectares')} — {farm.current_crops?.length || 0} {t('farmMonitor.crops')}
                      </p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-primary/10 text-primary uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {t('farmMonitor.active')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <Leaf className="w-8 h-8 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">{t('farmMonitor.noFarms')}</p>
              <button
                onClick={() => navigate('/farm')}
                className="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
              >
                {t('farmMonitor.addFarm')}
              </button>
            </div>
          )}
        </div>

        <div className="h-4" />
      </div>
    </div>
  )
}

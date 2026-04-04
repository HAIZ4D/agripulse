import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Settings as SettingsIcon, Globe, Leaf, Info } from 'lucide-react'
import { getFarmer } from '../services/firebase'
import LanguageSwitcher from '../components/LanguageSwitcher'

export default function Settings() {
  const { t } = useTranslation()
  const [farmer, setFarmer] = useState(null)

  const farmerId = localStorage.getItem('agripulse-farmerId')

  useEffect(() => {
    if (farmerId) {
      getFarmer(farmerId).then(setFarmer)
    }
  }, [farmerId])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <SettingsIcon className="w-6 h-6 text-primary" />
        {t('settings.title')}
      </h1>

      {/* Language */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Globe className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold">{t('settings.language')}</h3>
              <p className="text-sm text-muted-foreground">Bahasa Melayu / English</p>
            </div>
          </div>
          <LanguageSwitcher />
        </div>
      </div>

      {/* Farms */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
            <Leaf className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold">{t('settings.farms')}</h3>
            <p className="text-sm text-muted-foreground">
              {farmer?.farms?.length || 0} {t('settings.farms').toLowerCase()}
            </p>
          </div>
        </div>
        {farmer?.farms?.map((farm, i) => (
          <div key={i} className="p-3 rounded-lg bg-muted/50 mb-2">
            <p className="font-medium text-sm">{farm.name}</p>
            <p className="text-xs text-muted-foreground">
              {farm.area_hectares} {t('common.hectares')} — {farm.current_crops?.length || 0} {t('farmMonitor.currentCrops').toLowerCase()}
            </p>
          </div>
        ))}
        {(!farmer?.farms || farmer.farms.length === 0) && (
          <p className="text-sm text-muted-foreground">{t('farmMonitor.noFarms')}</p>
        )}
      </div>

      {/* About */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
            <Info className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-semibold">{t('settings.about')}</h3>
            <p className="text-sm text-muted-foreground">{t('app.tagline')}</p>
          </div>
        </div>
      </div>

      {/* Farmer ID (for reference) */}
      {farmerId && (
        <p className="text-xs text-muted-foreground text-center">
          ID: {farmerId}
        </p>
      )}
    </div>
  )
}

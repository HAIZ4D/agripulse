import { useTranslation } from 'react-i18next'
import { MapPin, Sprout, Activity, Satellite } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

function useAnimatedNumber(target, duration = 800) {
  const [value, setValue] = useState(0)
  const ref = useRef(null)

  useEffect(() => {
    if (target == null) return
    const start = 0
    const startTime = performance.now()

    function animate(now) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(start + (target - start) * eased)
      if (progress < 1) ref.current = requestAnimationFrame(animate)
    }

    ref.current = requestAnimationFrame(animate)
    return () => ref.current && cancelAnimationFrame(ref.current)
  }, [target, duration])

  return Math.round(value * 100) / 100
}

export default function FarmStats({ farm, report, history }) {
  const { t } = useTranslation()

  const areaHectares = farm?.area_hectares || farm?.boundary?.area_hectares || 0
  const cropCount = farm?.current_crops?.length || 0
  const healthScore = report?.health_score
  const lastScan = history?.[0]?.id || null

  const animatedArea = useAnimatedNumber(areaHectares)
  const animatedCrops = useAnimatedNumber(cropCount)
  const animatedHealth = useAnimatedNumber(healthScore ?? 0)

  const healthColor = healthScore == null
    ? 'text-muted-foreground'
    : healthScore >= 75
      ? 'text-green-600'
      : healthScore >= 50
        ? 'text-yellow-600'
        : healthScore >= 25
          ? 'text-orange-600'
          : 'text-red-600'

  const stats = [
    {
      icon: MapPin,
      label: t('farmMonitor.farmArea'),
      value: areaHectares ? `${animatedArea}` : '—',
      suffix: areaHectares ? ` ${t('common.hectares')}` : '',
      color: 'text-blue-600 bg-blue-50',
      delay: '0ms',
    },
    {
      icon: Sprout,
      label: t('farmMonitor.activeCrops'),
      value: `${Math.round(animatedCrops)}`,
      suffix: ` ${t('farmMonitor.crops')}`,
      color: 'text-green-600 bg-green-50',
      delay: '50ms',
    },
    {
      icon: Activity,
      label: t('farmMonitor.healthScore'),
      value: healthScore != null ? `${Math.round(animatedHealth)}` : '—',
      suffix: healthScore != null ? '/100' : '',
      color: `${healthColor} ${healthScore >= 75 ? 'bg-green-50' : healthScore >= 50 ? 'bg-yellow-50' : healthScore >= 25 ? 'bg-orange-50' : 'bg-red-50'}`,
      delay: '100ms',
    },
    {
      icon: Satellite,
      label: t('farmMonitor.lastScan'),
      value: lastScan || '—',
      suffix: '',
      color: 'text-purple-600 bg-purple-50',
      delay: '150ms',
      small: true,
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-card rounded-xl border border-border p-4 animate-fade-in-up"
          style={{ animationDelay: stat.delay }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.color.split(' ')[1] || 'bg-muted'}`}>
              <stat.icon className={`w-4 h-4 ${stat.color.split(' ')[0]}`} />
            </div>
            <span className="text-xs text-muted-foreground font-medium">{stat.label}</span>
          </div>
          <p className={`font-bold ${stat.small ? 'text-sm' : 'text-xl'} ${stat.color.split(' ')[0]}`}>
            {stat.value}
            {stat.suffix && <span className="text-sm font-normal text-muted-foreground">{stat.suffix}</span>}
          </p>
        </div>
      ))}
    </div>
  )
}

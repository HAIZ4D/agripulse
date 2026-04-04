import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ShoppingCart, Users, Flame, TrendingUp } from 'lucide-react'

function useAnimatedNumber(target, duration = 800) {
  const [value, setValue] = useState(0)
  const ref = useRef()

  useEffect(() => {
    const start = performance.now()
    const from = 0

    function tick(now) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(from + (target - from) * eased))
      if (progress < 1) ref.current = requestAnimationFrame(tick)
    }

    ref.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(ref.current)
  }, [target, duration])

  return value
}

function PulseCard({ icon: Icon, label, value, suffix, color, bgColor, delay }) {
  return (
    <div
      className="bg-card rounded-xl border border-border p-4 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center mb-3`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">
        {typeof value === 'number' ? value.toLocaleString() : value}
        {suffix && <span className="text-sm font-normal text-muted-foreground ml-1">{suffix}</span>}
      </p>
    </div>
  )
}

export default function MarketPulse({ demands }) {
  const { t } = useTranslation()

  const totalDemand = demands.reduce((sum, d) => sum + (d.total_weekly_kg || 0), 0)
  const totalBuyers = Math.max(...demands.map((d) => d.buyer_count || 0), 0)
  const trendingCrop = demands.length > 0
    ? [...demands].sort((a, b) => (b.total_weekly_kg || 0) - (a.total_weekly_kg || 0))[0]?.crop
    : '—'
  const risingCount = demands.filter((d) => d.trend === 'rising').length

  const animatedDemand = useAnimatedNumber(Math.round(totalDemand))
  const animatedBuyers = useAnimatedNumber(totalBuyers)
  const animatedRising = useAnimatedNumber(risingCount)

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <PulseCard
        icon={ShoppingCart}
        label={t('dashboard.totalDemand')}
        value={animatedDemand}
        suffix="kg"
        color="text-green-600"
        bgColor="bg-green-50"
        delay={0}
      />
      <PulseCard
        icon={Users}
        label={t('demandIntel.activeBuyers')}
        value={animatedBuyers}
        color="text-blue-600"
        bgColor="bg-blue-50"
        delay={100}
      />
      <PulseCard
        icon={Flame}
        label={t('demandIntel.trendingCrop')}
        value={trendingCrop}
        color="text-amber-600"
        bgColor="bg-amber-50"
        delay={200}
      />
      <PulseCard
        icon={TrendingUp}
        label={t('demandIntel.risingCrops')}
        value={animatedRising}
        color="text-purple-600"
        bgColor="bg-purple-50"
        delay={300}
      />
    </div>
  )
}

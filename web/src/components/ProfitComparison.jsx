import { useTranslation } from 'react-i18next'
import { DollarSign } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'

function ProfitTooltip({ active, payload, t }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
      <p className="font-semibold mb-1">{payload[0]?.payload?.name}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: RM {p.value?.toLocaleString()}
        </p>
      ))}
    </div>
  )
}

export default function ProfitComparison({ recommendations, demands }) {
  const { t } = useTranslation()

  // Extract all crops from recommendations
  const allCrops = []
  recommendations.forEach((rec) => {
    const crops = rec.recommended_crops || rec.recommendations || []
    crops.forEach((crop) => {
      if (crop.projected_profit) {
        allCrops.push(crop)
      }
    })
  })

  if (allCrops.length === 0) return null

  const barData = allCrops.map((c) => ({
    name: c.crop,
    cost: c.projected_profit.cost_per_hectare || 0,
    revenue: c.projected_profit.revenue_per_hectare || 0,
    margin: c.projected_profit.margin_percentage || 0,
  }))

  // Radar data for multi-dimensional comparison
  const maxDemand = Math.max(...demands.map((d) => d.total_weekly_kg || 0), 1)
  const maxBuyers = Math.max(...demands.map((d) => d.buyer_count || 0), 1)

  const radarData = allCrops.length >= 2
    ? [
        {
          subject: t('recommendation.localDemand'),
          ...Object.fromEntries(
            allCrops.map((c) => {
              const demandItem = demands.find(
                (d) => d.crop?.toLowerCase() === c.crop?.toLowerCase()
              )
              return [c.crop, Math.round(((demandItem?.total_weekly_kg || 0) / maxDemand) * 100)]
            })
          ),
        },
        {
          subject: t('recommendation.margin'),
          ...Object.fromEntries(allCrops.map((c) => [c.crop, c.projected_profit.margin_percentage || 0])),
        },
        {
          subject: t('recommendation.aiConfidence'),
          ...Object.fromEntries(allCrops.map((c) => [c.crop, Math.round((c.confidence || 0) * 100)])),
        },
        {
          subject: t('demandIntel.buyers'),
          ...Object.fromEntries(
            allCrops.map((c) => {
              const demandItem = demands.find(
                (d) => d.crop?.toLowerCase() === c.crop?.toLowerCase()
              )
              return [c.crop, Math.round(((demandItem?.buyer_count || 0) / maxBuyers) * 100)]
            })
          ),
        },
      ]
    : null

  const radarColors = ['#2d6a4f', '#52b788', '#95d5b2', '#b7e4c7']

  return (
    <div className="bg-card rounded-xl border border-border p-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-primary" />
        {t('demandIntel.profitComparison')}
      </h3>

      <div className={`grid ${radarData ? 'lg:grid-cols-2' : ''} gap-6`}>
        {/* Cost vs Revenue Bar Chart */}
        <div>
          <p className="text-sm text-muted-foreground mb-3">{t('demandIntel.costVsRevenue')}</p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData} margin={{ left: 10, right: 10 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `RM${v >= 1000 ? `${v / 1000}k` : v}`} />
              <Tooltip content={<ProfitTooltip t={t} />} />
              <Legend />
              <Bar dataKey="cost" name={t('recommendation.cost')} fill="#ef4444" radius={[4, 4, 0, 0]} animationDuration={1000} />
              <Bar dataKey="revenue" name={t('recommendation.revenue')} fill="#22c55e" radius={[4, 4, 0, 0]} animationDuration={1000} />
            </BarChart>
          </ResponsiveContainer>
          {/* Margin labels */}
          <div className="flex justify-around mt-2">
            {barData.map((d) => (
              <div key={d.name} className="text-center">
                <p className="text-xs text-muted-foreground">{d.name}</p>
                <p className="text-sm font-bold text-green-600">{d.margin}% {t('recommendation.margin').toLowerCase()}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Radar Chart */}
        {radarData && (
          <div>
            <p className="text-sm text-muted-foreground mb-3">{t('demandIntel.cropComparison')}</p>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#d8e8d0" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis tick={false} domain={[0, 100]} />
                {allCrops.map((c, i) => (
                  <Radar
                    key={c.crop}
                    name={c.crop}
                    dataKey={c.crop}
                    stroke={radarColors[i % radarColors.length]}
                    fill={radarColors[i % radarColors.length]}
                    fillOpacity={0.15}
                    animationDuration={1200}
                  />
                ))}
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}

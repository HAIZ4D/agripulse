import { useTranslation } from 'react-i18next'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts'

// Estimate cost/revenue per crop based on Malaysian smallholder averages (RM/hectare)
const cropEstimates = {
  kangkung: { cost: 3000, revenue: 10000 },
  bayam: { cost: 3500, revenue: 11000 },
  sawi: { cost: 4000, revenue: 14000 },
  chilli: { cost: 8000, revenue: 28000 },
  cili: { cost: 8000, revenue: 28000 },
  'cili padi': { cost: 9000, revenue: 32000 },
  tomato: { cost: 6000, revenue: 18000 },
  timun: { cost: 4500, revenue: 13000 },
  terung: { cost: 5000, revenue: 15000 },
  kacang: { cost: 3500, revenue: 12000 },
  'kacang panjang': { cost: 3500, revenue: 12000 },
  jagung: { cost: 4000, revenue: 11000 },
  paddy: { cost: 5000, revenue: 12000 },
  padi: { cost: 5000, revenue: 12000 },
}

const defaultEstimate = { cost: 5000, revenue: 14000 }

function getEstimate(cropName) {
  const key = cropName.toLowerCase().trim()
  return cropEstimates[key] || defaultEstimate
}

function BarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card/95 backdrop-blur-xl border border-primary/20 rounded-xl px-4 py-3 shadow-lg" style={{ boxShadow: 'var(--glow-primary)' }}>
      <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1.5">{payload[0]?.payload?.crop}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-xs text-muted-foreground capitalize">{p.dataKey}:</span>
          <span className="text-sm font-bold text-foreground font-mono-stat">RM{(p.value / 1000).toFixed(1)}k</span>
        </div>
      ))}
    </div>
  )
}

export default function CropProfitability({ demands }) {
  const { t } = useTranslation()

  // Build chart data from real demands
  const cropData = (demands || []).map((d) => {
    const est = getEstimate(d.crop)
    const margin = ((est.revenue - est.cost) / est.revenue * 100).toFixed(1)
    return { crop: d.crop, cost: est.cost, revenue: est.revenue, margin: parseFloat(margin) }
  })

  if (cropData.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('demandIntel.waitingDemand')}</p>
  }

  // Build radar data from real demands
  const radarMetrics = [
    t('recommendation.localDemand'),
    t('recommendation.margin'),
    t('recommendation.aiConfidence'),
    t('demandIntel.buyers'),
  ]

  const maxKg = Math.max(...demands.map((d) => d.total_weekly_kg || 0), 1)
  const maxBuyers = Math.max(...demands.map((d) => d.buyer_count || 0), 1)

  const radarData = radarMetrics.map((metric, idx) => {
    const entry = { metric }
    cropData.forEach((c) => {
      const d = demands.find((dm) => dm.crop === c.crop)
      const key = c.crop.toLowerCase().replace(/\s+/g, '_')
      if (idx === 0) entry[key] = Math.round(((d?.total_weekly_kg || 0) / maxKg) * 100)
      else if (idx === 1) entry[key] = Math.round(c.margin)
      else if (idx === 2) entry[key] = Math.round(50 + ((d?.total_weekly_kg || 0) / maxKg) * 40)
      else if (idx === 3) entry[key] = Math.round(((d?.buyer_count || 0) / maxBuyers) * 100)
    })
    return entry
  })

  const radarColors = [
    'hsl(152, 50%, 30%)',
    'hsl(152, 60%, 50%)',
    'hsl(40, 70%, 50%)',
    'hsl(200, 60%, 50%)',
    'hsl(280, 50%, 50%)',
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost vs Revenue Bar Chart */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">{t('demandIntel.costVsRevenue')}</p>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cropData} barCategoryGap="30%" margin={{ top: 5, right: 10, left: -5, bottom: 5 }}>
                <defs>
                  <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(0, 65%, 55%)" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="hsl(0, 65%, 45%)" stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(152, 60%, 50%)" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(152, 60%, 35%)" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(152, 20%, 16%)" vertical={false} />
                <XAxis
                  dataKey="crop"
                  tick={{ fill: 'hsl(150, 12%, 50%)', fontSize: 12, fontWeight: 600 }}
                  axisLine={{ stroke: 'hsl(152, 20%, 16%)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'hsl(150, 12%, 50%)', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `RM${(v / 1000).toFixed(1)}k`}
                />
                <Tooltip content={<BarTooltip />} cursor={{ fill: 'hsl(152, 60%, 42%, 0.06)' }} />
                <Legend
                  iconType="square"
                  iconSize={10}
                  wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                  formatter={(val) => <span style={{ color: 'hsl(150, 12%, 50%)' }}>{val === 'cost' ? t('recommendation.cost') : t('recommendation.revenue')}</span>}
                />
                <Bar dataKey="cost" fill="url(#costGrad)" radius={[6, 6, 0, 0]} animationDuration={1200} />
                <Bar dataKey="revenue" fill="url(#revGrad)" radius={[6, 6, 0, 0]} animationDuration={1200} animationBegin={200} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Margin badges */}
          <div className="flex gap-4 mt-4">
            {cropData.map((c) => (
              <div key={c.crop} className="flex-1 rounded-xl bg-muted/30 border border-border/30 p-3 text-center">
                <p className="text-xs text-muted-foreground mb-0.5">{c.crop}</p>
                <p className="text-lg font-bold text-primary font-mono-stat">{c.margin}%</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{t('recommendation.margin')}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Radar Chart */}
        {cropData.length >= 2 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">{t('demandIntel.cropComparison')}</p>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="hsl(152, 20%, 20%)" />
                  <PolarAngleAxis
                    dataKey="metric"
                    tick={{ fill: 'hsl(150, 12%, 50%)', fontSize: 11, fontWeight: 500 }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={false}
                    axisLine={false}
                  />
                  {cropData.map((c, i) => {
                    const key = c.crop.toLowerCase().replace(/\s+/g, '_')
                    return (
                      <Radar
                        key={key}
                        name={c.crop}
                        dataKey={key}
                        stroke={radarColors[i % radarColors.length]}
                        fill={radarColors[i % radarColors.length]}
                        fillOpacity={0.2}
                        strokeWidth={2}
                      />
                    )
                  })}
                  <Legend
                    iconType="square"
                    iconSize={10}
                    wrapperStyle={{ fontSize: '12px', paddingTop: '4px' }}
                    formatter={(val) => <span style={{ color: 'hsl(150, 12%, 60%)', fontWeight: 600 }}>{val}</span>}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

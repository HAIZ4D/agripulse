import { useTranslation } from 'react-i18next'
import { TrendingUp } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts'

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.stroke }}>
          {p.name}: {p.value}
          {p.dataKey === 'health_score' ? '/100' : ''}
        </p>
      ))}
    </div>
  )
}

export default function HealthTrendChart({ history }) {
  const { t } = useTranslation()

  if (!history || history.length < 2) {
    return null
  }

  // Reverse history so oldest is first (left side of chart)
  const chartData = [...history].reverse().map((h) => ({
    date: h.id || '',
    health_score: h.health_score ?? 0,
    ndvi: h.ndvi_average != null ? Math.round(h.ndvi_average * 1000) / 10 : 0,
  }))

  return (
    <div className="bg-card rounded-xl border border-border p-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
      <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-primary" />
        {t('farmMonitor.healthTrend')}
      </h3>

      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={chartData} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => {
              if (!v) return ''
              // Show just month-day for cleaner labels
              const parts = v.split('-')
              return parts.length >= 3 ? `${parts[1]}/${parts[2]}` : v
            }}
          />
          <YAxis
            yAxisId="score"
            domain={[0, 100]}
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `${v}`}
          />
          <YAxis
            yAxisId="ndvi"
            orientation="right"
            domain={[0, 100]}
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `${(v / 100).toFixed(1)}`}
            hide
          />
          <Tooltip content={<TrendTooltip />} />
          <ReferenceLine yAxisId="score" y={75} stroke="#22c55e" strokeDasharray="5 5" strokeOpacity={0.5} />
          <ReferenceLine yAxisId="score" y={50} stroke="#eab308" strokeDasharray="5 5" strokeOpacity={0.5} />
          <Line
            yAxisId="score"
            type="monotone"
            dataKey="health_score"
            name={t('farmMonitor.healthScore')}
            stroke="#2d6a4f"
            strokeWidth={2.5}
            dot={{ fill: '#2d6a4f', r: 4 }}
            activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
            animationDuration={1500}
          />
          <Line
            yAxisId="ndvi"
            type="monotone"
            dataKey="ndvi"
            name="NDVI (x100)"
            stroke="#40916c"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={{ fill: '#40916c', r: 3 }}
            animationDuration={1500}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-[#2d6a4f] rounded" />
          <span>{t('farmMonitor.healthScore')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-[#40916c] rounded border-dashed" style={{ borderTop: '1.5px dashed #40916c', height: 0 }} />
          <span>NDVI</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0 border-t border-dashed border-green-500" />
          <span>{t('farmMonitor.healthy')} (75+)</span>
        </div>
      </div>
    </div>
  )
}

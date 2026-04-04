import { useTranslation } from 'react-i18next'
import { BarChart3, PieChart as PieIcon } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

const COLORS = ['#2d6a4f', '#40916c', '#52b788', '#74c69d', '#95d5b2', '#b7e4c7', '#d8f3dc']

function CustomTooltip({ active, payload, t }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
      <p className="font-semibold">{d.name}</p>
      <p className="text-muted-foreground">
        {d.demand?.toLocaleString()} kg/{t('common.perWeek').replace('/', '')}
      </p>
      <p className="text-muted-foreground">
        {d.buyers} {t('demandIntel.buyers').toLowerCase()}
      </p>
    </div>
  )
}

export default function DemandCharts({ demands }) {
  const { t } = useTranslation()

  if (!demands || demands.length === 0) return null

  const chartData = [...demands]
    .sort((a, b) => (b.total_weekly_kg || 0) - (a.total_weekly_kg || 0))
    .map((d) => ({
      name: d.crop,
      demand: d.total_weekly_kg || 0,
      buyers: d.buyer_count || 0,
      trend: d.trend,
    }))

  const totalDemand = chartData.reduce((sum, d) => sum + d.demand, 0)

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Bar Chart */}
      <div className="bg-card rounded-xl border border-border p-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          {t('demandIntel.demandComparison')}
        </h3>
        <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 50)}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
            <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}kg`} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 13 }} width={90} />
            <Tooltip content={<CustomTooltip t={t} />} />
            <Bar
              dataKey="demand"
              radius={[0, 6, 6, 0]}
              animationDuration={1200}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Donut Chart */}
      <div className="bg-card rounded-xl border border-border p-6 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <PieIcon className="w-5 h-5 text-primary" />
          {t('demandIntel.demandDistribution')}
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="demand"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={95}
              paddingAngle={2}
              animationDuration={1200}
            >
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip t={t} />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => <span className="text-sm">{value}</span>}
            />
            {/* Center label */}
            <text x="50%" y="47%" textAnchor="middle" className="fill-foreground text-2xl font-bold">
              {totalDemand.toLocaleString()}
            </text>
            <text x="50%" y="57%" textAnchor="middle" className="fill-muted-foreground text-xs">
              kg/{t('common.perWeek').replace('/', '')}
            </text>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

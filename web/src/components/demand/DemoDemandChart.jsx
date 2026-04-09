import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const COLORS = ['#4ade80', '#22d3ee', '#facc15', '#a78bfa']

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 shadow-lg">
      <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">{d.payload.crop}</p>
      <p className="text-lg font-bold text-foreground">{d.value} kg</p>
    </div>
  )
}

export default function DemoDemandChart({ demands }) {
  const data = demands.map((d) => ({
    crop: d.crop.charAt(0).toUpperCase() + d.crop.slice(1),
    totalQty: d.total_weekly_kg || d.totalQty || 0,
  })).slice(0, 8)

  return (
    <div className="w-full h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barCategoryGap="30%" margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <defs>
            {COLORS.map((color, i) => (
              <linearGradient key={i} id={`barGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={1} />
                <stop offset="100%" stopColor={color} stopOpacity={0.5} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
          <XAxis
            dataKey="crop"
            tick={{ fill: '#6b6b6b', fontSize: 12, fontWeight: 600 }}
            axisLine={{ stroke: '#222' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#6b6b6b', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            unit=" kg"
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(74,222,128,0.04)' }} />
          <Bar dataKey="totalQty" radius={[8, 8, 0, 0]} animationDuration={1200} animationEasing="ease-out">
            {data.map((_, i) => (
              <Cell key={i} fill={`url(#barGrad${i % COLORS.length})`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const COLORS = ['hsl(152, 60%, 42%)', 'hsl(165, 50%, 50%)', 'hsl(46, 70%, 52%)', 'hsl(200, 60%, 50%)']

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-card/95 backdrop-blur-xl border border-primary/20 rounded-xl px-4 py-3 shadow-lg" style={{ boxShadow: 'var(--glow-primary)' }}>
      <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">{d.payload.crop}</p>
      <p className="text-lg font-bold text-foreground font-mono-stat">{d.value} kg</p>
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
            unit=" kg"
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(152, 60%, 42%, 0.06)' }} />
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

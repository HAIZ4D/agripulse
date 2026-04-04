import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts'

const cropData = [
  { crop: 'Kangkung', cost: 3000, revenue: 10000, margin: 70 },
  { crop: 'Sawi', cost: 4000, revenue: 14000, margin: 71.4 },
]

const radarData = [
  { metric: 'Local Demand', kangkung: 85, sawi: 70 },
  { metric: 'Margin', kangkung: 70, sawi: 71 },
  { metric: 'AI Confidence', kangkung: 60, sawi: 80 },
  { metric: 'Buyers', kangkung: 75, sawi: 55 },
]

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

export default function CropProfitability() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost vs Revenue Bar Chart */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Cost vs Revenue (RM/hectare)</p>
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
                  formatter={(val) => <span style={{ color: 'hsl(150, 12%, 50%)' }}>{val === 'cost' ? 'Cost' : 'Revenue'}</span>}
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
                <p className="text-xs text-muted-foreground mb-0.5">{c.crop.toLowerCase()}</p>
                <p className="text-lg font-bold text-primary font-mono-stat">{c.margin}%</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">margin</p>
              </div>
            ))}
          </div>
        </div>

        {/* Radar Chart */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Crop Comparison</p>
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
                <Radar
                  name="Kangkung"
                  dataKey="kangkung"
                  stroke="hsl(152, 50%, 30%)"
                  fill="hsl(152, 50%, 30%)"
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
                <Radar
                  name="Sawi"
                  dataKey="sawi"
                  stroke="hsl(152, 60%, 50%)"
                  fill="hsl(152, 60%, 50%)"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
                <Legend
                  iconType="square"
                  iconSize={10}
                  wrapperStyle={{ fontSize: '12px', paddingTop: '4px' }}
                  formatter={(val) => <span style={{ color: 'hsl(150, 12%, 60%)', fontWeight: 600 }}>{val.toLowerCase()}</span>}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

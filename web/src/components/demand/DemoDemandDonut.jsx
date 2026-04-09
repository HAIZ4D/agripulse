export default function DemoDemandDonut({ demands }) {
  const topDemands = [...demands].sort((a,b) => (b.total_weekly_kg || b.totalQty || 0) - (a.total_weekly_kg || a.totalQty || 0)).slice(0, 4)
  const total = topDemands.reduce((s, d) => s + (d.total_weekly_kg || d.totalQty || 0), 0)
  const colors = ['#4ade80', '#22d3ee', '#facc15', '#a78bfa']

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative w-48 h-48">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="38" fill="none" stroke="#222" strokeWidth="10" />
          {topDemands.reduce(
            (acc, d, i) => {
              const qty = d.total_weekly_kg || d.totalQty || 0
              const pct = (qty / (total || 1)) * 100
              const offset = acc.offset
              acc.elements.push(
                <circle
                  key={d.crop}
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke={colors[i % colors.length]}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${pct * 2.39} ${239 - pct * 2.39}`}
                  strokeDashoffset={`${-offset * 2.39}`}
                  className="transition-all duration-1000"
                />
              )
              acc.offset += pct
              return acc
            },
            { elements: [], offset: 0 }
          ).elements}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-foreground">{total}</span>
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mt-0.5">kg/week</span>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-5">
        {topDemands.map((d, i) => (
          <div key={d.crop} className="flex items-center gap-2.5 text-sm">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
            <span className="capitalize font-medium text-foreground/80">{d.crop}</span>
            <span className="text-xs text-muted-foreground">({d.total_weekly_kg || d.totalQty || 0}kg)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

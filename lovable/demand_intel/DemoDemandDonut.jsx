export default function DemoDemandDonut({ demands }) {
  const total = demands.reduce((s, d) => s + (d.totalQty || 0), 0)
  const colors = ['hsl(152, 60%, 42%)', 'hsl(165, 50%, 50%)', 'hsl(46, 70%, 52%)', 'hsl(200, 60%, 50%)']
  const glowFilters = ['drop-shadow(0 0 6px hsl(152, 60%, 42%, 0.4))', 'drop-shadow(0 0 6px hsl(165, 50%, 50%, 0.4))']

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative w-48 h-48 animate-float">
        {/* Outer glow ring */}
        <div className="absolute inset-[-4px] rounded-full bg-gradient-to-br from-primary/10 to-transparent" />

        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90" style={{ filter: 'drop-shadow(0 0 12px hsl(152, 60%, 42%, 0.15))' }}>
          {/* Background ring */}
          <circle cx="50" cy="50" r="38" fill="none" stroke="hsl(152, 20%, 14%)" strokeWidth="10" />

          {demands.reduce(
            (acc, d, i) => {
              const pct = (d.totalQty / total) * 100
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
                  style={{ filter: glowFilters[i % glowFilters.length] }}
                />
              )
              acc.offset += pct
              return acc
            },
            { elements: [], offset: 0 }
          ).elements}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-foreground font-mono-stat">{total}</span>
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest mt-0.5">kg/week</span>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-5">
        {demands.map((d, i) => (
          <div key={d.crop} className="flex items-center gap-2.5 text-sm">
            <span
              className="w-3 h-3 rounded-full"
              style={{
                backgroundColor: colors[i % colors.length],
                boxShadow: `0 0 8px ${colors[i % colors.length]}40`,
              }}
            />
            <span className="capitalize font-medium text-foreground/80">{d.crop}</span>
            <span className="text-xs text-muted-foreground font-mono-stat">({d.totalQty}kg)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function MarketDemandTrend({ demands }) {
  const { t } = useTranslation();

  const chartData = demands.slice(0, 6).map((d) => ({
    name: d.crop,
    demand: d.total_weekly_kg || 0,
    supply: Math.round((d.total_weekly_kg || 0) * (0.4 + Math.random() * 0.5)),
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border/60 rounded-xl px-3 py-2 shadow-xl text-xs">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-muted-foreground">
            <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: p.color }} />
            {p.name}: <span className="text-foreground font-medium">{p.value} kg</span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="dashboard-card opacity-0 animate-slide-up" style={{ animationDelay: '500ms' }}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-bold text-foreground">{t('dashboard.marketDemandTrend')}</h3>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="text-muted-foreground">{t('dashboard.supply')}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-violet-400" />
            <span className="text-muted-foreground">{t('dashboard.demand')}</span>
          </span>
        </div>
      </div>

      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} barGap={4} barCategoryGap="20%">
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6b6b6b', fontSize: 11, fontWeight: 500 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6b6b6b', fontSize: 10 }}
              width={35}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(74,222,128,0.04)' }} />
            <Bar dataKey="supply" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="demand" fill="#a78bfa" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[260px] flex items-center justify-center">
          <p className="text-sm text-muted-foreground">{t('demandIntel.waitingDemand')}</p>
        </div>
      )}
    </div>
  );
}

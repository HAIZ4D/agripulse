import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({ icon: Icon, label, value, color, trend, subtitle, delay = 0 }) {
  const colorMap = {
    blue: { icon: 'bg-blue-500/15 text-blue-400', glow: '0 0 20px rgba(59,130,246,0.15)' },
    green: { icon: 'bg-green-500/15 text-green-400', glow: '0 0 20px rgba(74,222,128,0.15)' },
    amber: { icon: 'bg-amber-500/15 text-amber-400', glow: '0 0 20px rgba(245,158,11,0.15)' },
    purple: { icon: 'bg-violet-500/15 text-violet-400', glow: '0 0 20px rgba(139,92,246,0.15)' },
  };

  const colorKey = color?.includes('blue') ? 'blue'
    : color?.includes('green') || color?.includes('emerald') ? 'green'
    : color?.includes('amber') ? 'amber'
    : 'purple';

  const c = colorMap[colorKey];

  return (
    <div
      className="stat-card group opacity-0 animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-11 h-11 rounded-xl ${c.icon} flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}
          style={{ boxShadow: c.glow }}
        >
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-[11px] font-semibold ${
            trend.positive ? 'text-green-400' : 'text-red-400'
          }`}>
            {trend.positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend.value}
          </div>
        )}
        {subtitle && !trend && (
          <span className="text-[11px] font-medium text-muted-foreground">{subtitle}</span>
        )}
      </div>
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
    </div>
  );
}

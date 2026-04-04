import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({ icon: Icon, label, value, color, trend, delay = 0 }) {
  const gradients = {
    emerald: 'from-emerald-500 to-teal-500',
    blue: 'from-blue-500 to-cyan-500',
    amber: 'from-amber-500 to-orange-500',
    purple: 'from-violet-500 to-purple-500',
  };

  const glows = {
    emerald: '0 0 24px -4px rgba(16, 185, 129, 0.4)',
    blue: '0 0 24px -4px rgba(59, 130, 246, 0.4)',
    amber: '0 0 24px -4px rgba(245, 158, 11, 0.4)',
    purple: '0 0 24px -4px rgba(139, 92, 246, 0.4)',
  };

  const colorKey = color.includes('blue') ? 'blue'
    : color.includes('green') || color.includes('emerald') ? 'emerald'
    : color.includes('amber') ? 'amber'
    : 'purple';

  const gradient = gradients[colorKey];

  return (
    <div
      className="stat-card group opacity-0 animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center transition-all duration-300 group-hover:scale-110`}
          style={{ boxShadow: glows[colorKey] }}
        >
          <Icon className="w-6 h-6 text-primary-foreground" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
            trend.positive
              ? 'bg-accent text-accent-foreground'
              : 'bg-destructive/15 text-destructive'
          }`}>
            {trend.positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend.value}
          </div>
        )}
      </div>
      <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
    </div>
  );
}

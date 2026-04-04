import { Leaf, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function HealthScoreCard({ score, trend, ndviAvg, farms, waitingMessage }) {
  const getStatus = (s) => {
    if (s >= 75) return { label: 'Healthy', badge: 'badge-healthy' };
    if (s >= 50) return { label: 'Warning', badge: 'badge-warning' };
    return { label: 'Critical', badge: 'badge-critical' };
  };

  const status = getStatus(score);

  const getProgressGradient = (s) => {
    if (s >= 75) return 'bg-gradient-to-r from-emerald-500 to-teal-400';
    if (s >= 50) return 'bg-gradient-to-r from-amber-500 to-orange-400';
    return 'bg-gradient-to-r from-red-500 to-rose-400';
  };

  const getProgressGlow = (s) => {
    if (s >= 75) return '0 0 16px rgba(16, 185, 129, 0.5)';
    if (s >= 50) return '0 0 16px rgba(245, 158, 11, 0.5)';
    return '0 0 16px rgba(239, 68, 68, 0.5)';
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div className="dashboard-card opacity-0 animate-slide-up" style={{ animationDelay: '300ms' }}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2.5 text-foreground">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center" style={{ boxShadow: '0 0 20px -4px rgba(16,185,129,0.4)' }}>
            <Leaf className="w-5 h-5 text-primary-foreground" />
          </div>
          Farm Health
        </h3>
        <span className={status.badge}>{status.label}</span>
      </div>

      <div className="flex items-end gap-3 mb-5">
        <span className="text-5xl font-extrabold tracking-tight gradient-text">{score}</span>
        <span className="text-muted-foreground text-sm mb-2 font-medium">/ 100</span>
        {trend && (
          <div className="flex items-center gap-1 mb-2 ml-auto">
            <TrendIcon className={`w-4 h-4 ${trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-muted-foreground'}`} />
            <span className="text-xs text-muted-foreground font-medium">{trend === 'up' ? 'Improving' : trend === 'down' ? 'Declining' : 'Stable'}</span>
          </div>
        )}
      </div>

      <div className="w-full h-2.5 rounded-full bg-secondary overflow-hidden mb-5">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out ${getProgressGradient(score)}`}
          style={{ width: `${score}%`, boxShadow: getProgressGlow(score) }}
        />
      </div>

      {ndviAvg != null && (
        <div className="flex items-center justify-between text-sm px-3 py-2.5 rounded-xl glass-surface mb-4">
          <span className="text-muted-foreground">NDVI Average</span>
          <span className="font-semibold text-foreground">{ndviAvg.toFixed(3)}</span>
        </div>
      )}

      {farms && farms.length > 0 && (
        <div className="space-y-2.5 mt-4 pt-4 border-t border-border/50">
          {farms.map((farm, i) => (
            <div key={i} className="p-3.5 rounded-xl glass-surface hover:bg-secondary/60 transition-all duration-200">
              <p className="font-semibold text-sm text-foreground">{farm.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {farm.area_hectares} hectares — {farm.current_crops?.length || 0} crops
              </p>
            </div>
          ))}
        </div>
      )}

      {waitingMessage && (
        <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ boxShadow: '0 0 8px rgba(16,185,129,0.6)' }} />
          {waitingMessage}
        </p>
      )}
    </div>
  );
}

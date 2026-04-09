import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, Droplets, Bug, TrendingUp } from 'lucide-react';

export default function RecentAlerts({ satellite, demands }) {
  const { t } = useTranslation();

  const alerts = [];

  // Generate alerts from real data
  if (satellite?.alerts?.length > 0) {
    satellite.alerts.forEach((a) => {
      alerts.push({
        icon: AlertTriangle,
        iconColor: a.severity === 'high' ? 'text-red-400 bg-red-500/15' : 'text-amber-400 bg-amber-500/15',
        title: a.message || t('farmMonitor.alerts'),
        subtitle: a.zone || '',
        type: 'warning',
      });
    });
  }

  // Low NDVI alert
  if (satellite?.ndvi_average != null && satellite.ndvi_average < 0.3) {
    alerts.push({
      icon: Droplets,
      iconColor: 'text-red-400 bg-red-500/15',
      title: t('dashboard.alertLowNDVI'),
      subtitle: `NDVI: ${satellite.ndvi_average.toFixed(3)}`,
      type: 'warning',
    });
  }

  // Rising demand alert
  const risingCrops = demands.filter((d) => d.trend === 'rising');
  if (risingCrops.length > 0) {
    alerts.push({
      icon: TrendingUp,
      iconColor: 'text-green-400 bg-green-500/15',
      title: `${risingCrops.length} ${t('dashboard.alertRisingDemand')}`,
      subtitle: risingCrops.map((c) => c.crop).join(', '),
      type: 'success',
    });
  }

  // All good fallback
  if (alerts.length === 0) {
    alerts.push({
      icon: CheckCircle2,
      iconColor: 'text-green-400 bg-green-500/15',
      title: t('dashboard.allGood'),
      subtitle: t('dashboard.noIssues'),
      type: 'success',
    });
  }

  return (
    <div className="dashboard-card opacity-0 animate-slide-up h-full flex flex-col" style={{ animationDelay: '600ms' }}>
      <h3 className="text-lg font-bold text-foreground mb-5">{t('dashboard.recentAlerts')}</h3>

      <div className="flex-1 space-y-3">
        {alerts.slice(0, 4).map((alert, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 border border-border/30 hover:bg-muted/30 transition-colors">
            <div className={`w-9 h-9 rounded-xl ${alert.iconColor} flex items-center justify-center shrink-0`}>
              <alert.icon className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground leading-tight">{alert.title}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{alert.subtitle}</p>
            </div>
          </div>
        ))}
      </div>

      <button className="mt-4 text-xs font-bold text-primary uppercase tracking-wider hover:text-primary/80 transition-colors">
        {t('dashboard.viewAllLogs')}
      </button>
    </div>
  );
}

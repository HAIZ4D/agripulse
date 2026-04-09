import { useTranslation } from 'react-i18next';
import { Sparkles, Shield, Radio } from 'lucide-react';

export default function DashboardHeader({ farmerName }) {
  const { t } = useTranslation();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('dashboard.greeting_morning') : hour < 17 ? t('dashboard.greeting_afternoon') : t('dashboard.greeting_evening');

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 opacity-0 animate-fade-in">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
          {greeting}, {farmerName || t('dashboard.farmer')}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t('dashboard.subtitle')}
        </p>
      </div>
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/40 border border-border/50 text-xs font-semibold text-muted-foreground">
          <Shield className="w-3.5 h-3.5 text-primary/70" />
          {t('dashboard.systemStable')}
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-xs font-bold text-primary">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          {t('dashboard.liveData')}
        </div>
      </div>
    </div>
  );
}

import { useTranslation } from 'react-i18next';

export default function DashboardFooter() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="flex flex-col sm:flex-row items-center justify-between py-5 border-t border-border/30 text-[11px] text-muted-foreground/60 gap-3">
      <div className="flex items-center gap-4">
        <span className="hover:text-foreground/60 cursor-pointer transition-colors">{t('dashboard.footerSupport')}</span>
        <span className="hover:text-foreground/60 cursor-pointer transition-colors">{t('dashboard.footerPrivacy')}</span>
        <span className="hover:text-foreground/60 cursor-pointer transition-colors">{t('dashboard.footerStatus')}</span>
      </div>
      <span className="uppercase tracking-wider font-semibold">
        © {year} AgriPulse. {t('dashboard.footerSystemStable')}
      </span>
    </footer>
  );
}

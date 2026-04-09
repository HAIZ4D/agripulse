import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Sprout, Plus } from 'lucide-react';

export default function EmptyFarmState() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="dashboard-card opacity-0 animate-slide-up h-full flex flex-col items-center justify-center text-center py-10" style={{ animationDelay: '500ms' }}>
      <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center mb-5">
        <Plus className="w-7 h-7 text-primary" />
      </div>
      <h3 className="text-base font-bold text-foreground mb-2">{t('dashboard.addFirstFarm')}</h3>
      <p className="text-xs text-muted-foreground max-w-[220px] mb-6 leading-relaxed">
        {t('dashboard.addFarmPrompt')}
      </p>
      <button
        onClick={() => navigate('/farm')}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
      >
        <Sprout className="w-4 h-4" />
        {t('dashboard.getStarted')}
      </button>
    </div>
  );
}

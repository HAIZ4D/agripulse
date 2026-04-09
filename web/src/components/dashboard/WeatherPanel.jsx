import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Cloud, Sun, CloudRain, CloudDrizzle, CloudSun, Droplets, Wind, Eye, Zap } from 'lucide-react';
import { fetchForecast } from '../../services/weatherMY';

const weatherIcons = {
  sunny: Sun,
  'partly-cloudy': CloudSun,
  cloudy: Cloud,
  rain: CloudRain,
  drizzle: CloudDrizzle,
};

function getConditionKey(forecastText) {
  if (!forecastText) return 'cloudy';
  const t = forecastText.toLowerCase();
  if (t.includes('petir') || t.includes('ribut') || t.includes('thunder')) return 'rain';
  if (t.includes('hujan') || t.includes('rain')) return 'rain';
  if (t.includes('renyai') || t.includes('drizzle')) return 'drizzle';
  if (t.includes('cerah') || t.includes('fair') || t.includes('sunny')) return 'sunny';
  if (t.includes('mendung') || t.includes('cloudy') || t.includes('awan')) return 'partly-cloudy';
  return 'cloudy';
}

export default function WeatherPanel({ areaName, weather: externalWeather }) {
  const { t } = useTranslation();
  const [forecast, setForecast] = useState([]);

  useEffect(() => {
    if (externalWeather?.length > 0) {
      setForecast(externalWeather);
      return;
    }
    if (!areaName) return;
    fetchForecast(areaName)
      .then((data) => { if (data?.length > 0) setForecast(data); })
      .catch((err) => console.error('Weather error:', err));
  }, [areaName, externalWeather]);

  const today = forecast[0];
  const condition = today ? getConditionKey(today.summary_forecast || today.morning_forecast) : 'sunny';
  const TodayIcon = weatherIcons[condition] || Cloud;
  const temp = today ? Math.round((today.min_temp + today.max_temp) / 2) : '--';
  const conditionLabel = today?.summary_forecast || today?.morning_forecast || '--';
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  return (
    <div className="dashboard-card opacity-0 animate-slide-up h-full" style={{ animationDelay: '400ms' }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            {t('dashboard.weather')} <TodayIcon className="w-5 h-5 text-muted-foreground" />
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">{areaName || 'Malaysia'}</p>
        </div>
        <span className="px-3 py-1 rounded-lg bg-primary/10 border border-primary/15 text-primary text-xs font-semibold capitalize">
          {conditionLabel}
        </span>
      </div>

      <div className="flex items-start gap-6 mb-5">
        <div className="flex items-start">
          <span className="text-6xl font-extrabold tracking-tighter text-foreground leading-none">{temp}</span>
          <span className="text-xl font-light text-muted-foreground mt-1">°C</span>
        </div>

        <div className="grid grid-cols-2 gap-x-5 gap-y-2 text-xs mt-1">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Droplets className="w-3.5 h-3.5 text-blue-400/60" />
            <span className="uppercase tracking-wider font-semibold text-[10px]">Humidity</span>
          </div>
          <span className="text-foreground font-semibold">72%</span>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Wind className="w-3.5 h-3.5 text-sky-400/60" />
            <span className="uppercase tracking-wider font-semibold text-[10px]">Wind</span>
          </div>
          <span className="text-foreground font-semibold">12 km/h</span>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Eye className="w-3.5 h-3.5 text-indigo-400/60" />
            <span className="uppercase tracking-wider font-semibold text-[10px]">Visibility</span>
          </div>
          <span className="text-foreground font-semibold">10 km</span>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Zap className="w-3.5 h-3.5 text-yellow-400/60" />
            <span className="uppercase tracking-wider font-semibold text-[10px]">UV Index</span>
          </div>
          <span className="text-foreground font-semibold">High (7)</span>
        </div>
      </div>

      {/* Wave decoration */}
      <div className="h-10 mb-4 rounded-xl bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 flex items-end overflow-hidden">
        <svg viewBox="0 0 400 40" className="w-full h-8 text-primary/20">
          <path d="M0 30 Q50 10 100 25 T200 20 T300 28 T400 15 L400 40 L0 40 Z" fill="currentColor" />
        </svg>
      </div>

      {/* Forecast days */}
      <div className="flex gap-2">
        {forecast.slice(1, 5).map((day, i) => {
          const dayDate = new Date(day.date);
          const dayCondition = getConditionKey(day.summary_forecast || day.morning_forecast);
          const DayIcon = weatherIcons[dayCondition] || Cloud;
          return (
            <div key={i} className="flex-1 flex flex-col items-center p-2.5 rounded-xl bg-muted/20 border border-border/30 hover:bg-muted/40 transition-colors">
              <span className="text-[10px] font-bold text-muted-foreground tracking-wider mb-2">{dayNames[dayDate.getDay()]}</span>
              <DayIcon className="w-5 h-5 text-foreground/50 mb-2" />
              <span className="text-sm font-bold text-foreground">{Math.round((day.min_temp + day.max_temp) / 2)}°</span>
            </div>
          );
        })}
        {forecast.length <= 1 && (
          <p className="text-xs text-muted-foreground py-4 text-center w-full">{t('common.loading')}</p>
        )}
      </div>
    </div>
  );
}

import { useTranslation } from 'react-i18next';
import { Cloud, Sun, CloudRain, CloudDrizzle, CloudSun, Droplets, Wind, Thermometer } from 'lucide-react';

const mockForecast = [
  { day: 'Today', temp: 31, high: 33, low: 25, condition: 'sunny', humidity: 72, wind: 12 },
  { day: 'Tue', temp: 29, high: 31, low: 24, condition: 'partly-cloudy', humidity: 78, wind: 15 },
  { day: 'Wed', temp: 27, high: 29, low: 23, condition: 'rain', humidity: 85, wind: 18 },
  { day: 'Thu', temp: 30, high: 32, low: 25, condition: 'drizzle', humidity: 75, wind: 10 },
  { day: 'Fri', temp: 32, high: 34, low: 26, condition: 'sunny', humidity: 68, wind: 8 },
];

const weatherIcons = {
  sunny: Sun,
  'partly-cloudy': CloudSun,
  cloudy: Cloud,
  rain: CloudRain,
  drizzle: CloudDrizzle,
};

const weatherGradients = {
  sunny: 'from-amber-500 via-orange-500 to-rose-500',
  'partly-cloudy': 'from-sky-500 via-blue-500 to-indigo-500',
  cloudy: 'from-slate-500 via-gray-500 to-zinc-500',
  rain: 'from-blue-600 via-indigo-600 to-violet-600',
  drizzle: 'from-cyan-500 via-blue-500 to-indigo-500',
};

export default function WeatherPanel({ areaName }) {
  const { t } = useTranslation();
  const today = mockForecast[0];
  const TodayIcon = weatherIcons[today.condition] || Cloud;

  return (
    <div className="dashboard-card opacity-0 animate-slide-up" style={{ animationDelay: '400ms' }}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2.5 text-foreground">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center" style={{ boxShadow: '0 0 20px -4px rgba(59,130,246,0.4)' }}>
            <Cloud className="w-5 h-5 text-primary-foreground" />
          </div>
          {t('dashboard.weather')}
        </h3>
        {areaName && (
          <span className="text-xs font-medium text-muted-foreground glass-surface px-3 py-1.5 rounded-full">
            📍 {areaName}
          </span>
        )}
      </div>

      <div className={`rounded-2xl bg-gradient-to-br ${weatherGradients[today.condition]} p-5 mb-5 relative overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary-foreground/70 uppercase tracking-wider">{t('dashboard.today')}</p>
              <p className="text-5xl font-extrabold text-primary-foreground tracking-tight mt-1">{today.temp}°</p>
              <p className="text-sm text-primary-foreground/70 mt-1 capitalize">{today.condition.replace('-', ' ')}</p>
            </div>
            <TodayIcon className="w-16 h-16 text-primary-foreground/80 drop-shadow-lg" />
          </div>
          <div className="flex gap-5 mt-4 pt-3 border-t border-primary-foreground/15">
            <div className="flex items-center gap-1.5 text-primary-foreground/70 text-xs">
              <Droplets className="w-3.5 h-3.5" /> {today.humidity}%
            </div>
            <div className="flex items-center gap-1.5 text-primary-foreground/70 text-xs">
              <Wind className="w-3.5 h-3.5" /> {today.wind} km/h
            </div>
            <div className="flex items-center gap-1.5 text-primary-foreground/70 text-xs">
              <Thermometer className="w-3.5 h-3.5" /> {today.low}° – {today.high}°
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {mockForecast.slice(1).map((day, i) => {
          const DayIcon = weatherIcons[day.condition] || Cloud;
          return (
            <div key={i} className="flex-1 min-w-[72px] flex flex-col items-center p-3 rounded-xl glass-surface hover:bg-secondary/60 transition-all duration-200">
              <span className="text-xs font-semibold text-muted-foreground mb-2">{day.day}</span>
              <DayIcon className="w-6 h-6 text-foreground/60 mb-2" />
              <span className="text-sm font-bold text-foreground">{day.temp}°</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">{day.low}°–{day.high}°</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

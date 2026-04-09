import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, ShoppingCart, Leaf, Activity, Loader2 } from 'lucide-react';
import { getFarmer, getDemandAggregates, getLatestSatelliteReport } from '../services/firebase';
import { fetchForecast } from '../services/weatherMY';
import { getDistrict } from '../lib/utils';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import StatCard from '../components/dashboard/StatCard';
import HealthScoreCard from '../components/dashboard/HealthScoreCard';
import WeatherPanel from '../components/dashboard/WeatherPanel';
import EmptyFarmState from '../components/dashboard/EmptyFarmState';
import MarketDemandTrend from '../components/dashboard/MarketDemandTrend';
import RecentAlerts from '../components/dashboard/RecentAlerts';
import DashboardFooter from '../components/dashboard/DashboardFooter';

export default function Dashboard() {
  const { t } = useTranslation();
  const [farmer, setFarmer] = useState(null);
  const [demands, setDemands] = useState([]);
  const [satellite, setSatellite] = useState(null);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  const farmerId = localStorage.getItem('agripulse-farmerId');
  const areaRaw = localStorage.getItem('agripulse-area');
  const areaName = getDistrict(areaRaw);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [farmerData, demandData] = await Promise.all([
          farmerId ? getFarmer(farmerId) : null,
          areaName ? getDemandAggregates(areaName) : [],
        ]);
        setFarmer(farmerData);
        setDemands(demandData);

        if (farmerData?.farms?.length > 0) {
          const report = await getLatestSatelliteReport(farmerId, 0);
          setSatellite(report);
        }
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    if (areaName) {
      fetchForecast(areaName)
        .then((data) => setWeather(data))
        .catch((err) => console.error('Weather fetch error:', err));
    }
  }, [farmerId, areaName]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl gradient-icon flex items-center justify-center animate-pulse">
            <Loader2 className="w-6 h-6 animate-spin text-primary-foreground" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  const totalDemand = demands.reduce((sum, d) => sum + (d.total_weekly_kg || 0), 0);
  const totalBuyers = demands.length > 0 ? Math.max(...demands.map((d) => d.buyer_count || 0)) : 0;
  const topCrop =
    demands.length > 0
      ? [...demands].sort((a, b) => (b.total_weekly_kg || 0) - (a.total_weekly_kg || 0))[0]?.crop
      : '—';

  const hasFarm = farmer?.farms && farmer.farms.length > 0;

  return (
    <div>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header: Greeting + Badges */}
        <DashboardHeader farmerName={farmer?.name} />

        {/* Stat Cards Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label={t('dashboard.totalBuyers')}
            value={totalBuyers}
            trend={totalBuyers > 0 ? { value: '+4.2%', positive: true } : null}
            accent="blue"
            delay={100}
          />
          <StatCard
            icon={ShoppingCart}
            label={t('dashboard.totalDemand')}
            value={totalDemand > 0 ? `${totalDemand.toLocaleString()} kg` : '—'}
            trend={totalDemand > 0 ? { value: '+18%', positive: true } : null}
            accent="green"
            delay={200}
          />
          <StatCard
            icon={Leaf}
            label={t('dashboard.topCrop')}
            value={topCrop}
            badge="Steady"
            accent="amber"
            delay={300}
          />
          <StatCard
            icon={Activity}
            label={t('dashboard.healthScore')}
            value={satellite?.health_score != null ? `${satellite.health_score}/100` : '—'}
            badge={satellite?.health_score >= 75 ? 'Excellent' : satellite?.health_score >= 50 ? 'Good' : null}
            badgeColor={satellite?.health_score >= 75 ? 'green' : 'amber'}
            accent="green"
            delay={400}
          />
        </div>

        {/* Weather + Farm CTA / Health */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3">
            <WeatherPanel areaName={areaName || 'Kuala Lumpur'} weather={weather} />
          </div>
          <div className="lg:col-span-2">
            {hasFarm && satellite?.health_score != null ? (
              <HealthScoreCard
                score={satellite.health_score}
                trend={satellite.trend}
                ndviAvg={satellite.ndvi_average}
                farms={farmer.farms}
                waitingMessage={t('dashboard.satelliteRefresh')}
              />
            ) : hasFarm ? (
              <HealthScoreCard
                score={0}
                farms={farmer.farms}
                waitingMessage={t('dashboard.waitingSatellite')}
              />
            ) : (
              <EmptyFarmState />
            )}
          </div>
        </div>

        {/* Market Demand Trend + Recent Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3">
            <MarketDemandTrend demands={demands} />
          </div>
          <div className="lg:col-span-2">
            <RecentAlerts satellite={satellite} demands={demands} />
          </div>
        </div>

        {/* Footer */}
        <DashboardFooter />
      </div>
    </div>
  );
}

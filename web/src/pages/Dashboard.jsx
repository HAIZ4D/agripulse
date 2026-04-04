import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, ShoppingCart, Leaf, Activity, Loader2 } from 'lucide-react';
import { getFarmer, getDemandAggregates, getLatestSatelliteReport } from '../services/firebase';
import { getDistrict } from '../lib/utils';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import StatCard from '../components/dashboard/StatCard';
import HealthScoreCard from '../components/dashboard/HealthScoreCard';
import WeatherPanel from '../components/dashboard/WeatherPanel';
import EmptyFarmState from '../components/dashboard/EmptyFarmState';

export default function Dashboard() {
  const { t } = useTranslation();
  const [farmer, setFarmer] = useState(null);
  const [demands, setDemands] = useState([]);
  const [satellite, setSatellite] = useState(null);
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
  }, [farmerId, areaName]);

  if (loading) {
    return (
      <div className="dashboard-theme flex items-center justify-center min-h-screen">
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

  return (
    <div className="dashboard-theme">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        <DashboardHeader farmerName={farmer?.name} />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label={t('dashboard.totalBuyers')}
            value={totalBuyers}
            color="text-blue-600 bg-blue-50"
            trend={{ value: '+12%', positive: true }}
            delay={100}
          />
          <StatCard
            icon={ShoppingCart}
            label={t('dashboard.totalDemand')}
            value={totalDemand > 0 ? `${totalDemand.toLocaleString()} kg` : '—'}
            color="text-green-600 bg-green-50"
            trend={{ value: '+8%', positive: true }}
            delay={200}
          />
          <StatCard
            icon={Leaf}
            label={t('dashboard.topCrop')}
            value={topCrop}
            color="text-amber-600 bg-amber-50"
            delay={300}
          />
          <StatCard
            icon={Activity}
            label={t('dashboard.healthScore')}
            value={satellite?.health_score ?? '—'}
            color="text-purple-600 bg-purple-50"
            trend={{ value: '+5%', positive: true }}
            delay={400}
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {satellite?.health_score != null ? (
            <HealthScoreCard
              score={satellite.health_score}
              trend={satellite.trend}
              ndviAvg={satellite.ndvi_average}
              farms={farmer?.farms}
              waitingMessage={t('dashboard.satelliteRefresh')}
            />
          ) : farmer?.farms && farmer.farms.length > 0 ? (
            <HealthScoreCard
              score={0}
              farms={farmer.farms}
              waitingMessage={t('dashboard.waitingSatellite')}
            />
          ) : (
            <EmptyFarmState message={t('dashboard.addFarmPrompt')} />
          )}
          <WeatherPanel areaName={areaName || 'Kuala Lumpur'} />
        </div>
      </div>
    </div>
  );
}

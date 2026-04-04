import { useState, useEffect } from 'react';
import { LayoutDashboard, Users, ShoppingCart, Leaf, Activity, Loader2 } from 'lucide-react';
import DashboardHeader from '@/components/dashboard/DashboardHeader.jsx';
import StatCard from '@/components/dashboard/StatCard.jsx';
import HealthScoreCard from '@/components/dashboard/HealthScoreCard.jsx';
import WeatherPanel from '@/components/dashboard/WeatherPanel.jsx';
import EmptyFarmState from '@/components/dashboard/EmptyFarmState.jsx';

const mockFarmer = {
  name: 'Haizad',
  farms: [
    { name: 'Ladang Utama', area_hectares: 12, current_crops: ['Padi', 'Jagung', 'Cili'] },
    { name: 'Kebun Belakang', area_hectares: 3.5, current_crops: ['Sayur'] },
  ],
};

const mockDemands = [
  { crop: 'Padi', total_weekly_kg: 2400, buyer_count: 18 },
  { crop: 'Jagung', total_weekly_kg: 1800, buyer_count: 12 },
  { crop: 'Cili', total_weekly_kg: 950, buyer_count: 8 },
];

const mockSatellite = {
  health_score: 78,
  trend: 'up',
  ndvi_average: 0.682,
};

export default function Dashboard() {
  const [farmer, setFarmer] = useState(null);
  const [demands, setDemands] = useState([]);
  const [satellite, setSatellite] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        await new Promise((r) => setTimeout(r, 600));
        setFarmer(mockFarmer);
        setDemands(mockDemands);
        setSatellite(mockSatellite);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl gradient-icon flex items-center justify-center animate-pulse">
            <Loader2 className="w-6 h-6 animate-spin text-primary-foreground" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  const totalDemand = demands.reduce((sum, d) => sum + (d.total_weekly_kg || 0), 0);
  const totalBuyers = Math.max(...demands.map((d) => d.buyer_count || 0), 0);
  const topCrop =
    demands.length > 0
      ? demands.sort((a, b) => (b.total_weekly_kg || 0) - (a.total_weekly_kg || 0))[0]?.crop
      : '—';

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        <DashboardHeader farmerName={farmer?.name} />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Total Buyers"
            value={totalBuyers}
            color="text-blue-600 bg-blue-50"
            trend={{ value: '+12%', positive: true }}
            delay={100}
          />
          <StatCard
            icon={ShoppingCart}
            label="Total Demand"
            value={`${totalDemand.toLocaleString()} kg`}
            color="text-green-600 bg-green-50"
            trend={{ value: '+8%', positive: true }}
            delay={200}
          />
          <StatCard
            icon={Leaf}
            label="Top Crop"
            value={topCrop}
            color="text-amber-600 bg-amber-50"
            delay={300}
          />
          <StatCard
            icon={Activity}
            label="Health Score"
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
              waitingMessage="Sentinel-2 data refreshes every 5 days"
            />
          ) : farmer?.farms && farmer.farms.length > 0 ? (
            <HealthScoreCard
              score={0}
              farms={farmer.farms}
              waitingMessage="Waiting for satellite data (Sentinel-2)"
            />
          ) : (
            <EmptyFarmState message="Add your first farm to start monitoring crop health with satellite data." />
          )}
          <WeatherPanel areaName="Kuala Lumpur" />
        </div>
      </div>
    </div>
  );
}

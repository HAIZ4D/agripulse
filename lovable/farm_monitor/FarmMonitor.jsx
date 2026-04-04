import { useState } from "react";
import {
  Satellite, Plus, Sparkles, Brain, CloudRain, Sun, CloudSun,
  Droplets, Thermometer, Wind, Leaf, AlertTriangle, TrendingUp,
  Activity, MapPin, Maximize2, ChevronRight, Trash2, Loader2,
  Megaphone, BarChart3, Clock, Zap, Eye
} from "lucide-react";
import GlassCard from "@/components/farm/GlassCard";
import AnimatedCounter from "@/components/farm/AnimatedCounter";
import PulsingBadge from "@/components/farm/PulsingBadge";
import satelliteImg from "@/assets/satellite-farm.jpg";

// Mock data for demo
const MOCK_FARMS = [
  { name: "Paddy Farm 1", area_hectares: 1219.66, current_crops: [{ crop: "Rice", planted_date: "2026-01-15" }] },
  { name: "Corn Field Alpha", area_hectares: 340.2, current_crops: [{ crop: "Corn", planted_date: "2026-02-01" }] },
];

const MOCK_WEATHER = [
  { date: "2026-04-08", desc: "Partly cloudy", icon: "cloud-sun", min: 24, max: 33 },
  { date: "2026-04-07", desc: "Light rain", icon: "rain", min: 24, max: 33 },
  { date: "2026-04-06", desc: "Partly cloudy", icon: "cloud-sun", min: 24, max: 33 },
  { date: "2026-04-05", desc: "Thunderstorm", icon: "rain", min: 24, max: 32 },
  { date: "2026-04-04", desc: "Sunny", icon: "sun", min: 24, max: 33 },
  { date: "2026-04-03", desc: "Thunderstorm", icon: "rain", min: 24, max: 30 },
  { date: "2026-04-02", desc: "Partly cloudy", icon: "cloud-sun", min: 24, max: 34 },
];

const MOCK_HISTORY = [
  { id: "2026-03-28", ndvi_average: 0.72, health_score: 78 },
  { id: "2026-03-21", ndvi_average: 0.68, health_score: 72 },
  { id: "2026-03-14", ndvi_average: 0.65, health_score: 68 },
  { id: "2026-03-07", ndvi_average: 0.61, health_score: 63 },
  { id: "2026-02-28", ndvi_average: 0.58, health_score: 59 },
];

const MOCK_AI_INSIGHTS = [
  { text: "Crop stress detected in Zone B — consider targeted irrigation", type: "warning" },
  { text: "Optimal irrigation window in 2 days based on forecast", type: "info" },
  { text: "NDVI trending upward — healthy growth pattern confirmed", type: "success" },
];

const WeatherIcon = ({ type, className = "" }) => {
  if (type === "rain") return <CloudRain className={className} />;
  if (type === "sun") return <Sun className={className} />;
  return <CloudSun className={className} />;
};

export default function FarmMonitor() {
  const [selectedFarm, setSelectedFarm] = useState(0);
  const [mapMode, setMapMode] = useState("satellite");

  const farms = MOCK_FARMS;
  const currentFarm = farms[selectedFarm];
  const healthScore = 78;
  const ndviAvg = 0.72;

  const scoreColor = healthScore >= 75
    ? "text-primary glow-primary"
    : healthScore >= 50
    ? "text-yellow-400"
    : "text-red-400";

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 lg:px-12 max-w-[1400px] mx-auto space-y-8">
      {/* ===== HEADER ===== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center glow-primary">
              <Satellite className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-gradient">Farm Monitor</span>
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Real-time satellite intelligence & AI insights
          </p>
        </div>
        <button className="flex items-center gap-2 gradient-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold glow-primary hover:scale-105 transition-all duration-300">
          <Plus className="w-4 h-4" />
          Add Farm
        </button>
      </div>

      {/* ===== FARM SELECTOR ===== */}
      <div className="flex gap-2 overflow-x-auto pb-1 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
        {farms.map((farm, i) => (
          <div key={i} className="flex items-center">
            <button
              onClick={() => setSelectedFarm(i)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all duration-300 whitespace-nowrap rounded-l-xl ${
                selectedFarm === i
                  ? "gradient-primary text-primary-foreground glow-primary"
                  : "glass text-muted-foreground hover:text-foreground"
              }`}
            >
              <Satellite className="w-3.5 h-3.5" />
              {farm.name}
              {selectedFarm === i && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
            <button
              className={`px-2 py-2.5 rounded-r-xl text-sm transition-all duration-300 ${
                selectedFarm === i
                  ? "bg-primary/60 text-primary-foreground hover:bg-destructive"
                  : "glass text-muted-foreground hover:text-destructive"
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* ===== STATS BAR ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: MapPin, label: "Farm Area", value: currentFarm.area_hectares, suffix: " ha", decimals: 2, color: "text-primary" },
          { icon: Leaf, label: "Active Crops", value: currentFarm.current_crops.length, suffix: " crops", decimals: 0, color: "text-secondary" },
          { icon: Activity, label: "Health Score", value: healthScore, suffix: "/100", decimals: 0, color: healthScore >= 75 ? "text-primary" : "text-yellow-400" },
          { icon: Clock, label: "Last Scan", value: null, suffix: "", decimals: 0, color: "text-secondary" },
        ].map((stat, i) => (
          <GlassCard key={i} delay={200 + i * 80} className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                {stat.value !== null ? (
                  <p className="text-xl font-bold">
                    <AnimatedCounter value={stat.value} decimals={stat.decimals} suffix={stat.suffix} />
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* ===== SATELLITE MAP HERO ===== */}
      <GlassCard delay={500} hover={false} className="p-0 overflow-hidden relative group">
        <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
          <div className="glass-strong rounded-xl px-4 py-2 flex items-center gap-2">
            <Satellite className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">NDVI Overlay</span>
          </div>
          <PulsingBadge label="LIVE" color="primary" />
        </div>

        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <div className="glass-strong rounded-xl overflow-hidden flex">
            {["map", "satellite"].map((m) => (
              <button
                key={m}
                onClick={() => setMapMode(m)}
                className={`px-4 py-2 text-xs font-semibold transition-all duration-300 capitalize ${
                  mapMode === m ? "gradient-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <button className="glass-strong rounded-xl p-2 text-muted-foreground hover:text-foreground transition-colors">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        <div className="relative h-[350px] md:h-[450px] overflow-hidden">
          <img
            src={satelliteImg}
            alt="Farm satellite NDVI overlay"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            width={1920}
            height={960}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
          
          {/* Scan line effect */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent" style={{ animation: "scan-line 4s linear infinite" }} />
          </div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <div className="glass-strong rounded-xl px-4 py-2 flex flex-wrap items-center gap-4 text-xs">
            {[
              { color: "bg-emerald-500", label: "Healthy (0.6+)", glow: true },
              { color: "bg-green-400", label: "Good (0.4-0.6)" },
              { color: "bg-yellow-400", label: "Moderate (0.3-0.4)" },
              { color: "bg-orange-400", label: "Stressed (0.2-0.3)" },
              { color: "bg-red-500", label: "Critical (<0.2)" },
            ].map((item, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <span className={`w-3 h-3 rounded-full ${item.color} ${item.glow ? "shadow-[0_0_8px_rgba(34,197,94,0.5)]" : ""}`} />
                <span className="text-muted-foreground">{item.label}</span>
              </span>
            ))}
            <span className="ml-auto text-muted-foreground">{currentFarm.area_hectares.toFixed(2)} hectares</span>
          </div>
        </div>
      </GlassCard>

      {/* ===== HEALTH SCORE + CROP STATUS ===== */}
      <div className="grid lg:grid-cols-2 gap-6">
        <GlassCard delay={600} glow={healthScore >= 75 ? "primary" : undefined}>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Health Score</h3>
            <PulsingBadge label="LIVE" color="primary" />
          </div>
          <div className="flex items-center gap-8">
            <div className="relative w-28 h-28">
              <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="hsla(217,33%,100%,0.1)" strokeWidth="8" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(142,71%,45%)" strokeWidth="8"
                  strokeDasharray={`${healthScore * 2.51} 251`}
                  strokeLinecap="round"
                  className="drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">
                  <AnimatedCounter value={healthScore} />
                </span>
              </div>
            </div>
            <div className="space-y-3 flex-1">
              <div>
                <p className="text-xs text-muted-foreground mb-1">NDVI Average</p>
                <p className="text-lg font-bold text-secondary">{ndviAvg.toFixed(3)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Trend</p>
                <div className="flex items-center gap-1 text-primary">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm font-semibold">Improving</span>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard delay={700}>
          <div className="flex items-center gap-2 mb-4">
            <Leaf className="w-5 h-5 text-secondary" />
            <h3 className="font-semibold">Crop Status</h3>
          </div>
          {currentFarm.current_crops.length > 0 ? (
            <div className="space-y-3">
              {currentFarm.current_crops.map((c, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50 hover:border-primary/30 transition-all duration-300">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                      <Leaf className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{c.crop}</p>
                      <p className="text-xs text-muted-foreground">Planted: {c.planted_date}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary/10 text-primary">Active</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Leaf className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No crops registered yet</p>
            </div>
          )}
        </GlassCard>
      </div>

      {/* ===== HEALTH REPORT ===== */}
      <GlassCard delay={800}>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-secondary" />
          <h3 className="font-semibold">Health Report</h3>
        </div>
        <p className="text-sm text-muted-foreground">Waiting for latest satellite scan data...</p>
      </GlassCard>

      {/* ===== AI FARM ADVISOR ===== */}
      <GlassCard delay={900} glow="secondary" className="relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-secondary/5 blur-3xl pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl gradient-ai flex items-center justify-center glow-primary animate-pulse-glow">
                <Brain className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-bold text-lg">AI Farm Advisor</h3>
                <p className="text-xs text-muted-foreground">Pest risk, crop advice, harvest prediction</p>
              </div>
            </div>
            <button className="flex items-center gap-2 gradient-ai text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold glow-primary hover:scale-105 transition-all duration-300">
              <Sparkles className="w-4 h-4" />
              Analyze My Farm
            </button>
          </div>

          <div className="space-y-3">
            {MOCK_AI_INSIGHTS.map((insight, i) => {
              const iconMap = { warning: AlertTriangle, info: Droplets, success: TrendingUp };
              const colorMap = {
                warning: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
                info: "text-secondary bg-secondary/10 border-secondary/20",
                success: "text-primary bg-primary/10 border-primary/20",
              };
              const Icon = iconMap[insight.type];
              return (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${colorMap[insight.type]} animate-slide-in`} style={{ animationDelay: `${1000 + i * 150}ms` }}>
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm">{insight.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </GlassCard>

      {/* ===== SURPLUS ANNOUNCEMENT ===== */}
      <GlassCard delay={1000} glow="warning" className="border-orange-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/20 flex items-center justify-center">
              <Megaphone className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-orange-400">Surplus Announcement</h3>
              <p className="text-xs text-muted-foreground">Notify buyers when you have extra harvest</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="glass text-xs text-muted-foreground px-3 py-1.5 rounded-lg hover:text-foreground transition-colors">
              📋 History (1)
            </button>
            <button className="flex items-center gap-2 bg-orange-500 text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold glow-warning hover:scale-105 transition-all duration-300">
              <Megaphone className="w-4 h-4" />
              Announce Surplus
            </button>
          </div>
        </div>
      </GlassCard>

      {/* ===== WEATHER FORECAST ===== */}
      <GlassCard delay={1100} hover={false}>
        <div className="flex items-center gap-2 mb-6">
          <CloudSun className="w-5 h-5 text-secondary" />
          <h3 className="font-semibold">7-Day Weather Forecast</h3>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2">
          {MOCK_WEATHER.map((day, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[140px] glass-strong rounded-xl p-4 text-center hover:scale-105 border-glow-hover transition-all duration-300 animate-fade-in-up"
              style={{ animationDelay: `${1200 + i * 80}ms` }}
            >
              <p className="text-xs text-muted-foreground mb-2">{day.date}</p>
              <WeatherIcon type={day.icon} className="w-8 h-8 mx-auto mb-2 text-secondary" />
              <p className="text-xs text-muted-foreground mb-2">{day.desc}</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-sm font-bold text-secondary">{day.min}°</span>
                <span className="text-xs text-muted-foreground">—</span>
                <span className="text-sm font-bold text-orange-400">{day.max}°</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4 text-right">Source: MET Malaysia</p>
      </GlassCard>

      {/* ===== TIMELINE ===== */}
      <GlassCard delay={1200} hover={false}>
        <div className="flex items-center gap-2 mb-4">
          <Satellite className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Scan Timeline</h3>
        </div>
        <div className="space-y-2">
          {MOCK_HISTORY.map((h, i) => {
            const score = h.health_score ?? 0;
            const barColor = score >= 75 ? "hsl(142,71%,45%)" : score >= 50 ? "hsl(48,96%,53%)" : "hsl(0,84%,60%)";
            const badgeClass = score >= 75
              ? "text-primary bg-primary/10"
              : score >= 50
              ? "text-yellow-400 bg-yellow-400/10"
              : "text-red-400 bg-red-400/10";
            const dotClass = score >= 75 ? "bg-primary shadow-[0_0_6px_rgba(34,197,94,0.5)]" : score >= 50 ? "bg-yellow-400" : "bg-red-400";

            return (
              <div
                key={i}
                className="relative flex items-center justify-between p-3 rounded-xl bg-muted/20 hover:bg-muted/40 transition-all duration-300 overflow-hidden group"
              >
                <div
                  className="absolute inset-y-0 left-0 opacity-10 transition-all duration-500 group-hover:opacity-20"
                  style={{ width: `${Math.max(score, 5)}%`, backgroundColor: barColor }}
                />
                <div className="relative flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${dotClass}`} />
                  <span className="text-sm font-medium">{h.id}</span>
                </div>
                <div className="relative flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">NDVI: {h.ndvi_average?.toFixed(3) ?? "—"}</span>
                  <span className={`font-semibold px-2.5 py-0.5 rounded-lg text-xs ${badgeClass}`}>
                    {h.health_score ?? "—"}/100
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Footer spacer */}
      <div className="h-8" />
    </div>
  );
}

import { Bell, User, Sparkles } from 'lucide-react';

export default function DashboardHeader({ farmerName }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="flex items-center justify-between opacity-0 animate-fade-in">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Dashboard</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
          {greeting}, {farmerName || 'Farmer'} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Here's what's happening with your farms today.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-110 glass-surface">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary glow-ring" />
        </button>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center transition-all duration-200 hover:scale-110 cursor-pointer glow-ring">
          <User className="w-5 h-5 text-primary-foreground" />
        </div>
      </div>
    </div>
  );
}

import { Sprout } from 'lucide-react';

export default function EmptyFarmState({ message }) {
  return (
    <div className="dashboard-card opacity-0 animate-slide-up flex flex-col items-center justify-center py-12 text-center" style={{ animationDelay: '300ms' }}>
      <div className="w-16 h-16 rounded-2xl glass-surface flex items-center justify-center mb-4">
        <Sprout className="w-8 h-8 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground text-sm max-w-[240px]">{message}</p>
    </div>
  );
}

import { cn } from "../../lib/utils";

export default function GlassCard({ children, className, glow, delay = 0, hover = true, ...props }) {
  const glowClass = glow === 'primary' ? 'glow-primary' : glow === 'secondary' ? 'glow-secondary' : glow === 'accent' ? 'glow-accent' : glow === 'warning' ? 'glow-warning' : '';
  
  return (
    <div
      className={cn(
        "glass rounded-2xl p-6 animate-fade-in-up transition-all duration-300 relative",
        hover && "hover:scale-[1.02] border-glow-hover",
        glowClass,
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
      {...props}
    >
      {/* Fallback dark overlay just in case parent doesn't have theme */}
      <div className="absolute inset-0 bg-background/50 pointer-events-none rounded-2xl -z-10 mix-blend-multiply" />
      {children}
    </div>
  );
}

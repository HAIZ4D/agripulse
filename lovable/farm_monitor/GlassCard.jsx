import { cn } from "@/lib/utils";

export default function GlassCard({ children, className, glow, delay = 0, hover = true, ...props }) {
  const glowClass = glow === 'primary' ? 'glow-primary' : glow === 'secondary' ? 'glow-secondary' : glow === 'accent' ? 'glow-accent' : glow === 'warning' ? 'glow-warning' : '';
  
  return (
    <div
      className={cn(
        "glass rounded-2xl p-6 animate-fade-in-up transition-all duration-300",
        hover && "hover:scale-[1.02] border-glow-hover",
        glowClass,
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
      {...props}
    >
      {children}
    </div>
  );
}

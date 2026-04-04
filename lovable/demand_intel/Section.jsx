import { cn } from '@/lib/utils'

const delays = [
  'animate-fade-up',
  'animate-fade-up-delay-1',
  'animate-fade-up-delay-2',
  'animate-fade-up-delay-3',
  'animate-fade-up-delay-4',
]

export function Section({ children, delay = 0, className = '' }) {
  return (
    <div
      className={cn(
        'glow-card rounded-2xl p-7 relative overflow-hidden',
        delays[delay] || 'animate-fade-up',
        className
      )}
    >
      {/* Inner gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.025] via-transparent to-transparent pointer-events-none" />
      {/* Top edge highlight */}
      <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-primary/10 to-transparent pointer-events-none" />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}

export function SectionHeading({ icon: Icon, children, subtitle }) {
  return (
    <div className="mb-6">
      <h2 className="flex items-center gap-3 text-[15px] font-bold text-foreground tracking-tight">
        {Icon && (
          <span className="relative">
            <span className="absolute inset-0 rounded-xl bg-primary/10 blur-md" />
            <span className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-primary/12 border border-primary/18">
              <Icon className="w-[18px] h-[18px] text-primary" />
            </span>
          </span>
        )}
        {children}
      </h2>
      {subtitle && (
        <p className="text-xs text-muted-foreground/70 mt-1.5 ml-12 font-medium">{subtitle}</p>
      )}
    </div>
  )
}

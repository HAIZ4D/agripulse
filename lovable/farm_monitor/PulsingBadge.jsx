export default function PulsingBadge({ label = "LIVE", color = "primary" }) {
  const colors = {
    primary: "bg-primary/20 text-primary",
    secondary: "bg-secondary/20 text-secondary",
    warning: "bg-orange-500/20 text-orange-400",
  };
  const dotColors = {
    primary: "bg-primary",
    secondary: "bg-secondary",
    warning: "bg-orange-500",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wider ${colors[color]}`}>
      <span className={`relative w-2 h-2 rounded-full ${dotColors[color]}`}>
        <span className={`absolute inset-0 rounded-full ${dotColors[color]} animate-ping opacity-75`} />
      </span>
      {label}
    </span>
  );
}

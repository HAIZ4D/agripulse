import { useState, useEffect } from "react";

export default function AnimatedCounter({ value, duration = 1500, decimals = 0, suffix = "" }) {
  const [display, setDisplay] = useState(0);
  const numericValue = parseFloat(value) || 0;

  useEffect(() => {
    let start = 0;
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(numericValue * eased);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [numericValue, duration]);

  return (
    <span className="tabular-nums font-bold">
      {display.toFixed(decimals)}{suffix}
    </span>
  );
}

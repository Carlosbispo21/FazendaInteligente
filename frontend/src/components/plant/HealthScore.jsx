import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { healthLabel } from "@/lib/plantData";

export default function HealthScore({ score }) {
  const [display, setDisplay] = useState(0);
  const meta = healthLabel(score);
  const r = 52;
  const circ = 2 * Math.PI * r;

  useEffect(() => {
    const start = performance.now();
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / 900);
      setDisplay(Math.round(score * easeOut(p)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const offset = circ - (display / 100) * circ;

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-32 w-32">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke="#F1F5F4"
            strokeWidth="10"
          />
          <motion.circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke={meta.color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-stone-800 tabular-nums">
            {display}%
          </span>
          <span className="text-[11px] text-stone-400 font-medium">Saúde</span>
        </div>
      </div>
      <span
        className="mt-1 text-sm font-semibold"
        style={{ color: meta.color }}
      >
        {meta.label}
      </span>
    </div>
  );
}

function easeOut(p) {
  return 1 - Math.pow(1 - p, 3);
}

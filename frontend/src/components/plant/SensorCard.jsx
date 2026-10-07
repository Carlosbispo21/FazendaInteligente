import React from "react";
import { motion } from "framer-motion";
import { Droplets, Zap, Thermometer } from "lucide-react";
import { STATUS_META } from "@/lib/plantData";

const ICONS = { humidity: Droplets, ec: Zap, temperature: Thermometer };
const UNITS = { humidity: "%", ec: " µS/cm", temperature: "°C" };
const COLORS = { humidity: "#4FC3F7", ec: "#FBC02D", temperature: "#FB8C00" };

export default function SensorCard({ metric, value, status }) {
  const Icon = ICONS[metric];
  const meta = STATUS_META[status];
  const color = COLORS[metric];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-stone-100"
    >
      <div
        className="flex h-11 w-11 items-center justify-center rounded-xl"
        style={{ background: `${color}1A` }}
      >
        <Icon size={22} style={{ color }} />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-stone-400 font-semibold">
          {metric === "ec"
            ? "CE"
            : metric === "humidity"
              ? "Umidade"
              : "Temperatura"}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold text-stone-800 tabular-nums">
            {value}
          </span>
          <span className="text-xs text-stone-400">{UNITS[metric]}</span>
        </div>
      </div>
      <div
        className="ml-auto rounded-full px-2.5 py-1 text-[11px] font-semibold"
        style={{ background: meta.soft, color: meta.color }}
      >
        {meta.label}
      </div>
    </motion.div>
  );
}

import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
  ComposedChart,
} from "recharts";
import { STATUS_META } from "@/lib/plantData";

function CustomTooltip({ active, payload, unit, metric }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  const meta = STATUS_META[p.status];
  const statusText =
    p.status === "unknown" ? "Limites da cultura não configurados" : p.status === "ideal"
      ? "No nível ideal"
      : p.status === "low"
        ? "Um pouco abaixo do ideal"
        : p.status === "high"
          ? "Um pouco acima do ideal"
          : "Fora do intervalo ideal";
  return (
    <div className="rounded-xl bg-white px-3 py-2 shadow-lg border border-stone-100">
      <div className="text-[11px] text-stone-400 font-medium">{p.label}</div>
      <div className="text-sm font-bold text-stone-800">
        {metric === "ec"
          ? "CE"
          : metric === "humidity"
            ? "Umidade"
            : "Temperatura"}
      </div>
      <div
        className="text-lg font-bold tabular-nums"
        style={{ color: meta.color }}
      >
        {p.value}
        {unit}
      </div>
      <div className="text-[11px]" style={{ color: meta.color }}>
        {statusText}
      </div>
    </div>
  );
}

export default function SensorLineChart({
  data,
  color,
  unit,
  metric,
  height = 220,
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart
        data={data}
        margin={{ top: 10, right: 12, left: -18, bottom: 0 }}
      >
        <defs>
          <linearGradient id={`grad-${metric}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#F1F5F4"
          vertical={false}
        />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "#A8A29E" }}
          axisLine={false}
          tickLine={false}
          minTickGap={28}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#A8A29E" }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip content={<CustomTooltip unit={unit} metric={metric} />} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={false}
          fill={`url(#grad-${metric})`}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5, strokeWidth: 0 }}
          animationDuration={900}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

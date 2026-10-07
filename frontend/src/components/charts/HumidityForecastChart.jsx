import React from "react";
import { ResponsiveContainer, ComposedChart, Line, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ReferenceDot } from "recharts";
import { humidityPlot } from "@/lib/humidityPlot";
import { timeLabel } from "@/lib/monitoring";

export default function HumidityForecastChart({ history, predictions = [], waterings = [], minimum, highlight }) {
  const points = humidityPlot(history, predictions, waterings);
  if (!points.length) return <p className="py-6 text-sm text-stone-500">Aguardando dados para montar o gráfico.</p>;
  return <div className="mt-4" role="img" aria-label="Histórico de umidade, previsões da IA, regas detectadas e limite mínimo da cultura">
    <ResponsiveContainer width="100%" height={340}>
      <ComposedChart data={points} margin={{ top: 20, right: 25, bottom: 15, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
        <XAxis dataKey="time" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={(time) => timeLabel(time)} tick={{ fontSize: 10 }} minTickGap={55} />
        <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} width={45} />
        <Tooltip labelFormatter={(time) => timeLabel(time)} formatter={(value, name) => [`${Number(value).toFixed(1)}%`, name]} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {Number.isFinite(minimum) && <ReferenceLine y={minimum} stroke="#a8a29e" strokeDasharray="4 4" label={{ value: `Mínimo ${minimum}%`, position: "insideBottomLeft", fontSize: 11, fill: "#78716c" }} />}
        <Line dataKey="measured" name="Medida" type="linear" stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
        <Line dataKey="predicted" name="Prevista (IA)" type="linear" stroke="#f97316" strokeWidth={2} strokeDasharray="6 5" dot={{ r: 4 }} connectNulls isAnimationActive={false} />
        <Scatter dataKey="watering" name="Rega detectada" fill="#10b981" shape="triangle" isAnimationActive={false} />
        {highlight && <ReferenceDot x={Date.parse(highlight.timestamp_alvo)} y={highlight.umidade_prevista} r={7} fill="#f97316" stroke="#9a3412" strokeWidth={2} />}
      </ComposedChart>
    </ResponsiveContainer>
  </div>;
}

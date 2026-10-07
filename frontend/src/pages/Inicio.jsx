import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useSensor } from "@/lib/SensorContext";
import {
  computePlantState,
  computeHealthScore,
  getStatus,
  STATUS_META,
  PERIODS,
} from "@/lib/plantData";
import PlantMascot from "@/components/plant/PlantMascot";
import SpeechBubble from "@/components/plant/SpeechBubble";
import SensorCard from "@/components/plant/SensorCard";
import HealthScore from "@/components/plant/HealthScore";
import EventTimeline from "@/components/plant/EventTimeline";
import HumidityChart from "@/components/charts/HumidityChart";
import ECChart from "@/components/charts/ECChart";
import TemperatureChart from "@/components/charts/TemperatureChart";
import { useHistory, useAnalysis } from "@/lib/useMonitoringData";
import { makeSeries, timeLabel } from "@/lib/monitoring";
import { exportUrl } from "@/api/fazendaClient";

export default function Inicio() {
  const { readings, culture: savedCulture, watering, experimentId, now } =
    useSensor();
  const culture = savedCulture || { name: "Planta monitorada", emoji: "🌱", complete: false,
    ranges: { humidity: [null, null], temperature: [null, null], ec: [null, null] } };
  const [period, setPeriod] = useState("24h");
  const history = useHistory(period);
  const analysis = useAnalysis();
  const ready = readings && culture?.complete;

  const { state, issues } = useMemo(
    () => ready ? computePlantState(readings, culture) : { state: "unknown", issues: [] },
    [readings, culture, ready],
  );
  const score = useMemo(
    () => ready ? computeHealthScore(readings, culture) : null,
    [readings, culture, ready],
  );
  const events = useMemo(() => {
    return [
      ...(analysis.data?.alerts || []).map((a) => ({ timestamp: a.timestamp, text: a.descricao, icon: "⚠️", tone: "yellow" })),
      ...(analysis.data?.waterings || []).map((r) => ({ timestamp: r.timestamp, text: `Rega detectada: ${r.umidade_antes}% → ${r.umidade_depois}%`, icon: "💧", tone: "blue" })),
    ].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)).slice(0, 8)
      .map((e) => ({ ...e, time: timeLabel(e.timestamp) }));
  }, [analysis.data, now]);

  const series = useMemo(
    () => ({
      humidity: makeSeries(history.data || [], culture, "humidity", period),
      ec: makeSeries(history.data || [], culture, "ec", period),
      temperature: makeSeries(history.data || [], culture, "temperature", period),
    }),
    [period, culture, history.data],
  );

  if (!readings) return <p className="rounded-3xl bg-white p-6 text-stone-600">Aguardando leituras do sensor. Os indicadores aparecerão quando a API receber dados.</p>;

  const statuses = {
    humidity: ready ? getStatus(readings.humidity, culture.ranges.humidity) : "unknown",
    ec: ready ? getStatus(readings.ec, culture.ranges.ec) : "unknown",
    temperature: ready ? getStatus(readings.temperature, culture.ranges.temperature) : "unknown",
  };

  const heroText =
    !ready ? "Configure os limites da cultura na API para avaliar a saúde da planta." : state === "healthy"
      ? `Seu ${culture.name} está feliz hoje!`
      : state === "critical"
        ? `Seu ${culture.name} precisa de atenção`
        : `Seu ${culture.name} precisa de cuidados`;

  return (
    <div className="space-y-8">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-b from-emerald-50/80 to-[#FAFAF7] px-4 pt-8 pb-10 sm:pt-12">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-emerald-100/60 blur-2xl" />
        <div className="relative flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <PlantMascot
              state={watering ? "celebrating" : state}
              culture={ready ? culture : undefined}
              readings={ready ? readings : undefined}
              watering={watering}
              size={260}
            />
          </motion.div>
          <div className="mt-2 min-h-[64px] w-full flex justify-center">
            {ready && <SpeechBubble state={state} watering={watering} />}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-2xl">{culture.emoji}</span>
            <span className="text-lg font-bold text-stone-800">
              {culture.name}
            </span>
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{
                background:
                  STATUS_META[
                    !ready ? "unknown" : state === "healthy" ? "ideal" : issues[0]?.status || "low"
                  ].soft,
                color:
                  STATUS_META[
                    !ready ? "unknown" : state === "healthy" ? "ideal" : issues[0]?.status || "low"
                  ].color,
              }}
            >
              {!ready ? "Sem limites" : state === "healthy" ? "Saudável" : "Atenção"}
            </span>
          </div>
          <p className="mt-1 text-stone-500 text-sm">{heroText}</p>

          {ready && readings.humidity < culture.ranges.humidity[0] && <p className="mt-4 text-sky-700">Umidade abaixo do mínimo. Verifique a necessidade de rega no local.</p>}
        </div>
      </section>

      {/* INDICADORES + SAÚDE */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-center">
        <div className="space-y-3 lg:col-span-3">
          <SensorCard
            metric="humidity"
            value={readings.humidity}
            status={statuses.humidity}
          />
          <SensorCard metric="ec" value={readings.ec} status={statuses.ec} />
          <SensorCard
            metric="temperature"
            value={readings.temperature}
            status={statuses.temperature}
          />
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="rounded-3xl bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-stone-100 flex flex-col items-center justify-center"
        >
          {ready ? <HealthScore score={score} /> : <span className="text-stone-500">Aguardando limites</span>}
          <span className="text-xs text-stone-400 mt-1">Saúde da planta</span>
        </motion.div>
      </section>

      {/* HISTÓRICO */}
      <section>
        <h2 className="text-lg font-bold text-stone-800">
          Como minha planta está se comportando?
        </h2>
        <div className="mt-3 inline-flex rounded-full bg-stone-100 p-1">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                period === p.id
                  ? "bg-white text-stone-800 shadow-sm"
                  : "text-stone-500"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap justify-between gap-2 text-sm text-stone-500">
          <span>{history.isPending ? "Carregando histórico…" : history.error?.message || `${history.data?.length || 0} leituras no período`}</span>
          <a className="font-semibold text-emerald-700 underline" href={exportUrl(experimentId)}>Baixar dados em CSV</a>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <ChartBlock title="Umidade 💧">
            <HumidityChart data={series.humidity} />
          </ChartBlock>
          <ChartBlock title="CE ⚡">
            <ECChart data={series.ec} />
          </ChartBlock>
          <ChartBlock title="Temperatura 🌡️">
            <TemperatureChart data={series.temperature} />
          </ChartBlock>
        </div>
      </section>

      {/* EVENTOS */}
      <section className="rounded-3xl bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-stone-100">
        <h2 className="text-lg font-bold text-stone-800 mb-4">Eventos recentes</h2>
        {analysis.error ? <p className="text-amber-700">{analysis.error.message}</p> : events.length ? <EventTimeline events={events} /> : <p className="text-sm text-stone-500">Nenhum alerta ou rega detectada no histórico.</p>}
      </section>

    </div>
  );
}

function ChartBlock({ title, children, className = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className={`rounded-3xl bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-stone-100 ${className}`}
    >
      <div className="text-sm font-semibold text-stone-700 mb-2">{title}</div>
      {children}
    </motion.div>
  );
}

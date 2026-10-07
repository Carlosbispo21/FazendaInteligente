import React from "react";
import { useSensor } from "@/lib/SensorContext";
import { timeLabel } from "@/lib/monitoring";
import { sensorStatus } from "@/lib/modelQuality";

export default function MonitoringStatus() {
  const { latest, experiment, error, loading, refresh, fetching, now } = useSensor();
  const status = sensorStatus({ now, timestamp: latest?.timestamp, error, loading });
  const healthy = status.type === "online";
  return <div role="status" className={`mb-5 rounded-2xl border px-4 py-3 text-sm ${healthy ? "border-emerald-100 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="flex items-center gap-2"><span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${healthy ? "bg-emerald-500" : "bg-amber-500"}`} /><strong>{status.label}</strong>{status.ageMinutes != null && <span>· {status.ageMinutes === 0 ? "há menos de 1 minuto" : `há ${status.ageMinutes} minutos`}</span>}</span>
      <button onClick={() => refresh()} disabled={fetching} className="font-semibold underline disabled:opacity-50">{fetching ? "Atualizando…" : "Atualizar"}</button>
    </div>
    <p className="mt-1 text-xs">{experiment?.nome}{latest && ` · Última leitura: ${timeLabel(latest.timestamp)} (Brasília)`}</p>
    {error && <p className="mt-2 text-xs">{error}{latest && " Exibindo a última leitura recebida."}</p>}
  </div>;
}
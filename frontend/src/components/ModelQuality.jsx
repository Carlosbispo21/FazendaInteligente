import React from "react";
import { modelQuality } from "@/lib/modelQuality";

export default function ModelQuality({ metrics }) {
  if (!metrics.length) return null;
  const results = metrics.map((metric) => ({ metric, ...modelQuality(metric) }));
  const wins = results.filter((item) => item.winner === "forest").length;
  return <div className="mt-4">
    <p className={`rounded-2xl p-4 text-sm ${wins === results.length ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
      <strong>Random Forest supera a persistência em {wins} de {results.length} horizontes.</strong> A persistência prevê que a umidade permanecerá igual à última medição. A comparação usa o RMSE da validação temporal; não é uma garantia de acerto da próxima previsão.
    </p>
    <div className="mt-3 grid gap-3 sm:grid-cols-3">{results.map(({ metric, winner, improvement }) => <div key={metric.horizonte_h} className="rounded-2xl border border-stone-100 p-4 text-sm">
      <p className="font-semibold text-stone-700">Horizonte {metric.horizonte_h} h</p>
      <p className="mt-2 text-stone-500">Erro RF: {metric.rmse.toFixed(2)} p.p.</p><p className="text-stone-500">Erro persistência: {metric.rmse_persistencia.toFixed(2)} p.p.</p>
      <p className={`mt-2 font-semibold ${winner === "forest" ? "text-emerald-700" : "text-amber-700"}`}>{winner === "forest" ? "Menor erro: Random Forest" : winner === "persistence" ? "Menor erro: persistência" : winner === "tie" ? "Erros equivalentes" : "Comparação indisponível"}</p>
      {improvement != null && <p className="mt-1 text-xs text-stone-500">{improvement >= 0 ? `Redução do erro: ${improvement.toFixed(1)}%` : `Erro RF ${Math.abs(improvement).toFixed(1)}% maior`}</p>}
    </div>)}</div>
  </div>;
}

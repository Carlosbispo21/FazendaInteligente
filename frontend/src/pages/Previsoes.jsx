import React from "react";
import { useSensor } from "@/lib/SensorContext";
import { useAnalysis, useHistory } from "@/lib/useMonitoringData";
import { wateringAdvice, timeLabel, makeSeries } from "@/lib/monitoring";
import HumidityForecastChart from "@/components/charts/HumidityForecastChart";
import ModelQuality from "@/components/ModelQuality";
import { Droplets, Brain } from "lucide-react";

export default function Previsoes() {
  const { latest, culture, error, now } = useSensor();
  const analysis = useAnalysis();
  const history = useHistory("48h");
  const { forecast, metrics = [], waterings = [] } = analysis.data || {};
  const advice = wateringAdvice(latest, culture, forecast, now);
  const messages = {
    unconfigured: "Aguardando leitura e limite mínimo de umidade da cultura.",
    stale: "A leitura do sensor está atrasada. Aguarde uma nova medição para avaliar a rega.",
    now: "A umidade medida está abaixo do mínimo. Verifique a necessidade de rega agora.",
    waiting: "Ainda não há previsões disponíveis. O job de IA precisa de histórico suficiente para treinar.",
    staleForecast: "A previsão disponível está desatualizada. Aguarde a próxima execução do modelo.",
    predicted: `A umidade está prevista abaixo do mínimo em ${advice.timestamp_alvo ? timeLabel(advice.timestamp_alvo) : ""}.`,
    within: `Nenhuma queda abaixo do mínimo prevista nos horizontes disponíveis até ${advice.until ? timeLabel(advice.until) : ""}.`,
  };
  return <div className="space-y-6">
    <header className="text-center"><h1 className="text-3xl font-bold text-stone-800">Previsões do monitoramento</h1><p className="mt-2 text-stone-500">Random Forest treinado com o histórico real dos sensores.</p></header>
    <section className="rounded-3xl border border-sky-100 bg-sky-50 p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold text-sky-800"><Droplets size={20} /> Próxima necessidade de rega</h2>
      <p className="mt-3 text-stone-700">{error || analysis.error?.message || (analysis.isPending ? "Consultando previsões…" : messages[advice.status])}</p>
      <p className="mt-3 text-xs text-stone-500">A estimativa usa o primeiro horizonte previsto abaixo do limite da cultura; não representa um horário exato nem aciona irrigação.</p>
      {forecast?.timestamp_geracao && <p className="mt-2 text-xs text-stone-500">Modelo executado em {timeLabel(forecast.timestamp_geracao)} (Brasília).</p>}
    </section>
    <section className="rounded-3xl border border-stone-100 bg-white p-6">
      <h2 className="text-lg font-bold text-stone-800">Quando a umidade pode chegar ao mínimo?</h2>
      <p className="mt-2 text-sm text-stone-500">Medições das últimas 48 horas e previsões nos horizontes disponíveis, até 24 horas.</p>
      {history.error ? <p className="mt-3 text-sm text-amber-700">{history.error.message}</p> : history.isPending ? <p className="mt-3 text-sm text-stone-500">Carregando histórico…</p> : <HumidityForecastChart history={makeSeries(history.data || [], culture, "humidity", "48h")} predictions={forecast?.predicoes} waterings={waterings} minimum={culture?.ranges.humidity[0]} highlight={advice.status === "predicted" ? advice : null} />}
      {advice.status === "predicted" && <p className="mt-3 text-sm font-semibold text-orange-700">Possível necessidade de rega até {timeLabel(advice.timestamp_alvo)} — primeiro horizonte previsto abaixo do mínimo.</p>}
      {advice.status === "within" && <p className="mt-3 text-sm text-emerald-700">Sem queda abaixo do mínimo nos horizontes disponíveis.</p>}
      {(advice.status === "stale" || advice.status === "staleForecast") && <p className="mt-3 text-sm text-amber-700">Dados desatualizados: o gráfico mostra os últimos resultados disponíveis.</p>}
      <h3 className="mt-5 font-semibold text-stone-800">Umidade prevista por horizonte</h3>
      {forecast?.predicoes?.length ? <div className="mt-4 grid gap-3 sm:grid-cols-3">{forecast.predicoes.map((p) => <div key={p.horizonte_h} className="rounded-2xl bg-stone-50 p-4"><p className="text-sm text-stone-500">Horizonte {p.horizonte_h} h · {timeLabel(p.timestamp_alvo)}</p><p className="mt-2 text-2xl font-bold text-sky-700">{p.umidade_prevista.toFixed(1)}%</p></div>)}</div> : <p className="mt-3 text-sm text-stone-500">Nenhuma previsão gerada. Os horizontes de 1, 3, 6, 12 e 24 horas são liberados conforme os dados permitem validação temporal.</p>}
    </section>
    <section className="rounded-3xl border border-stone-100 bg-white p-6 overflow-x-auto">
      <h2 className="flex items-center gap-2 text-lg font-bold text-violet-700"><Brain size={20} /> Validação do modelo</h2>
      <ModelQuality metrics={metrics} />
      {metrics.length ? <table className="mt-4 w-full text-left text-sm"><thead><tr>{["Horizonte", "Amostras", "RMSE (p.p.)", "MAE (p.p.)", "R²", "RMSE persistência"].map((h) => <th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>{metrics.map((m) => <tr key={m.horizonte_h} className="border-t"><td className="p-2">{m.horizonte_h} h</td><td className="p-2">{m.n_amostras}</td><td className="p-2">{m.rmse.toFixed(2)}</td><td className="p-2">{m.mae.toFixed(2)}</td><td className="p-2">{m.r2?.toFixed(3) ?? "—"}</td><td className="p-2">{m.rmse_persistencia.toFixed(2)}</td></tr>)}</tbody></table> : <p className="mt-3 text-sm text-stone-500">Nenhum treino registrado ainda.</p>}
      <p className="mt-3 text-xs text-stone-500">Validação temporal em 5 divisões e comparação com persistência. Valores menores de RMSE e MAE indicam menor erro.</p>
    </section>
    <section className="rounded-3xl border border-stone-100 bg-white p-6"><h2 className="text-lg font-bold text-stone-800">Últimas regas detectadas</h2>{waterings.length ? <ul className="mt-3 space-y-2 text-sm text-stone-600">{waterings.slice(-5).reverse().map((r) => <li key={r.timestamp}>{timeLabel(r.timestamp)} · Umidade {r.umidade_antes}% → {r.umidade_depois}%</li>)}</ul> : <p className="mt-3 text-sm text-stone-500">Nenhuma subida de umidade identificada como rega.</p>}</section>
  </div>;
}

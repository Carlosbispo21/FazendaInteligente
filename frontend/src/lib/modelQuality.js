export function modelQuality(metric) {
  if (!Number.isFinite(metric.rmse) || !Number.isFinite(metric.rmse_persistencia)) return { winner: "unknown", improvement: null };
  const baseline = metric.rmse_persistencia;
  const improvement = baseline > 0 ? (baseline - metric.rmse) / baseline * 100 : null;
  return { winner: metric.rmse < baseline ? "forest" : metric.rmse > baseline ? "persistence" : "tie", improvement };
}

export function sensorStatus({ now, timestamp, error, loading }) {
  if (error) return { type: "offline", label: "API indisponível" };
  if (loading) return { type: "loading", label: "Conectando" };
  if (!timestamp) return { type: "empty", label: "Aguardando sensor" };
  const ageMinutes = Math.max(0, Math.floor((now - Date.parse(timestamp)) / 60000));
  if (!Number.isFinite(ageMinutes)) return { type: "stale", label: "Horário da leitura inválido" };
  return { type: ageMinutes > 30 ? "stale" : "online", label: ageMinutes > 30 ? "Coleta atrasada" : "Sensor atualizado", ageMinutes };
}

export const timeLabel = (timestamp, options = {}) => new Date(timestamp).toLocaleString("pt-BR", {
  timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", ...options,
});

export function mapReadings(row) {
  return row ? { humidity: row.umidade, temperature: row.temperatura, ec: row.ce } : null;
}

export function mapCulture(row) {
  if (!row) return null;
  const ranges = { humidity: [row.umidade_min, row.umidade_max], ec: [row.ce_min, row.ce_max], temperature: [row.temperatura_min, row.temperatura_max] };
  const complete = Object.values(ranges).every(([min, max]) => Number.isFinite(min) && Number.isFinite(max) && min <= max);
  return { id: row.id_cultura, name: row.nome, emoji: "🌱", ranges, complete };
}

export function makeSeries(rows, culture, metric, period) {
  const fields = { humidity: "umidade", temperature: "temperatura", ec: "ce" };
  return rows.map((row) => {
    const range = culture?.ranges[metric];
    const value = row[fields[metric]];
    let status = "unknown";
    if (range?.every(Number.isFinite)) {
      status = "ideal";
      if (value < range[0]) status = value < range[0] * 0.7 ? "critical" : "low";
      if (value > range[1]) status = value > range[1] * 1.15 ? "critical" : "high";
    }
    return { time: row.timestamp, label: timeLabel(row.timestamp, period === "24h" ? { day: undefined, month: undefined } : {}), value, status };
  });
}

export function wateringAdvice(latest, culture, forecast, now = Date.now()) {
  if (!latest || !culture || !Number.isFinite(culture.ranges.humidity[0])) return { status: "unconfigured" };
  const measuredAt = Date.parse(latest.timestamp);
  if (!Number.isFinite(measuredAt) || now - measuredAt > 3600000 || measuredAt > now + 300000) return { status: "stale" };
  const minimum = culture.ranges.humidity[0];
  if (latest.umidade < minimum) return { status: "now", minimum };
  const generatedAt = Date.parse(forecast?.timestamp_geracao);
  if (!Number.isFinite(generatedAt)) return { status: "waiting" };
  if (now - generatedAt > 7200000 || generatedAt > now + 300000 || measuredAt - generatedAt > 3600000) return { status: "staleForecast" };
  const future = (forecast.predicoes || []).filter((p) => Date.parse(p.timestamp_alvo) > now)
    .sort((a, b) => Date.parse(a.timestamp_alvo) - Date.parse(b.timestamp_alvo));
  if (!future.length) return { status: "staleForecast" };
  const next = future.find((p) => p.umidade_prevista < minimum);
  return next ? { status: "predicted", ...next, minimum } : { status: "within", until: future.at(-1).timestamp_alvo, minimum };
}

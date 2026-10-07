export function humidityPlot(history, predictions = [], waterings = []) {
  const points = new Map();
  const put = (time, values) => {
    if (!Number.isFinite(time)) return;
    points.set(time, { ...(points.get(time) || { time }), ...values });
  };
  for (const point of history) put(Date.parse(point.time), { measured: point.value });
  const measuredTimes = [...points.keys()].sort((a, b) => a - b);
  const last = measuredTimes.at(-1);
  const future = predictions.filter((p) => Date.parse(p.timestamp_alvo) > (last ?? -Infinity));
  if (future.length && last != null) put(last, { predicted: points.get(last).measured });
  for (const p of future) put(Date.parse(p.timestamp_alvo), { predicted: p.umidade_prevista });
  for (const r of waterings) {
    const time = Date.parse(r.timestamp);
    if (last != null && time >= measuredTimes[0] && time <= last) put(time, { watering: r.umidade_depois });
  }
  return [...points.values()].sort((a, b) => a.time - b.time);
}

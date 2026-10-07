import { cultureCatalog } from "./cultureCatalog.js";

export function demoCulture(id, sensorCulture) {
  const entry = cultureCatalog.find((c) => c.id === id);
  if (!entry) return sensorCulture;
  const ranges = {
    humidity: sensorCulture?.ranges.humidity || [null, null],
    ec: sensorCulture?.ranges.ec || [null, null],
    temperature: entry.temperature?.values || sensorCulture?.ranges.temperature || [null, null],
  };
  return { id: entry.id, name: entry.name, emoji: entry.emoji, ranges,
    complete: Object.values(ranges).every((range) => range.every(Number.isFinite)), demo: true };
}

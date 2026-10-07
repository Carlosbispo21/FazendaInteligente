export function readPreference(key, fallback) {
  try { return JSON.parse(localStorage.getItem(`fazenda:${key}`)) ?? fallback; }
  catch { return fallback; }
}
export function writePreference(key, value) {
  try { localStorage.setItem(`fazenda:${key}`, JSON.stringify(value)); }
  catch { /* Monitoring remains usable when browser storage is unavailable. */ }
}

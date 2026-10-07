import { cultureCatalog, findCatalogCulture } from "./cultureCatalog.js";
import { mapCulture } from "./monitoring.js";

// Fixed monitoring parameters supplied by the project owner.
export const fixedRanges = {
  tomate: { humidity: [60, 80], ec: [1500, 2500], temperature: [15, 28] },
  alface: { humidity: [60, 70], ec: [1000, 1800], temperature: [15, 24] },
  manjericao: { humidity: [60, 80], ec: [1000, 1600], temperature: [20, 28] },
  pimenta: { humidity: [60, 80], ec: [1800, 2500], temperature: [21, 29] },
  cenoura: { humidity: [60, 80], ec: [1500, 2000], temperature: [15, 21] },
  morango: { humidity: [60, 75], ec: [1000, 1500], temperature: [15, 25] },
  rucula: { humidity: [60, 75], ec: [1200, 1800], temperature: [15, 22] },
  girassol: { humidity: [50, 70], ec: [1500, 2500], temperature: [20, 30] },
};

export function fixedCulture(id, profiles = []) {
  const entry = cultureCatalog.find((item) => item.id === id);
  if (!entry) return null;
  if (fixedRanges[id]) return { id, name: entry.name, emoji: entry.emoji,
    ranges: fixedRanges[id], complete: true, parameterSource: "project" };
  const saved = profiles.find((profile) => findCatalogCulture(profile.nome)?.id === id);
  if (saved) return { ...mapCulture(saved), name: entry.name, emoji: entry.emoji };
  // Published solution EC, depletion fractions and air temperatures are not
  // calibrated soil-probe limits. Keep missing operating limits explicit.
  return { id, name: entry.name, emoji: entry.emoji, complete: false,
    ranges: { humidity: [null, null], ec: [null, null], temperature: [null, null] }, reference: entry };
}

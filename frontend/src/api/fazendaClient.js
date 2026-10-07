export const experimentId = Number(import.meta.env.VITE_FAZENDA_EXPERIMENTO || 1);

export async function getFazenda(path, params = {}, { signal, optional = false } = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value != null));
  const response = await fetch(`/api/fazenda${path}?${query}`, { signal });
  if (optional && response.status === 404) return null;
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(response.status === 401 ? "A API recusou o token de acesso. Verifique FAZENDA_API_TOKEN." : body.detail || `Erro na API (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export const exportUrl = (id) => `/api/fazenda/leituras/export.csv?id_experimento=${id}`;

export async function saveFazenda(path, method, data) {
  const response = await fetch(`/api/fazenda${path}`, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof result.detail === "string" ? result.detail : `Não foi possível salvar (${response.status}).`);
  return result;
}

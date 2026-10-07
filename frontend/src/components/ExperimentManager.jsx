import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSensor } from "@/lib/SensorContext";
import { saveFazenda } from "@/api/fazendaClient";
import { findCatalogCulture } from "@/lib/cultureCatalog";

export default function ExperimentManager() {
  const { experiments, experimentId, experiment, selectExperiment, experimentApiSupported, experimentsError, culture, cultures } = useSensor();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [manualId, setManualId] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const create = async (event) => {
    event.preventDefault();
    if (!culture?.complete || !name.trim() || !experimentApiSupported) return;
    setSaving(true); setMessage("");
    try {
      const catalog = findCatalogCulture(culture.name);
      let profile = cultures.find((item) => item.nome === `Perfil fixo: ${culture.name}`);
      if (!profile && !culture.parameterSource) profile = cultures.find((item) => item.id_cultura === culture.id);
      if (!profile) {
        const ranges = culture.ranges;
        profile = await saveFazenda("/culturas", "POST", { nome: `Perfil fixo: ${culture.name}`, umidade_min: ranges.humidity[0], umidade_max: ranges.humidity[1], ce_min: ranges.ec[0], ce_max: ranges.ec[1], temperatura_min: ranges.temperature[0], temperatura_max: ranges.temperature[1] });
      }
      const result = await saveFazenda("/experimentos", "POST", { nome: name.trim(), id_cultura: profile.id_cultura, data_inicio: new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }) });
      selectExperiment(result.id_experimento);
      await queryClient.invalidateQueries({ queryKey: ["experiments"] });
      setName("");
      setMessage(`Experimento ${result.id_experimento} criado para ${catalog?.name || culture.name}. Configure o sensor para enviar id_experimento=${result.id_experimento}.`);
    } catch (error) { setMessage(error.message); }
    finally { setSaving(false); }
  };
  const options = experiments.some((item) => item.id_experimento === experimentId) ? experiments : [{ id_experimento: experimentId, nome: experiment?.nome || `Experimento ${experimentId}` }, ...experiments];
  return <details className="mb-5 rounded-2xl border border-stone-100 bg-white p-4">
    <summary className="cursor-pointer text-sm font-semibold text-stone-700">Experimento: {experiment?.nome || experimentId}</summary>
    <div className="mt-4 space-y-4">
      <label className="block text-sm text-stone-600">Selecionar experimento<select value={experimentId} onChange={(e) => selectExperiment(Number(e.target.value))} className="mt-2 w-full rounded-lg border border-stone-200 p-2">{options.map((item) => <option key={item.id_experimento} value={item.id_experimento}>{item.nome} · #{item.id_experimento}</option>)}</select></label>
      {experimentsError && <p className="text-sm text-amber-700">{experimentsError}</p>}
      {experimentApiSupported === false && <div className="text-sm text-stone-500"><p>A API atual precisa ser atualizada para listar e criar experimentos. Você pode acessar um experimento existente pelo número:</p><form onSubmit={(e) => { e.preventDefault(); selectExperiment(Number(manualId)); }} className="mt-2 flex gap-2"><input aria-label="Número do experimento existente" type="number" min="1" required value={manualId} onChange={(e) => setManualId(e.target.value)} className="w-28 rounded-lg border p-2" /><button className="rounded-lg bg-stone-100 px-3">Abrir</button></form></div>}
      <form onSubmit={create} className="border-t border-stone-100 pt-4"><h3 className="text-sm font-semibold text-stone-700">Novo experimento para {culture?.name || "a cultura selecionada"}</h3><p className="mt-1 text-xs text-stone-500">Cada experimento guarda suas próprias leituras, alertas e treinos. Depois da criação, o sensor precisa enviar o número do novo experimento.</p><div className="mt-3 flex flex-wrap gap-2"><input aria-label="Nome do novo experimento" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Alface — vaso 2" className="min-w-0 flex-1 rounded-lg border border-stone-200 p-2 text-sm" /><button disabled={saving || !experimentApiSupported || !culture?.complete || !name.trim()} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Criando…" : "Criar experimento"}</button></div></form>
      {message && <p role="status" className="text-sm text-stone-600">{message}</p>}
    </div>
  </details>;
}

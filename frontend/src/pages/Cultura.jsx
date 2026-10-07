import React from "react";
import { useSensor } from "@/lib/SensorContext";
import { cultureCatalog, findCatalogCulture } from "@/lib/cultureCatalog";
import CultureSelector from "@/components/plant/CultureSelector";

const fields = [
  { key: "umidade", label: "Umidade do sensor", unit: "%", min: 0, max: 100 },
  { key: "ce", label: "CE do sensor", unit: "µS/cm", min: 0 },
  { key: "temperatura", label: "Temperatura do sensor", unit: "°C" },
];
const format = (values, unit) => `${values.map((v) => v.toLocaleString("pt-BR")).join(values.length === 2 ? " – " : ", ")} ${unit}`;

export default function Cultura() {
  const { culture, experiment, selectCulture } = useSensor();
  const current = findCatalogCulture(culture?.name);
  const selected = cultureCatalog.find((c) => c.id === (current?.id || "callisia"));
  return <div className="space-y-6">
    <header className="text-center"><h1 className="text-2xl font-bold text-stone-800">Escolha sua cultura</h1><p className="mt-2 text-sm text-stone-500">Monitoramento atual: {culture?.name || "sem cultura vinculada"} · {experiment?.nome}</p></header>
    <CultureSelector cultures={cultureCatalog} selectedId={selected.id} onSelect={selectCulture} />
    <Profile culture={culture} />
    <details className="rounded-3xl border border-stone-100 bg-white p-6">
      <summary className="cursor-pointer text-lg font-semibold text-stone-800">Referências agronômicas de {selected.name}</summary>
      <h2 className="mt-4 text-xl font-bold text-stone-800">{selected.emoji} {selected.name}</h2>
      <p className="mt-1 text-sm italic text-stone-500">{selected.scientificName}</p>
      {selected.note && <p className="mt-3 text-sm text-stone-600">{selected.note}</p>}
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <Reference title="Água no solo" citation={selected.moisture?.source}>
          {selected.moisture ? <><strong>Depleção de referência: {(selected.moisture.value * 100).toFixed(0)}% da água disponível</strong><p>{selected.moisture.context}</p></> : <p>A faixa em % depende do solo e da calibração do sensor. Não há um intervalo universal validado para este perfil.</p>}
        </Reference>
        <Reference title="Condutividade elétrica" citation={selected.ec?.source}>
          {selected.ec ? <><strong>{format(selected.ec.values, "µS/cm")}</strong><p>{selected.ec.context}</p></> : <p>Use limites calibrados para o sensor e o substrato do experimento.</p>}
        </Reference>
        <Reference title="Temperatura de referência" citation={selected.temperature?.source}>
          {selected.temperature ? <><strong>{format(selected.temperature.values, "°C")}</strong><p>{selected.temperature.context}</p></> : <p>Use os limites definidos e validados no experimento.</p>}
        </Reference>
      </div>
      <p className="mt-4 text-sm text-stone-500">As referências acima descrevem métodos e condições diferentes. Os alertas e a IA usam os parâmetros salvos no perfil da cultura.</p>
    </details>
    <details className="rounded-3xl border border-stone-100 bg-white p-6">
      <summary className="cursor-pointer text-lg font-semibold text-stone-800">Fontes dos parâmetros</summary>
      <p className="mt-2 text-sm text-stone-500">Referências gerais informadas pelo responsável pelo projeto para os limites fixos de cultivo.</p>
      <div className="mt-4 space-y-4 text-sm text-stone-600">
        <div><h3 className="font-semibold text-stone-800">Embrapa</h3><p>Manuais e boletins técnicos sobre hortaliças folhosas, incluindo alface e rúcula, e cultivo semi-hidropônico do morangueiro.</p></div>
        <div><h3 className="font-semibold text-stone-800">SciELO / Horticultura Brasileira</h3><p>Artigos sobre clima, manejo da solução nutritiva e umidade em rúcula, alface e Capsicum.</p></div>
        <div><h3 className="font-semibold text-stone-800">Universidades — teses e dissertações</h3>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li><strong>UNESP:</strong> biofortificação, hidroponia e salinidade da alface; desenvolvimento da cenoura.</li>
            <li><strong>UFERSA:</strong> manjericão hidropônico sob variação de salinidade.</li>
            <li><strong>UFRRJ e UFES:</strong> caracterização agronômica e exigências de pimentão e pimentas.</li>
            <li><strong>USP e UFLA:</strong> crescimento de mudas de morango e solução nutritiva da rúcula.</li>
          </ul>
        </div>
      </div>
      <p className="mt-4 text-xs text-stone-400">Os títulos, autores, anos e links dos trabalhos específicos ainda não foram informados. As fontes com links nos cards acima são referências complementares.</p>
    </details>
  </div>;
}

function Reference({ title, citation, children }) {
  return <div className="rounded-2xl bg-stone-50 p-4 text-sm text-stone-600"><h3 className="mb-3 font-semibold text-stone-800">{title}</h3><div className="space-y-2">{children}</div>{citation && <a className="mt-3 block text-xs text-emerald-700 underline" href={citation.url} target="_blank" rel="noreferrer">{citation.title}</a>}</div>;
}

function Profile({ culture }) {
  if (!culture) return null;
  return <section className="rounded-3xl border border-stone-100 bg-white p-6">
    <h2 className="text-lg font-bold text-stone-800">Limites fixos de {culture.name}</h2>
    <div className="mt-5 grid gap-4 sm:grid-cols-3">{fields.map((f) => {
      const metric = { umidade: "humidity", ce: "ec", temperatura: "temperature" }[f.key];
      const values = culture.ranges[metric];
      return <div key={f.key} className="rounded-2xl bg-stone-50 p-4"><p className="text-sm font-semibold text-stone-600">{f.label}</p><p className="mt-2 text-lg font-bold text-stone-800">{values.every(Number.isFinite) ? format(values, f.unit) : "A validar para a sonda"}</p></div>;
    })}</div>
    {!culture.complete && <p className="mt-4 text-sm text-stone-500">As referências desta cultura estão acima. Faltam limites compatíveis com o método da sonda para avaliar as leituras e recomendar rega.</p>}
  </section>;
}

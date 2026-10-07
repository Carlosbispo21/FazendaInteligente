import test from "node:test";
import assert from "node:assert/strict";
import { mapCulture, mapReadings, makeSeries, wateringAdvice } from "../src/lib/monitoring.js";
import { fazendaProxy } from "../server/fazendaProxy.js";
import { Readable } from "node:stream";
import { cultureCatalog, findCatalogCulture, validLimits } from "../src/lib/cultureCatalog.js";
import { demoCulture } from "../src/lib/demoCulture.js";
import { fixedCulture } from "../src/lib/fixedCulture.js";
import { humidityPlot } from "../src/lib/humidityPlot.js";
import { modelQuality, sensorStatus } from "../src/lib/modelQuality.js";
import { readPreference, writePreference } from "../src/lib/preferences.js";

const now = Date.parse("2026-10-07T12:00:00Z");

test("avalia erro sem transformar RMSE em confiança probabilística", () => {
  assert.equal(modelQuality({ rmse: 2, rmse_persistencia: 4 }).winner, "forest");
  assert.equal(modelQuality({ rmse: 2, rmse_persistencia: 4 }).improvement, 50);
  assert.equal(modelQuality({ rmse: 6, rmse_persistencia: 1 }).winner, "persistence");
  assert.equal(modelQuality({ rmse: 0, rmse_persistencia: 0 }).winner, "tie");
  assert.equal(modelQuality({ rmse: 0, rmse_persistencia: 0 }).improvement, null);
});
test("estado da coleta distingue erro, atraso e ausência de dados", () => {
  assert.equal(sensorStatus({ now, timestamp: "2026-10-07T11:55:00Z" }).type, "online");
  assert.equal(sensorStatus({ now, timestamp: "2026-10-07T10:00:00Z" }).ageMinutes, 120);
  assert.equal(sensorStatus({ now, timestamp: "2026-10-07T10:00:00Z" }).type, "stale");
  assert.equal(sensorStatus({ now, error: "Erro" }).type, "offline");
  assert.equal(sensorStatus({ now }).type, "empty");
});
test("preferências persistem por experimento e suportam armazenamento indisponível", (t) => {
  const values = new Map();
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value) } });
  t.after(() => { if (descriptor) Object.defineProperty(globalThis, "localStorage", descriptor); else delete globalThis.localStorage; });
  const preference = { experimentId: 2, cultures: { 1: "callisia", 2: "alface" } };
  writePreference("monitoring", preference);
  assert.deepEqual(readPreference("monitoring", {}), preference);
  values.set("fazenda:monitoring", "corrompido");
  assert.deepEqual(readPreference("monitoring", {}), {});
});
test("proxy encaminha criação de experimento sem modificar leituras", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "http://sensor.test/experimentos");
    assert.equal(options.method, "POST");
    return new Response(JSON.stringify({ id_experimento: 2 }), { status: 201 });
  });
  const handler = middleware({ FAZENDA_API_URL: "http://sensor.test", FAZENDA_API_TOKEN: "teste-local" });
  assert.equal((await invoke(handler, "/experimentos", "POST", { nome: "Vaso 2", id_cultura: 1, data_inicio: "2026-10-07" })).status, 201);
});

test("gráfico conecta previsão após a última medição e mantém datas das regas", () => {
  const history = [{ time: "2026-10-07T10:00:00Z", value: 60 }, { time: "2026-10-07T11:00:00Z", value: 80 }];
  const points = humidityPlot(history, [
    { timestamp_alvo: "2026-10-07T10:30:00Z", umidade_prevista: 59 },
    { timestamp_alvo: "2026-10-07T12:00:00Z", umidade_prevista: 75 },
  ], [{ timestamp: "2026-10-07T11:00:00Z", umidade_depois: 80 }]);
  assert.equal(points.length, 3);
  assert.equal(points[1].measured, 80);
  assert.equal(points[1].predicted, 80);
  assert.equal(points[1].watering, 80);
  assert.equal(points[2].predicted, 75);
  assert.equal(points[2].measured, undefined);
  assert.deepEqual(humidityPlot([], [], []), []);
});

test("seleção carrega perfil próprio sem herdar limites de outra espécie", () => {
  const profiles = [{ id_cultura: 1, nome: "Callisia fragrans", umidade_min: 45, umidade_max: 80, ce_min: 160, ce_max: 400, temperatura_min: 18, temperatura_max: 28 }];
  assert.equal(fixedCulture("callisia", profiles).complete, true);
  assert.deepEqual(fixedCulture("callisia", profiles).ranges.ec, [160, 400]);
  assert.equal(fixedCulture("tomate", profiles).complete, true);
  assert.deepEqual(fixedCulture("tomate", profiles).ranges, { humidity: [60, 80], ec: [1500, 2500], temperature: [15, 28] });
});

test("proxy permite criar e atualizar parâmetros de cultura", async (t) => {
  const limits = { umidade_min: 45, umidade_max: 80, ce_min: 160, ce_max: 400, temperatura_min: 18, temperatura_max: 28 };
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.ok(url === "http://sensor.test/culturas" || url === "http://sensor.test/culturas/2");
    assert.deepEqual(JSON.parse(options.body), limits);
    return new Response(JSON.stringify({ id_cultura: 2, ...limits }), { status: options.method === "POST" ? 201 : 200 });
  });
  const handler = middleware({ FAZENDA_API_URL: "http://sensor.test", FAZENDA_API_TOKEN: "teste-local" });
  assert.equal((await invoke(handler, "/culturas", "POST", limits)).status, 201);
  assert.equal((await invoke(handler, "/culturas/2", "PATCH", limits)).status, 200);
});
const latest = { timestamp: "2026-10-07T11:55:00Z", umidade: 65, ce: 1800, temperatura: 24 };
const culture = mapCulture({ id_cultura: 1, nome: "Tomate", umidade_min: 60, umidade_max: 80, ce_min: 1500, ce_max: 2500, temperatura_min: 20, temperatura_max: 28 });
const forecast = { timestamp_geracao: "2026-10-07T11:59:00Z", predicoes: [
  { horizonte_h: 1, timestamp_alvo: "2026-10-07T12:55:00Z", umidade_prevista: 63 },
  { horizonte_h: 3, timestamp_alvo: "2026-10-07T14:55:00Z", umidade_prevista: 58 },
] };

test("todas as culturas podem demonstrar o monitoramento sem alterar o perfil real", () => {
  const original = JSON.stringify(culture);
  for (const entry of cultureCatalog) {
    const demo = demoCulture(entry.id, culture);
    assert.equal(demo.name, entry.name);
    assert.equal(demo.complete, true);
    assert.equal(demo.demo, true);
    assert.deepEqual(demo.ranges.humidity, culture.ranges.humidity);
    assert.deepEqual(demo.ranges.ec, culture.ranges.ec);
    assert.deepEqual(demo.ranges.temperature, entry.temperature?.values || culture.ranges.temperature);
  }
  assert.equal(JSON.stringify(culture), original);
  assert.equal(demoCulture("inexistente", culture), culture);
});

test("preserva CE em µS/cm e sinaliza perfil incompleto", () => {
  assert.deepEqual(mapReadings(latest), { humidity: 65, ec: 1800, temperature: 24 });
  assert.equal(culture.complete, true);
  assert.equal(mapCulture({ nome: "Sem limites" }).complete, false);
  assert.equal(makeSeries([latest], culture, "ec", "24h")[0].value, 1800);
});
test("usa primeiro horizonte abaixo do minimo, sem inventar hora exata", () => {
  assert.equal(wateringAdvice(latest, culture, forecast, now).horizonte_h, 3);
  assert.equal(wateringAdvice({ ...latest, umidade: 59 }, culture, forecast, now).status, "now");
});
test("distingue falta de treino, leitura atrasada e previsao expirada", () => {
  assert.equal(wateringAdvice(latest, culture, {}, now).status, "waiting");
  assert.equal(wateringAdvice({ ...latest, timestamp: "2026-10-07T09:00:00Z" }, culture, forecast, now).status, "stale");
  assert.equal(wateringAdvice(latest, culture, { ...forecast, timestamp_geracao: "2026-10-07T08:00:00Z" }, now).status, "staleForecast");
  assert.equal(wateringAdvice(latest, culture, forecast, now + 86400000).status, "stale");
  assert.equal(wateringAdvice(latest, culture, { ...forecast, predicoes: forecast.predicoes.map((p) => ({ ...p, umidade_prevista: 65 })) }, now).status, "within");
});

function middleware(env) {
  let handler;
  fazendaProxy(env).configureServer({ middlewares: { use: (_, fn) => { handler = fn; } } });
  return handler;
}
async function invoke(handler, url, method = "GET", body) {
  const result = { headers: {} };
  const req = Readable.from(body == null ? [] : [Buffer.from(JSON.stringify(body))]);
  req.url = url; req.method = method;
  await handler(req, { set statusCode(value) { result.status = value; }, setHeader(key, value) { result.headers[key] = value; }, end(body) { result.body = body.toString(); } });
  return result;
}
test("proxy informa configuracao ausente e bloqueia escrita", async () => {
  const handler = middleware({});
  assert.equal((await invoke(handler, "/leituras/ultima")).status, 503);
  assert.equal((await invoke(handler, "/leituras", "POST")).status, 405);
  assert.equal((await invoke(handler, "//outro-servidor/segredo")).status, 405);
});

test("catálogo mantém nove culturas e separa referências de limites do sensor", () => {
  assert.equal(cultureCatalog.length, 9);
  assert.equal(new Set(cultureCatalog.map((c) => c.id)).size, 9);
  assert.equal(findCatalogCulture("Callisia fragrans (planta-cesto)").id, "callisia");
  assert.equal(findCatalogCulture("Manjericão").id, "manjericao");
  for (const entry of cultureCatalog) {
    assert.equal(entry.ranges, undefined);
    for (const ref of [entry.ec, entry.temperature, entry.moisture].filter(Boolean)) assert.ok(ref.source.url.startsWith("https://"));
  }
  assert.equal(cultureCatalog.find((c) => c.id === "tomate").ec.values[0], 2000);
});

test("limites operacionais exigem dados completos, faixas válidas e umidade de 0–100", () => {
  assert.equal(validLimits({}), false);
  const limits = { umidade_min: 45, umidade_max: 80, ce_min: 160, ce_max: 400, temperatura_min: 18, temperatura_max: 28 };
  assert.equal(validLimits(limits), true);
  assert.equal(validLimits({ ...limits, umidade_max: 101 }), false);
  assert.equal(validLimits({ ...limits, ce_min: -1 }), false);
  assert.equal(validLimits({ ...limits, temperatura_min: "" }), false);
  assert.equal(validLimits({ ...limits, temperatura_min: 30 }), false);
});

test("proxy permite vincular cultura somente ao experimento configurado", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "http://sensor.test/experimentos/2");
    assert.equal(options.method, "PATCH");
    assert.deepEqual(JSON.parse(options.body), { id_cultura: 3 });
    return new Response(JSON.stringify({ id_experimento: 2, id_cultura: 3 }));
  });
  const handler = middleware({ FAZENDA_API_URL: "http://sensor.test", FAZENDA_API_TOKEN: "teste-local", VITE_FAZENDA_EXPERIMENTO: "2" });
  assert.equal((await invoke(handler, "/experimentos/1", "PATCH", { id_cultura: 3 })).status, 405);
  assert.equal((await invoke(handler, "/experimentos/2", "PATCH", { nome: "alteração indevida" })).status, 400);
  assert.equal((await invoke(handler, "/experimentos/2", "PATCH", { id_cultura: 3 })).status, 200);
});

test("proxy bloqueia alteração de leituras", async () => {
  const handler = middleware({ FAZENDA_API_TOKEN: "teste-local" });
  assert.equal((await invoke(handler, "/leituras/1", "PATCH", { umidade: 90 })).status, 405);
});
test("proxy adiciona token apenas na chamada ao backend e preserva respostas", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "http://sensor.test:8000/leituras/ultima?id_experimento=2");
    assert.equal(options.headers.Authorization, "Bearer teste-local");
    return new Response(JSON.stringify(latest), { headers: { "content-type": "application/json" } });
  });
  const result = await invoke(middleware({ FAZENDA_API_URL: "http://sensor.test:8000", FAZENDA_API_TOKEN: "teste-local" }), "/leituras/ultima?id_experimento=2");
  assert.equal(result.status, 200);
  assert.deepEqual(JSON.parse(result.body), latest);
  assert.equal(result.body.includes("teste-local"), false);
});

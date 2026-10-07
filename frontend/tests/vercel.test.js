import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/proxy.js";

async function invoke(url, method = "GET", body) {
  const result = {};
  await handler({ url, method, body }, { set statusCode(value) { result.status = value; }, setHeader() {}, end(value) { result.body = value.toString(); } });
  return result;
}

test("função Vercel preserva parâmetros e mantém token no servidor", async (t) => {
  const saved = { ...process.env };
  t.after(() => { process.env = saved; });
  process.env.FAZENDA_API_URL = "http://backend.test";
  process.env.FAZENDA_API_TOKEN = "server-test-secret";
  delete process.env.FAZENDA_ENABLE_WRITES;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "http://backend.test/leituras/ultima?id_experimento=2");
    assert.equal(options.headers.Authorization, "Bearer server-test-secret");
    return new Response(JSON.stringify({ ce: 235 }));
  });
  const result = await invoke("/api/proxy?path=leituras/ultima&id_experimento=2");
  assert.equal(result.status, 200);
  assert.deepEqual(JSON.parse(result.body), { ce: 235 });
  assert.equal(result.body.includes("server-test-secret"), false);
  assert.equal((await invoke("/api/proxy?path=experimentos", "POST", { nome: "Teste" })).status, 403);
  assert.equal((await invoke("/api/proxy?path=../segredo")).status, 400);
});

test("função Vercel aceita corpo JSON quando escrita é habilitada", async (t) => {
  const saved = { ...process.env };
  t.after(() => { process.env = saved; });
  process.env.FAZENDA_API_URL = "http://backend.test";
  process.env.FAZENDA_API_TOKEN = "server-test-secret";
  process.env.FAZENDA_ENABLE_WRITES = "true";
  const payload = { nome: "Teste", id_cultura: 1, data_inicio: "2026-10-07" };
  t.mock.method(globalThis, "fetch", async (_, options) => {
    assert.deepEqual(JSON.parse(options.body), payload);
    return new Response(JSON.stringify({ id_experimento: 2 }), { status: 201 });
  });
  assert.equal((await invoke("/api/proxy?path=experimentos", "POST", payload)).status, 201);
});

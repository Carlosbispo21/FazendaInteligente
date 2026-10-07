import { createFazendaHandler } from "../server/fazendaProxy.js";

export default async function handler(req, res) {
  const url = new URL(req.url, "http://localhost");
  const path = url.searchParams.get("path") || "";
  url.searchParams.delete("path");
  if (!path || path.includes("?") || path.includes("#") || path.includes("..")) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ detail: "Caminho da API inválido." }));
    return;
  }
  req.url = `/${path}${url.search}`;
  return createFazendaHandler({ ...process.env, FAZENDA_ENABLE_WRITES: process.env.FAZENDA_ENABLE_WRITES || "false" })(req, res);
}

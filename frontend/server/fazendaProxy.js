const allowed = /^\/(health|culturas(?:\/\d+)?|experimentos(?:\/\d+)?|leituras(?:\/ultima|\/export\.csv)?|predicoes|regas|alertas|modelo\/metricas)$/;

export function fazendaProxy(env) {
  return { name: "fazenda-api", configureServer: install, configurePreviewServer: install };
  function install(server) {
    server.middlewares.use("/api/fazenda", createFazendaHandler(env));
  }
}

export function createFazendaHandler(env) {
  return async (req, res) => {
      const send = (status, detail) => {
        res.statusCode = status;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ detail }));
      };
      const url = new URL(req.url, "http://localhost");
      if (req.method !== "GET" && env.FAZENDA_ENABLE_WRITES === "false") {
        send(403, "Este ambiente permite apenas consultar o monitoramento.");
        return;
      }
      const isCultureWrite = (req.method === "POST" && url.pathname === "/culturas") || (req.method === "PATCH" && /^\/culturas\/\d+$/.test(url.pathname));
      const isExperimentWrite = req.method === "PATCH" && url.pathname === `/experimentos/${Number(env.VITE_FAZENDA_EXPERIMENTO || 1)}`;
      const isExperimentCreate = req.method === "POST" && url.pathname === "/experimentos";
      if (!(req.method === "GET" && allowed.test(url.pathname)) && !isExperimentWrite && !isCultureWrite && !isExperimentCreate) {
        send(405, "Operação não disponível no monitoramento.");
        return;
      }
      if (!env.FAZENDA_API_TOKEN) {
        send(503, "Configure FAZENDA_API_TOKEN no arquivo frontend/.env e reinicie o servidor.");
        return;
      }
      try {
        let body;
        if (isExperimentWrite || isCultureWrite || isExperimentCreate) {
          const chunks = [];
          let size = 0;
          if (req.body !== undefined) {
            const chunk = Buffer.from(typeof req.body === "string" ? req.body : JSON.stringify(req.body));
            size = chunk.length;
            chunks.push(chunk);
          } else {
            for await (const chunk of req) {
              size += chunk.length;
              if (size > 16384) break;
              chunks.push(chunk);
            }
          }
          if (size > 16384) { send(413, "Dados do perfil muito grandes."); return; }
          try {
            const data = JSON.parse(Buffer.concat(chunks).toString());
            if (isExperimentWrite && (Object.keys(data).length !== 1 || !Number.isInteger(data.id_cultura) || data.id_cultura < 1)) throw new Error();
            body = JSON.stringify(data);
          } catch { send(400, "Dados do perfil inválidos."); return; }
        }
        const target = `${(env.FAZENDA_API_URL || "http://165.22.190.56:8000").replace(/\/$/, "")}${url.pathname}${url.search}`;
        const response = await fetch(target, {
          method: req.method, body,
          headers: { Authorization: `Bearer ${env.FAZENDA_API_TOKEN}`, ...(body ? { "Content-Type": "application/json" } : {}) },
          signal: AbortSignal.timeout(15000), redirect: "error",
        });
        res.statusCode = response.status;
        res.setHeader("Content-Type", response.headers.get("content-type") || "application/json");
        res.setHeader("Cache-Control", "no-store");
        if (response.headers.has("content-disposition")) res.setHeader("Content-Disposition", response.headers.get("content-disposition"));
        res.end(Buffer.from(await response.arrayBuffer()));
      } catch {
        send(502, "Não foi possível acessar a API do sensor. Verifique o endereço e a conexão.");
      }
  };
}

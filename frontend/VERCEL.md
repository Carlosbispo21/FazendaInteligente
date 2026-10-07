# Publicar na Vercel

## Enviar o código ao GitHub

O repositório já tem o remoto `https://github.com/Carlosbispo21/FazendaInteligente.git`. Envie as alterações pelo controle de versão do VS Code. Inclua a pasta `frontend`, especialmente `api/proxy.js`, `server/fazendaProxy.js`, `vercel.json`, `package.json` e `package-lock.json`.

Não envie `.env`, `node_modules`, `dist`, bancos SQLite ou tokens. O arquivo `.env.example` contém somente o modelo de configuração.

## Criar o projeto na Vercel

1. Em Add New → Project, importe o repositório FazendaInteligente do GitHub.
2. Selecione **Root Directory: `frontend`**. Se seu repositório tiver a pasta externa `FazendaInteligente`, use `FazendaInteligente/frontend`; neste remoto, a raiz Git já é FazendaInteligente.
3. Use Framework Preset **Vite** e Node.js **22.x**.
4. Build Command: `npm run build`. Output Directory: `dist`. Install Command: `npm ci` (pode manter a detecção automática).
5. Antes de Deploy, configure as variáveis abaixo para Production e, se usar, Preview.

| Variável | Valor |
| --- | --- |
| `FAZENDA_API_URL` | `http://165.22.190.56:8000` ou a URL atual do backend |
| `FAZENDA_API_TOKEN` | Mesmo token do `.env`, sem `Bearer`; marque como Sensitive |
| `VITE_FAZENDA_EXPERIMENTO` | `1` |
| `FAZENDA_ENABLE_WRITES` | `false` para publicação pública de consulta |

Nunca prefixe o token com `VITE_`: isso o colocaria no código enviado ao navegador. O token é lido exclusivamente pela função de servidor. Depois de alterar as variáveis, faça um novo deployment (Redeploy).

## Como funciona

O navegador chama `/api/fazenda/*` no próprio domínio da Vercel. A função `api/proxy.js` acrescenta o token e consulta o backend, sem expor a credencial no navegador. O gráfico, CSV e as consultas continuam usando os mesmos endpoints. O proxy local do Vite e a função publicada compartilham a mesma implementação.

As rotas `/inicio`, `/cultura` e `/previsoes` voltam para `index.html`, permitindo abrir links diretos e atualizar a página. A API Python, o SQLite e o job de Random Forest continuam no servidor atual; não são hospedados na Vercel.

Por padrão, o site publicado permite consulta. Se precisar criar experimentos pelo site, proteja o acesso ao deployment antes de definir `FAZENDA_ENABLE_WRITES=true`. Essa variável habilita as operações de escrita permitidas pelo proxy, com o token do servidor. A API remota precisa estar atualizada com GET/POST `/experimentos` para a criação funcionar.

O acesso navegador → Vercel usa HTTPS. Vercel → backend ainda usa HTTP na URL atual; para proteger também esse trecho, o responsável pelo backend deve disponibilizar HTTPS e atualizar `FAZENDA_API_URL`.

## Verificar após o Deploy

- Abra a URL gerada e confirme a última leitura real.
- Abra `/inicio`, `/cultura` e `/previsoes` diretamente e atualize cada página.
- Confira o gráfico da IA, eventos recentes e exportação CSV.
- Se retornar 401, confira o token. Se retornar 503, confira a configuração da variável. Se retornar 502, confira acesso ao backend.
- Consulte Logs da função na Vercel quando necessário, sem registrar o token.

Documentação oficial: [Vite](https://vercel.com/docs/frameworks/frontend/vite), [funções Node.js](https://vercel.com/docs/functions/runtimes/node-js), [variáveis de ambiente](https://vercel.com/docs/environment-variables).

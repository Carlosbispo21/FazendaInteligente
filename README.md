# Fazenda Inteligente — monitoramento real

O ESP32 envia leituras para a API FastAPI. A API armazena os dados em SQLite; o job horário treina Random Forest para umidade e Isolation Forest para anomalias. O frontend React consulta os dados e os resultados do job, sem executar treino no navegador.

## Conectar o frontend

1. Em `frontend`, copie `.env.example` para `.env`.
2. Configure `FAZENDA_API_URL` e `FAZENDA_API_TOKEN` com os mesmos valores usados pelo dashboard Streamlit. O responsável pelo backend encontra esses valores nas configurações de Secrets do Streamlit ou no ambiente do servidor da API. Não publique o token.
3. Configure `VITE_FAZENDA_EXPERIMENTO` com o experimento do sensor (padrão: `1`).
4. Execute `npm install` se necessário e `npm run dev` dentro de `frontend`. Reinicie o servidor após alterar `.env`.

O token usa o nome `FAZENDA_API_TOKEN`, **sem o prefixo VITE_**. Ele é lido pelo proxy do servidor e não é incorporado ao JavaScript do navegador. O `.env` está ignorado pelo Git. Além das consultas, o proxy permite vincular um perfil existente apenas ao experimento configurado, via `PATCH /experimentos/{id}`. Permite criar perfis e editar limites em /culturas; não permite escrever nas leituras.

## O que aparece no frontend

- Última leitura real e horário em Brasília, atualizados a cada 30 segundos; aviso de atraso após 30 minutos sem leitura.
- Histórico de 24 horas, 7 dias e 30 dias, com até 10.000 leituras por consulta, e exportação do dataset em CSV.
- Cultura e limites efetivamente vinculados ao experimento na API, em %, °C e µS/cm. Não há conversão do CE recebido: a API e o sensor já usam µS/cm.
- Alertas e regas detectadas pelo backend, sem eventos inventados.
- Previsões nos horizontes disponíveis, métricas de validação e primeira previsão abaixo do mínimo de umidade. Não é um horário exato nem um comando de irrigação.
- Sem botão de rega simulada e sem alteração artificial das leituras do sensor.

Os perfis e limites são administrados no backend; a página Cultura apresenta valores fixos. A seleção oferece planta-cesto, tomate, alface, manjericão, pimenta, cenoura, morango, rúcula e girassol. Perfis existentes podem ser selecionados pelo botão Monitorar esta cultura e usam os limites fixos da API. Culturas sem perfil cadastrado exibem apenas suas referências. Vincular outra cultura muda o perfil do experimento atual, sem criar outro experimento ou apagar o histórico. Não misture espécies no mesmo experimento durante a coleta do TCC sem registrar a mudança.

## Referências das culturas

As fontes e o contexto de cada número estão em `frontend/src/lib/cultureCatalog.js` e nos cards da página Cultura. A conversão usada é 1 mS/cm = 1 dS/m = 1000 µS/cm; para temperatura, °C = (°F − 32) × 5/9.

- FAO 56: frações de depleção da água disponível e limites de salinidade do extrato de saturação. Fração de depleção não é umidade volumétrica nem a porcentagem da sonda. Exige capacidade de campo e ponto de murcha do solo.
- Oklahoma State University: CE de solução nutritiva em hidroponia e referência de temperatura para manjericão. Não é CE medida diretamente no solo.
- Iowa State, Illinois Extension, Oregon State, Clemson, UF/IFAS, SARE e Wisconsin: temperatura de crescimento, com condições específicas registradas em cada perfil.
- Estudo da Ohio State para rúcula: os valores de CE são tratamentos experimentais, não uma faixa ótima validada para todas as condições.
- Para planta-cesto, os valores da API são os definidos pelo experimento; não foram apresentados como limites universais comprovados pela literatura.

RS485 descreve a interface de comunicação, não o método de medição. Antes de adotar limites da literatura para a sonda, identifique seu fabricante/modelo, se a umidade é volumétrica ou escala calibrada e se a CE é aparente, da solução do solo ou outra grandeza. O catálogo não preenche faixas arbitrárias do sensor com números de métodos incompatíveis.

## IA no servidor do sensor

O frontend não liga o job do servidor remoto. O responsável pelo backend precisa verificar se `api/deploy/fazenda-ml.service` e `fazenda-ml.timer` estão instalados e ativos. Eles devem usar o mesmo `FAZENDA_DB_PATH` da API e o diretório onde o pacote `app` está instalado.

Para executar manualmente no ambiente Python do backend, dentro de `api`:

```sh
python -m app.ml.job --experimento 1
```

O pipeline exige pelo menos 144 leituras, histórico de até 12 horas para atributos, alvos futuros para cada horizonte e amostras suficientes para validação temporal em 5 divisões. Não significa que todas as previsões estarão disponíveis após apenas um dia. Previsões só são geradas quando a última leitura tem até uma hora. Não reduza esses requisitos para mostrar previsões artificiais.

Na tela de IA, leituras com mais de uma hora ou previsões com mais de duas horas são sinalizadas como atrasadas; previsões cujo alvo já passou não geram recomendação futura. Não há previsão de temperatura ou CE: o modelo existente prevê umidade.

## Verificação e publicação

```sh
cd frontend
node --test tests/monitoring.test.js
npm run build
```

O proxy funciona em `npm run dev` e `npm run preview`. Publicar apenas a pasta `dist` em um host estático não oferece o proxy. Para produção, configure no servidor web uma rota `/api/fazenda/*` que encaminhe os endpoints permitidos para a API e adicione a autenticação do lado do servidor; proteja o acesso ao próprio frontend. Nunca publique o token em variáveis `VITE_*`. O endereço atual da API responde por HTTP; o ambiente publicado deve usar HTTPS para proteger o transporte.

Sem o token, é possível validar compilação e testes locais, mas a leitura dos dados reais permanece indisponível. O frontend mostra essa situação explicitamente.


## Cultura, experimentos e qualidade do modelo

A seleção de cultura é automática e os limites são fixos. A escolha fica salva no navegador por experimento, inclusive depois de atualizar a página. A seleção não altera leituras nem a cultura do experimento existente. As referências da página Cultura ficam em seções expansíveis, depois dos limites usados no monitoramento.

O painel Experimento permite abrir outro experimento existente e criar um novo para a cultura selecionada. O frontend usa `id_experimento` em todas as consultas de histórico, alertas, previsões, métricas e CSV. Ao criar um experimento, o histórico começa vazio; o sensor precisa ser configurado para enviar esse novo número. A criação não transfere leituras do vaso anterior. Os parâmetros fixos são cadastrados no backend para o job de IA usar o mesmo perfil.

**Atualização necessária no servidor remoto:** a API publicada originalmente só tinha GET/PATCH `/experimentos/{id}`. Publique os arquivos atualizados de `api/app/routers/experimentos.py`, `api/app/schemas.py` e `api/app/database.py` e reinicie o serviço existente para liberar GET/POST `/experimentos`. Não é necessário apagar ou recriar o banco. Até essa atualização, o frontend informa a limitação, permite abrir experimentos existentes pelo número e mantém a criação desabilitada.

A tela IA compara o RMSE de Random Forest e persistência por horizonte, mostra o modelo com menor erro e a diferença percentual. Persistência significa prever a mesma umidade da última leitura. Esta mudança melhora a apresentação da avaliação; não altera o treinamento ou transforma erro de validação em probabilidade de acerto.

O indicador global mostra Sensor atualizado, Coleta atrasada, Aguardando sensor ou API indisponível, com o tempo desde a última leitura. A conexão SQLite agora é fechada ao sair dos contextos de consulta.

### Testes da API

Em `api`, usando um ambiente Python compatível com Pydantic:

```sh
python -m pip install -r requirements-test.txt
python -m unittest discover -s tests -v
```

O teste usa um banco temporário e verifica autenticação, criação de experimentos e isolamento de leituras e resultados. Não altera o banco do sensor.
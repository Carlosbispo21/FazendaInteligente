from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI

from app.auth import verificar_token
from app.database import init_db
from app.routers import alertas, culturas, experimentos, ia, leituras


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="FazendaInteligente API",
    description="Ingestao de leituras do agente ESP32, perfis de cultura e resultados da IA "
                "(predicao de umidade e deteccao de anomalias).",
    version="0.3.0",
    lifespan=lifespan,
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


# RNF03/AL07 - todas as rotas de dados exigem token
protegido = [Depends(verificar_token)]
app.include_router(leituras.router, dependencies=protegido)
app.include_router(experimentos.router, dependencies=protegido)
app.include_router(culturas.router, dependencies=protegido)
app.include_router(alertas.router, dependencies=protegido)
app.include_router(ia.router, dependencies=protegido)

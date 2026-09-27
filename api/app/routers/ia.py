import json

from fastapi import APIRouter

from app.database import connect
from app.ml.regas import detectar_regas, parse_ts
from app.schemas import PredicaoOut, PredicoesOut, RegaOut, TreinoOut, iso_utc

router = APIRouter(tags=["ia"])


@router.get("/predicoes", response_model=PredicoesOut)
def ultimas_predicoes(id_experimento: int = 1) -> PredicoesOut:
    """RF04 - predicoes de umidade da execucao mais recente do job."""
    with connect() as conn:
        geracao = conn.execute(
            "SELECT MAX(timestamp_geracao) FROM predicao WHERE id_experimento = ?", (id_experimento,)
        ).fetchone()[0]
        rows = conn.execute(
            "SELECT horizonte_h, timestamp_alvo, umidade_prevista FROM predicao "
            "WHERE id_experimento = ? AND timestamp_geracao = ? ORDER BY horizonte_h",
            (id_experimento, geracao),
        ).fetchall() if geracao else []
    return PredicoesOut(id_experimento=id_experimento, timestamp_geracao=geracao,
                        predicoes=[PredicaoOut(**dict(r)) for r in rows])


@router.get("/regas", response_model=list[RegaOut])
def listar_regas(id_experimento: int = 1) -> list[RegaOut]:
    """RF09 (AL10) - regas detectadas automaticamente pela subida da umidade."""
    with connect() as conn:
        rows = conn.execute(
            "SELECT timestamp, umidade FROM leitura WHERE id_experimento = ? ORDER BY timestamp",
            (id_experimento,),
        ).fetchall()
    regas = detectar_regas((parse_ts(r["timestamp"]), r["umidade"]) for r in rows)
    return [RegaOut(timestamp=iso_utc(r.timestamp), umidade_antes=r.umidade_antes,
                    umidade_depois=r.umidade_depois) for r in regas]


@router.get("/modelo/metricas", response_model=list[TreinoOut])
def metricas_modelo(id_experimento: int = 1) -> list[TreinoOut]:
    """Metricas do treino mais recente por horizonte (H1 / CT03)."""
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT * FROM treino_modelo
            WHERE id_experimento = ? AND timestamp = (
                SELECT MAX(timestamp) FROM treino_modelo WHERE id_experimento = ?
            )
            ORDER BY horizonte_h
            """,
            (id_experimento, id_experimento),
        ).fetchall()
    return [TreinoOut(**{**dict(r), "importancias": json.loads(r["importancias"])}) for r in rows]

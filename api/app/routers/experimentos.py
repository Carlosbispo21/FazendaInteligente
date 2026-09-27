import sqlite3

from fastapi import APIRouter, HTTPException, status

from app.database import connect
from app.schemas import ExperimentoOut, ExperimentoPatch

router = APIRouter(prefix="/experimentos", tags=["experimentos"])


def _buscar(conn, id_experimento: int) -> ExperimentoOut:
    row = conn.execute(
        "SELECT * FROM experimento WHERE id_experimento = ?", (id_experimento,)
    ).fetchone()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Experimento nao encontrado")
    return ExperimentoOut(**dict(row))


@router.get("/{id_experimento}", response_model=ExperimentoOut)
def obter_experimento(id_experimento: int) -> ExperimentoOut:
    with connect() as conn:
        return _buscar(conn, id_experimento)


@router.patch("/{id_experimento}", response_model=ExperimentoOut)
def atualizar_experimento(id_experimento: int, dados: ExperimentoPatch) -> ExperimentoOut:
    """Atualiza dados do experimento, ex.: cultura (AL11) ou data_fim ao encerrar a coleta."""
    campos = {k: (v.isoformat() if hasattr(v, "isoformat") else v)
              for k, v in dados.model_dump(exclude_unset=True).items()}
    try:
        with connect() as conn:
            _buscar(conn, id_experimento)
            if campos:
                sets = ", ".join(f"{k} = ?" for k in campos)
                conn.execute(
                    f"UPDATE experimento SET {sets} WHERE id_experimento = ?",
                    (*campos.values(), id_experimento),
                )
            return _buscar(conn, id_experimento)
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Cultura inexistente")

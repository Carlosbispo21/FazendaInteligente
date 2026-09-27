from typing import Literal, Optional

from fastapi import APIRouter

from app.database import connect
from app.schemas import AlertaOut

router = APIRouter(prefix="/alertas", tags=["alertas"])


@router.get("", response_model=list[AlertaOut])
def listar_alertas(
    id_experimento: int = 1,
    tipo: Optional[Literal["umidade", "anomalia"]] = None,
) -> list[AlertaOut]:
    """RF08 - historico de alertas de umidade (RF05) e de anomalia (RF10)."""
    sql = "SELECT * FROM alerta WHERE id_experimento = ?"
    params: list = [id_experimento]
    if tipo:
        sql += " AND tipo = ?"
        params.append(tipo)
    with connect() as conn:
        rows = conn.execute(sql + " ORDER BY timestamp, id_alerta", params).fetchall()
    return [AlertaOut(**dict(r)) for r in rows]

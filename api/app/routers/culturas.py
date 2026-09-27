import sqlite3

from fastapi import APIRouter, HTTPException, status

from app.database import connect
from app.schemas import CulturaIn, CulturaOut, CulturaPatch

router = APIRouter(prefix="/culturas", tags=["culturas"])


def _buscar(conn, id_cultura: int) -> CulturaOut:
    row = conn.execute("SELECT * FROM cultura WHERE id_cultura = ?", (id_cultura,)).fetchone()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cultura nao encontrada")
    return CulturaOut(**dict(row))


def _validar_faixas(c: CulturaOut) -> None:
    for campo in ("umidade", "ce", "temperatura"):
        minimo, maximo = getattr(c, f"{campo}_min"), getattr(c, f"{campo}_max")
        if minimo is not None and maximo is not None and minimo > maximo:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                                detail=f"{campo}_min maior que {campo}_max")


@router.get("", response_model=list[CulturaOut])
def listar_culturas() -> list[CulturaOut]:
    with connect() as conn:
        rows = conn.execute("SELECT * FROM cultura ORDER BY nome").fetchall()
    return [CulturaOut(**dict(r)) for r in rows]


@router.get("/{id_cultura}", response_model=CulturaOut)
def obter_cultura(id_cultura: int) -> CulturaOut:
    with connect() as conn:
        return _buscar(conn, id_cultura)


@router.post("", response_model=CulturaOut, status_code=status.HTTP_201_CREATED)
def criar_cultura(cultura: CulturaIn) -> CulturaOut:
    """RF11/UC04 - cadastra perfil de cultura com faixas ideais (AL11)."""
    _validar_faixas(CulturaOut(id_cultura=0, **cultura.model_dump()))
    campos = cultura.model_dump()
    try:
        with connect() as conn:
            cur = conn.execute(
                f"INSERT INTO cultura ({', '.join(campos)}) VALUES ({', '.join('?' * len(campos))})",
                tuple(campos.values()),
            )
            return _buscar(conn, cur.lastrowid)
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ja existe cultura com esse nome")


@router.patch("/{id_cultura}", response_model=CulturaOut)
def atualizar_cultura(id_cultura: int, dados: CulturaPatch) -> CulturaOut:
    campos = dados.model_dump(exclude_unset=True)
    try:
        with connect() as conn:
            atual = _buscar(conn, id_cultura)
            _validar_faixas(atual.model_copy(update=campos))
            if campos:
                conn.execute(
                    f"UPDATE cultura SET {', '.join(f'{k} = ?' for k in campos)} WHERE id_cultura = ?",
                    (*campos.values(), id_cultura),
                )
            return _buscar(conn, id_cultura)
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ja existe cultura com esse nome")

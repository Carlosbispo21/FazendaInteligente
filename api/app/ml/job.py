"""Job horario de IA (RF04 / UC06). Uso: python -m app.ml.job [--experimento N]"""
import argparse
import json
import logging
from datetime import date

from app.database import connect, init_db
from app.ml.pipeline import executar


def experimentos_ativos() -> list[int]:
    hoje = date.today().isoformat()
    with connect() as conn:
        rows = conn.execute(
            "SELECT id_experimento FROM experimento WHERE data_fim IS NULL OR data_fim >= ?",
            (hoje,),
        ).fetchall()
    return [r["id_experimento"] for r in rows]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--experimento", type=int, help="padrao: todos os experimentos ativos")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    init_db()
    ids = [args.experimento] if args.experimento else experimentos_ativos()
    for id_experimento in ids:
        print(json.dumps(executar(id_experimento)))


if __name__ == "__main__":
    main()

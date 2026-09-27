"""Deteccao automatica de rega (AL10) - regra deterministica, sem dependencias pesadas.

Usada pela API (GET /regas) e pelo job de ML (feature "horas desde a ultima rega").
"""
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Iterable

# Subida minima da umidade (pontos percentuais) entre leituras consecutivas
LIMIAR_SUBIDA_PP = 3.0
# Leituras mais distantes que isso nao sao comparadas (lacuna de transmissao)
LACUNA_MAX = timedelta(minutes=30)
# Subidas dentro desta janela pertencem a mesma rega
JANELA_EVENTO = timedelta(hours=1)


@dataclass
class Rega:
    timestamp: datetime      # primeira leitura com a subida
    umidade_antes: float
    umidade_depois: float    # maximo atingido dentro da janela do evento


def parse_ts(ts: str) -> datetime:
    return datetime.strptime(ts, "%Y-%m-%dT%H:%M:%SZ")


def _sem_quedas_isoladas(leituras: list[tuple[datetime, float]]) -> list[tuple[datetime, float]]:
    """Remove leitura isolada que cai e volta em seguida (ex.: sensor fora do solo por um
    instante) - sem isso, a volta ao valor normal seria confundida com rega."""
    saida = []
    for i, (ts, u) in enumerate(leituras):
        prox_sobe = i < len(leituras) - 1 and leituras[i + 1][1] - u >= LIMIAR_SUBIDA_PP
        # 1a leitura: sem anterior para comparar; se a seguinte ja sobe, e o sensor sendo instalado
        ant_desce = i == 0 or leituras[i - 1][1] - u >= LIMIAR_SUBIDA_PP
        if prox_sobe and ant_desce:
            continue
        saida.append((ts, u))
    return saida


def detectar_regas(leituras: Iterable[tuple[datetime, float]]) -> list[Rega]:
    """`leituras`: pares (timestamp, umidade) em ordem cronologica."""
    regas: list[Rega] = []
    anterior = None
    for ts, umidade in _sem_quedas_isoladas(list(leituras)):
        if anterior is not None:
            ts_ant, u_ant = anterior
            if ts - ts_ant <= LACUNA_MAX and umidade - u_ant >= LIMIAR_SUBIDA_PP:
                if regas and ts - regas[-1].timestamp <= JANELA_EVENTO:
                    regas[-1].umidade_depois = max(regas[-1].umidade_depois, umidade)
                else:
                    regas.append(Rega(ts, u_ant, umidade))
            elif regas and ts - regas[-1].timestamp <= JANELA_EVENTO:
                regas[-1].umidade_depois = max(regas[-1].umidade_depois, umidade)
        anterior = (ts, umidade)
    return regas

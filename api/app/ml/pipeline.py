"""Pipeline de IA (AL10): predicao de umidade (Random Forest) + deteccao de anomalias
(Isolation Forest) + alertas. Executado de hora em hora pelo job (RF04 / UC06)."""
import json
import logging
import sqlite3
from datetime import datetime, timedelta, timezone
from typing import Optional

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest, RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import TimeSeriesSplit

from app.database import connect
from app.ml.regas import JANELA_EVENTO, detectar_regas
from app.schemas import iso_utc

log = logging.getLogger("fazenda.ml")

HORIZONTES_H = [1, 3, 6, 12, 24]
FEATURES = [
    "umidade",
    "umidade_media_1h",
    "umidade_media_3h",
    "umidade_media_12h",
    "delta_umidade_1h",
    "delta_umidade_3h",
    "temperatura",
    "ce",
    "hora_sin",
    "hora_cos",
    "horas_desde_rega",
]
RF_PARAMS = dict(n_estimators=100, min_samples_leaf=3, random_state=42, n_jobs=1)
N_SPLITS = 5                                   # validacao cruzada temporal k=5
AMOSTRAS_POR_HORA = 6                          # leitura a cada 10 min (RF01)
MIN_AMOSTRAS = 144                             # ~1 dia de amostras validas por horizonte
TOLERANCIA = pd.Timedelta(minutes=15)          # casamento de leituras por horario
LEITURA_RECENTE = timedelta(hours=1)           # so preve se ha leitura recente
INTERVALO_ALERTA_UMIDADE = timedelta(hours=6)  # nao repete alerta de umidade nesse intervalo
FUSO_LOCAL = pd.Timedelta(hours=-3)            # hora do dia em Brasilia
CONTAMINACAO = 0.005                           # fracao esperada de leituras anomalas
Z_MINIMO = 4.0                                 # desvio minimo (z-score robusto) para anomalia
# Piso da escala robusta por grandeza: com Z_MINIMO=4, desvio minimo de ~3 p.p. de umidade,
# ~1,8 C de temperatura ou ~30 uS/cm de CE em relacao as leituras vizinhas
ESCALA_MINIMA = {"desvio_umidade": 0.5, "desvio_temperatura": 0.3, "desvio_ce": 5.0}


# ---------------- Dados ----------------

def carregar_leituras(conn: sqlite3.Connection, id_experimento: int) -> pd.DataFrame:
    df = pd.read_sql_query(
        "SELECT id_leitura, timestamp, temperatura, umidade, ce FROM leitura "
        "WHERE id_experimento = ? ORDER BY timestamp",
        conn,
        params=(id_experimento,),
    )
    df["ts"] = pd.to_datetime(df["timestamp"], format="%Y-%m-%dT%H:%M:%SZ", utc=True)
    # Retransmissoes podem duplicar o mesmo instante
    return df.drop_duplicates("ts").set_index("ts").sort_index()


def _umidade_em(df: pd.DataFrame, deslocamento: pd.Timedelta) -> np.ndarray:
    """Umidade observada em t + deslocamento (leitura mais proxima, ate TOLERANCIA)."""
    alvo = pd.DataFrame({"ts": df.index + deslocamento})
    ref = df[["umidade"]].reset_index()
    m = pd.merge_asof(alvo, ref, on="ts", direction="nearest", tolerance=TOLERANCIA)
    return m["umidade"].to_numpy()


def montar_features(df: pd.DataFrame, regas_ts: pd.DatetimeIndex) -> pd.DataFrame:
    u = df["umidade"]
    f = pd.DataFrame(index=df.index)
    f["umidade"] = u
    f["umidade_media_1h"] = u.rolling("1h").mean()
    f["umidade_media_3h"] = u.rolling("3h").mean()
    f["umidade_media_12h"] = u.rolling("12h").mean()
    f["delta_umidade_1h"] = u.to_numpy() - _umidade_em(df, pd.Timedelta(hours=-1))
    f["delta_umidade_3h"] = u.to_numpy() - _umidade_em(df, pd.Timedelta(hours=-3))
    f["temperatura"] = df["temperatura"]
    f["ce"] = df["ce"]

    local = df.index + FUSO_LOCAL
    fracao = (local.hour + local.minute / 60) / 24
    f["hora_sin"] = np.sin(2 * np.pi * fracao)
    f["hora_cos"] = np.cos(2 * np.pi * fracao)

    # Horas desde a ultima rega; antes da primeira rega, horas desde o inicio da coleta
    idx = np.searchsorted(regas_ts.asi8, df.index.asi8, side="right") - 1
    ultima = np.where(idx >= 0, regas_ts.asi8[np.clip(idx, 0, None)] if len(regas_ts) else 0,
                      df.index.asi8[0])
    f["horas_desde_rega"] = (df.index.asi8 - ultima) / 3.6e12
    return f


def _rega_no_intervalo(index: pd.DatetimeIndex, regas_ts: pd.DatetimeIndex, h: int) -> np.ndarray:
    """True se houve rega em (t, t+h] - essas amostras nao representam secagem."""
    if len(regas_ts) == 0:
        return np.zeros(len(index), dtype=bool)
    ini = np.searchsorted(regas_ts.asi8, index.asi8, side="right")
    fim = np.searchsorted(regas_ts.asi8, (index + pd.Timedelta(hours=h)).asi8, side="right")
    return fim > ini


# ---------------- Predicao de umidade ----------------

def validacao_possivel(n: int, h: int) -> bool:
    """TimeSeriesSplit exige amostras para 5 folds de teste + gap do horizonte."""
    gap = h * AMOSTRAS_POR_HORA
    return n - gap - N_SPLITS * (n // (N_SPLITS + 1)) > 0


def treinar_horizonte(X: np.ndarray, y: np.ndarray, persistencia: np.ndarray, h: int):
    """Validacao cruzada temporal (k=5, com gap = horizonte para evitar vazamento)."""
    tscv = TimeSeriesSplit(n_splits=N_SPLITS, gap=h * AMOSTRAS_POR_HORA)
    reais, previstos, persist = [], [], []
    for treino, teste in tscv.split(X):
        modelo = RandomForestRegressor(**RF_PARAMS).fit(X[treino], y[treino])
        reais.append(y[teste])
        previstos.append(modelo.predict(X[teste]))
        persist.append(persistencia[teste])
    reais, previstos, persist = map(np.concatenate, (reais, previstos, persist))

    metricas = {
        "rmse": float(np.sqrt(mean_squared_error(reais, previstos))),
        "mae": float(mean_absolute_error(reais, previstos)),
        "r2": float(r2_score(reais, previstos)) if np.var(reais) > 0 else None,
        "rmse_persistencia": float(np.sqrt(mean_squared_error(reais, persist))),
    }
    final = RandomForestRegressor(**RF_PARAMS).fit(X, y)
    metricas["importancias"] = {
        nome: round(float(v), 4) for nome, v in zip(FEATURES, final.feature_importances_)
    }
    return final, metricas


# ---------------- Anomalias ----------------

def detectar_anomalias(df: pd.DataFrame, regas_ts: pd.DatetimeIndex) -> np.ndarray:
    """Isolation Forest sobre valores e desvios; retorna mascara de leituras anomalas.

    Desvio = leitura - mediana centrada de 7 leituras (~1 h: 3 antes, ela e 3 depois; nas
    pontas, as disponiveis). A mediana, ao contrario da diferenca simples, nao e afetada por um
    pico isolado e nao marca como anomala a leitura que volta ao normal apos ele.
    O filtro de z-score robusto evita alertas quando nenhuma leitura foge de fato do padrao
    (o Isolation Forest sempre marca a fracao `CONTAMINACAO` mais isolada)."""
    valores = df[["umidade", "temperatura", "ce"]]
    referencia = valores.rolling(7, center=True, min_periods=2).median()
    desvio = (valores - referencia).fillna(0).add_prefix("desvio_")
    X = pd.concat([valores, desvio], axis=1)
    iso = IsolationForest(n_estimators=200, contamination=CONTAMINACAO, random_state=42).fit(X)
    anomala = iso.predict(X) == -1

    # Escala robusta (MAD) com piso fisico: com o sinal estavel o MAD tende a zero e qualquer
    # oscilacao de resolucao do sensor viraria "anomalia"
    centro = desvio - desvio.median()
    mad = np.maximum(centro.abs().median(), pd.Series(ESCALA_MINIMA))
    z = (centro.abs() / (1.4826 * mad)).max(axis=1).to_numpy()
    anomala &= z >= Z_MINIMO

    # Subida por rega e esperada, nao e anomalia
    em_rega = np.zeros(len(df), dtype=bool)
    for r in regas_ts:
        em_rega |= (df.index >= r) & (df.index <= r + JANELA_EVENTO)

    return anomala & ~em_rega


# ---------------- Execucao ----------------

def _cultura(conn: sqlite3.Connection, id_experimento: int) -> Optional[sqlite3.Row]:
    return conn.execute(
        "SELECT c.* FROM experimento e JOIN cultura c ON c.id_cultura = e.id_cultura "
        "WHERE e.id_experimento = ?",
        (id_experimento,),
    ).fetchone()


def _alerta_umidade(conn, id_experimento, agora, umidade_atual, predicoes) -> None:
    cultura = _cultura(conn, id_experimento)
    if cultura is None or cultura["umidade_min"] is None:
        log.info("Experimento %s sem umidade_min na cultura: alerta de umidade desativado", id_experimento)
        return
    minimo = cultura["umidade_min"]
    candidatos = [(0, umidade_atual)] + [(h, p) for h, p in predicoes]
    abaixo = [(h, v) for h, v in candidatos if v < minimo]
    if not abaixo:
        return

    limite = iso_utc(agora - INTERVALO_ALERTA_UMIDADE)
    ja_alertou = conn.execute(
        "SELECT 1 FROM alerta WHERE id_experimento = ? AND tipo = 'umidade' AND timestamp >= ?",
        (id_experimento, limite),
    ).fetchone()
    if ja_alertou:
        return

    h, valor = abaixo[0]
    quando = "agora" if h == 0 else f"em {h} h"
    conn.execute(
        "INSERT INTO alerta (id_experimento, timestamp, tipo, valor_previsto, horizonte_h, descricao) "
        "VALUES (?, ?, 'umidade', ?, ?, ?)",
        (id_experimento, iso_utc(agora), round(valor, 1), h,
         f"Umidade {'atual' if h == 0 else 'prevista'} de {valor:.1f}% {quando} "
         f"(minimo da cultura {cultura['nome']}: {minimo:.1f}%)"),
    )
    log.info("Alerta de umidade gerado: %.1f%% (h=%s)", valor, h)


def executar(id_experimento: int = 1, agora: Optional[datetime] = None) -> dict:
    agora = agora or datetime.now(timezone.utc)
    resumo = {"id_experimento": id_experimento, "horizontes_treinados": [], "predicoes": 0, "anomalias": 0}

    conn = connect()
    try:
        df = carregar_leituras(conn, id_experimento)
        if len(df) < MIN_AMOSTRAS:
            log.info("Experimento %s: %d leituras, minimo %d - nada a fazer", id_experimento, len(df), MIN_AMOSTRAS)
            resumo["motivo"] = "dados insuficientes"
            return resumo

        regas = detectar_regas(zip(df.index.tz_convert(None).to_pydatetime(), df["umidade"]))
        regas_ts = pd.DatetimeIndex([r.timestamp for r in regas]).tz_localize("UTC")
        # Anomalias primeiro: leituras anomalas nao entram no treino (limpeza de dados)
        anomala = detectar_anomalias(df, regas_ts)
        limpo = df[~anomala]

        f = montar_features(limpo, regas_ts)
        validas_x = f[FEATURES].notna().all(axis=1).to_numpy()

        ts_geracao = iso_utc(agora)
        ultima_ts = f.index[-1].to_pydatetime()
        pode_prever = agora - ultima_ts <= LEITURA_RECENTE and validas_x[-1]
        x_atual = f[FEATURES].iloc[[-1]].to_numpy()

        predicoes = []
        for h in HORIZONTES_H:
            y = _umidade_em(limpo, pd.Timedelta(hours=h))
            ok = validas_x & ~np.isnan(y) & ~_rega_no_intervalo(f.index, regas_ts, h)
            n = int(ok.sum())
            if n < MIN_AMOSTRAS or not validacao_possivel(n, h):
                log.info("h=%sh: %d amostras validas - insuficiente para validacao k=%d, pulado",
                         h, n, N_SPLITS)
                continue

            X = f.loc[ok, FEATURES].to_numpy()
            modelo, m = treinar_horizonte(X, y[ok], f.loc[ok, "umidade"].to_numpy(), h)
            conn.execute(
                "INSERT INTO treino_modelo (id_experimento, timestamp, horizonte_h, n_amostras, "
                "rmse, mae, r2, rmse_persistencia, importancias) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (id_experimento, ts_geracao, h, n, m["rmse"], m["mae"], m["r2"],
                 m["rmse_persistencia"], json.dumps(m["importancias"])),
            )
            resumo["horizontes_treinados"].append(h)
            log.info("h=%sh n=%d RMSE=%.2f MAE=%.2f persistencia=%.2f",
                     h, n, m["rmse"], m["mae"], m["rmse_persistencia"])

            if pode_prever:
                p = float(np.clip(modelo.predict(x_atual)[0], 0, 100))
                predicoes.append((h, p))
                conn.execute(
                    "INSERT INTO predicao (id_experimento, timestamp_geracao, horizonte_h, "
                    "timestamp_alvo, umidade_prevista) VALUES (?, ?, ?, ?, ?)",
                    (id_experimento, ts_geracao, h,
                     iso_utc(ultima_ts + timedelta(hours=h)), round(p, 2)),
                )
        resumo["predicoes"] = len(predicoes)

        if pode_prever:
            _alerta_umidade(conn, id_experimento, agora, float(limpo["umidade"].iloc[-1]), predicoes)

        # Todo o historico e avaliado; o indice unico por id_leitura impede duplicar alertas
        for ts, row in df[anomala].iterrows():
            cur = conn.execute(
                "INSERT OR IGNORE INTO alerta (id_experimento, timestamp, tipo, id_leitura, descricao) "
                "VALUES (?, ?, 'anomalia', ?, ?)",
                (id_experimento, ts_geracao, int(row["id_leitura"]),
                 f"Leitura fora do padrao em {row['timestamp']}: umidade {row['umidade']:.1f}%, "
                 f"temperatura {row['temperatura']:.1f} C, CE {row['ce']:.0f} uS/cm"),
            )
            resumo["anomalias"] += cur.rowcount

        conn.commit()
        return resumo
    finally:
        conn.close()

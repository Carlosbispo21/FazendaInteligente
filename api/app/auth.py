import os
import secrets
from typing import Optional

from fastapi import Header, HTTPException, status

API_TOKEN = os.getenv("FAZENDA_API_TOKEN", "")


def verificar_token(authorization: Optional[str] = Header(default=None)) -> None:
    """RNF03 - autenticacao por token nas requisicoes."""
    esperado = f"Bearer {API_TOKEN}"
    if not API_TOKEN or authorization is None or not secrets.compare_digest(authorization, esperado):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalido ou ausente",
            headers={"WWW-Authenticate": "Bearer"},
        )

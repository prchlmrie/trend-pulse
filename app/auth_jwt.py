"""JWT access tokens and password hashing for TrendPulse."""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import jwt
from passlib.context import CryptContext

# pbkdf2_sha256 avoids native bcrypt wheels on edge Python versions (e.g. 3.14).
_pwd = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def _secret() -> str:
    return (os.environ.get("JWT_SECRET") or "change-me-in-production-trendpulse-dev").strip()


def hash_password(plain: str) -> str:
    return _pwd.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    if not hashed:
        return False
    return _pwd.verify(plain, hashed)


def create_access_token(user_id: int, expires_days: int = 7) -> str:
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(days=expires_days)).timestamp()),
    }
    return jwt.encode(payload, _secret(), algorithm="HS256")


def decode_access_token(token: str) -> Optional[int]:
    try:
        payload = jwt.decode(token, _secret(), algorithms=["HS256"])
        sub = payload.get("sub")
        return int(sub) if sub is not None else None
    except (jwt.PyJWTError, ValueError, TypeError):
        return None

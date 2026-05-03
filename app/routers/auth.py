"""JWT registration and login."""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.auth_jwt import create_access_token, decode_access_token, hash_password, verify_password
from app.database import get_connection
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserMeResponse

router = APIRouter(prefix="/auth", tags=["auth"])
_bearer = HTTPBearer(auto_error=False)


@router.post("/register", response_model=TokenResponse)
def register(body: RegisterRequest):
    uname = body.username.strip().lower()
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT id FROM users WHERE lower(username) = ?", (uname,))
    if cur.fetchone():
        conn.close()
        raise HTTPException(status_code=409, detail="Username already taken")

    display = (body.name or body.username).strip()
    budget = float(body.budget) if body.budget is not None else 15000.0
    ph = hash_password(body.password)
    cur.execute(
        """
        INSERT INTO users (username, password_hash, name, budget, risk_tolerance, preferred_categories, experience_level, created_at)
        VALUES (?, ?, ?, ?, 'MEDIUM', '', 'intermediate', datetime('now'))
        """,
        (uname, ph, display, budget),
    )
    uid = cur.lastrowid
    conn.commit()
    conn.close()
    return TokenResponse(access_token=create_access_token(int(uid)), user_id=int(uid))


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest):
    uname = body.username.strip().lower()
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, password_hash FROM users WHERE lower(username) = ?",
        (uname,),
    )
    row = cur.fetchone()
    conn.close()
    if not row or not verify_password(body.password, row[1] or ""):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    uid = int(row[0])
    return TokenResponse(access_token=create_access_token(uid), user_id=uid)


def get_current_user_id(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> int:
    if creds is None or not creds.credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    uid = decode_access_token(creds.credentials)
    if uid is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return uid


@router.get("/me", response_model=UserMeResponse)
def me(user_id: int = Depends(get_current_user_id)):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, username, name, budget FROM users WHERE id = ?",
        (user_id,),
    )
    row = cur.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return UserMeResponse(id=row[0], username=row[1], name=row[2], budget=row[3])

#!/bin/sh
set -e

# Create tables and seed demo data on first boot (SQLite is empty after a fresh deploy).
python - <<'PY'
from app.database import get_connection, create_tables

create_tables()
conn = get_connection()
cur = conn.cursor()
try:
    cur.execute("SELECT COUNT(*) FROM trends")
    n = int(cur.fetchone()[0])
except Exception:
    n = 0
conn.close()

if n == 0:
    import run_seed

    run_seed.seed()
PY

exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"

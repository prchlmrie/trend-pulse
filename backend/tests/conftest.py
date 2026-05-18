import os

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("JWT_SECRET", "pytest-jwt-secret-key-min-32-chars!!")


@pytest.fixture()
def client() -> TestClient:
    from app.main import app

    with TestClient(app) as c:
        yield c

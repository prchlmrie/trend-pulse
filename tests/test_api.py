import uuid

import pytest


def test_tc01_root_returns_ok(client):
    r = client.get("/")
    assert r.status_code == 200
    assert "message" in r.json()


@pytest.fixture()
def registered_user(client):
    uname = f"u_{uuid.uuid4().hex[:10]}"
    r = client.post(
        "/auth/register",
        json={
            "username": uname,
            "password": "secret123",
            "name": "QA User",
            "budget": 1000,
        },
    )
    assert r.status_code == 200, r.text
    return {
        "username": uname,
        "password": "secret123",
        "token": r.json()["access_token"],
    }


def test_tc02_auth_register_returns_token(client):
    uname = f"u_{uuid.uuid4().hex[:10]}"
    r = client.post(
        "/auth/register",
        json={
            "username": uname,
            "password": "secret123",
            "name": "Vitest",
            "budget": 1000,
        },
    )
    assert r.status_code == 200, r.text
    assert r.json().get("access_token")


def test_tc03_auth_me_with_bearer(client, registered_user):
    me = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {registered_user['token']}"},
    )
    assert me.status_code == 200
    assert me.json()["name"] == "QA User"


def test_tc04_auth_login_returns_token(client, registered_user):
    login = client.post(
        "/auth/login",
        json={
            "username": registered_user["username"],
            "password": registered_user["password"],
        },
    )
    assert login.status_code == 200
    assert login.json().get("access_token")


def test_tc05_get_trends_list(client):
    r = client.get("/trends", params={"limit": 10})
    assert r.status_code == 200
    body = r.json()
    assert "items" in body
    assert isinstance(body["items"], list)


def test_tc06_get_dashboard_summary(client):
    r = client.get("/dashboard/summary")
    assert r.status_code == 200
    body = r.json()
    assert body is not None


def test_tc07_get_notifications(client):
    r = client.get("/notifications", params={"limit": 5})
    assert r.status_code == 200
    body = r.json()
    assert "items" in body
    assert isinstance(body["items"], list)


def test_tc08_get_data_tables(client):
    r = client.get("/data")
    assert r.status_code == 200
    body = r.json()
    assert body is not None


def test_tc09_get_all_tables(client):
    r = client.get("/all")
    assert r.status_code == 200
    body = r.json()
    assert body is not None


def test_tc10_opportunities_analyze(client):
    r = client.get(
        "/opportunities/analyze",
        params={"budget": 500.0, "top_n": 3},
    )
    assert r.status_code == 200
    body = r.json()
    assert body.get("budget") == 500.0
    assert "recommended_products" in body
    assert "remaining_budget" in body

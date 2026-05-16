from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_register_and_login():
    import uuid

    email = f"pilot-{uuid.uuid4().hex[:8]}@example.com"
    r = client.post("/api/v1/auth/register", json={"email": email, "password": "secret12"})
    assert r.status_code == 200
    assert r.json()["email"] == email

    client.post("/api/v1/auth/logout")
    r = client.post("/api/v1/auth/login", json={"email": email, "password": "secret12"})
    assert r.status_code == 200
    assert r.json()["player_id"]

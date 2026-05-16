from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_guest_session_and_missions():
    r = client.post("/api/v1/session/guest")
    assert r.status_code == 200
    r = client.get("/api/v1/missions")
    assert r.status_code == 200
    missions = r.json()["missions"]
    assert len(missions) >= 1
    tutorial = next(m for m in missions if m["slug"] == "tutorial-first-ignition")
    assert tutorial["unlocked"] is True

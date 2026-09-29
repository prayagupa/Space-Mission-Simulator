from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app
from app.services.sessions import get_session

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


def test_abort_acknowledges_only_after_releasing_the_session() -> None:
    """An abandoned launch must close cleanly after its live session is removed."""
    client.post("/api/v1/session/guest")
    response = client.post(
        "/api/v1/missions/tutorial-first-ignition/runs",
        json={"loadout": {"modules": []}},
    )
    assert response.status_code == 200
    allocation: dict[str, object] = response.json()
    run_id = allocation["run_id"]
    assert isinstance(run_id, str)
    assert get_session(run_id) is not None
    with client.websocket_connect(f"/ws/mission/{run_id}") as websocket:
        assert websocket.receive_json()["type"] == "state"
        websocket.send_json({"type": "abort"})
        while True:
            message = websocket.receive()
            if message["type"] == "websocket.close":
                assert message["code"] == 1000
                break
        assert get_session(run_id) is None


def test_flight_disconnect_still_releases_the_session() -> None:
    """Closing a normal flight retains the existing session cleanup behavior."""
    client.post("/api/v1/session/guest")
    response = client.post(
        "/api/v1/missions/tutorial-first-ignition/runs",
        json={"loadout": {"modules": []}},
    )
    assert response.status_code == 200
    allocation: dict[str, object] = response.json()
    run_id = allocation["run_id"]
    assert isinstance(run_id, str)
    with client.websocket_connect(f"/ws/mission/{run_id}") as websocket:
        assert websocket.receive_json()["type"] == "state"
    assert get_session(run_id) is None

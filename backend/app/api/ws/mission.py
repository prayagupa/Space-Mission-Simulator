import asyncio
import json
from datetime import datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app.models.entities import MissionRun, PlayerMissionProgress
from app.services.daily_challenge import daily_mission_slug
from app.services.logging import log_run_event
from app.services.sessions import get_session, remove_session
from app.sim.engine import compute_medal, compute_score, telemetry_json
from app.services.unlock import refresh_unlocks

router = APIRouter()
MEDAL_RANK = {"bronze": 1, "silver": 2, "gold": 3}


def _finalize_run(db: Session, run_id: str, session) -> dict:
    run = db.query(MissionRun).filter(MissionRun.id == run_id).first()
    if not run:
        return {"type": "mission_lost", "reason": "run_not_found"}
    world = session.world
    score = compute_score(world)
    daily = daily_mission_slug(db)
    if daily.get("slug") == session.mission_slug and world.status == "won":
        score = int(score * daily.get("bonus_multiplier", 1.0))
    medal = compute_medal(session.mission_config, world, score)
    run.status = world.status
    run.score = score
    run.medal = medal
    run.telemetry_json = telemetry_json(world)
    run.replay_json = json.dumps(session.replay_frames)
    run.ended_at = datetime.utcnow()

    progress = (
        db.query(PlayerMissionProgress)
        .filter(
            PlayerMissionProgress.player_id == run.player_id,
            PlayerMissionProgress.mission_id == run.mission_id,
        )
        .first()
    )
    if progress and medal:
        old = MEDAL_RANK.get(progress.best_medal or "", 0)
        new = MEDAL_RANK.get(medal, 0)
        if new > old:
            progress.best_medal = medal

    db.commit()
    player = run.player
    if player:
        refresh_unlocks(db, player)

    log_run_event(run_id, "mission_end", status=world.status, score=score, medal=medal)
    msg_type = "mission_won" if world.status == "won" else "mission_lost"
    return {
        "type": msg_type,
        "status": world.status,
        "score": score,
        "medal": medal,
        "telemetry": json.loads(run.telemetry_json),
        "daily_bonus": daily.get("slug") == session.mission_slug and world.status == "won",
    }


@router.websocket("/ws/mission/{run_id}")
async def mission_websocket(websocket: WebSocket, run_id: str) -> None:
    session = get_session(run_id)
    if not session:
        await websocket.close(code=4004)
        return

    await websocket.accept()
    log_run_event(run_id, "ws_connected")
    dt = 1.0 / settings.tick_rate_hz
    running = True

    async def tick_loop() -> None:
        while running and session.world.status == "active":
            snap = session.tick()
            try:
                await websocket.send_json(snap)
            except Exception:
                break
            if session.world.status != "active":
                db = SessionLocal()
                try:
                    final = _finalize_run(db, run_id, session)
                    await websocket.send_json(final)
                finally:
                    db.close()
                break
            await asyncio.sleep(dt)

    tick_task = asyncio.create_task(tick_loop())

    try:
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)
            if data.get("type") == "input":
                session.apply_input(
                    thrust=bool(data.get("thrust")),
                    rotate=int(data.get("rotate", 0)),
                    seq=int(data.get("seq", 0)),
                )
            elif data.get("type") == "abort":
                session.world.status = "aborted"
                break
    except WebSocketDisconnect:
        log_run_event(run_id, "ws_disconnect")
    finally:
        running = False
        tick_task.cancel()
        remove_session(run_id)

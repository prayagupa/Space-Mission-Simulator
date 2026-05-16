import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_player
from app.database import get_db
from app.models.entities import MissionDefinition, MissionRun, Player, PlayerMissionProgress
from app.schemas.api import CreateRunIn
from app.services.loadout import apply_loadout_to_config
from app.services.crafting import player_crafted
from app.services.sessions import MissionSession, register_session
from app.services.unlock import mission_config

router = APIRouter()

BASE_MODULES = [
    {"id": "standard_tank", "name": "Standard Fuel Tank", "mass": 10},
    {"id": "reinforced_hull", "name": "Reinforced Hull", "mass": 15},
]


@router.get("/missions")
def list_missions(
    db: Session = Depends(get_db),
    player: Player = Depends(get_current_player),
) -> dict:
    missions = db.query(MissionDefinition).order_by(MissionDefinition.difficulty).all()
    progress = {
        p.mission_id: p
        for p in db.query(PlayerMissionProgress).filter(PlayerMissionProgress.player_id == player.id).all()
    }
    items = []
    for m in missions:
        p = progress.get(m.id)
        cfg = mission_config(m)
        items.append(
            {
                "slug": m.slug,
                "name": m.name,
                "difficulty": m.difficulty,
                "unlocked": p.unlocked if p else False,
                "best_medal": p.best_medal if p else None,
                "prerequisites": cfg.get("prerequisites", []),
                "map_position": {"x": m.map_x, "y": m.map_y},
            }
        )
    return {"missions": items}


@router.get("/missions/{slug}")
def get_mission(
    slug: str,
    db: Session = Depends(get_db),
    player: Player = Depends(get_current_player),
) -> dict:
    mission = db.query(MissionDefinition).filter(MissionDefinition.slug == slug).first()
    if not mission:
        raise HTTPException(404, "Mission not found")
    p = (
        db.query(PlayerMissionProgress)
        .filter(
            PlayerMissionProgress.player_id == player.id,
            PlayerMissionProgress.mission_id == mission.id,
        )
        .first()
    )
    if p and not p.unlocked:
        raise HTTPException(403, "Mission locked")
    cfg = mission_config(mission)
    crafted = player_crafted(player)
    modules = list(BASE_MODULES)
    crafted_names = {
        "extended_tank": {"id": "extended_tank", "name": "Extended Fuel Tank", "mass": 14},
        "turbo_thruster": {"id": "turbo_thruster", "name": "Turbo Thruster", "mass": 12},
    }
    for cid in crafted:
        if cid in crafted_names:
            modules.append(crafted_names[cid])
    return {
        "slug": mission.slug,
        "name": mission.name,
        "difficulty": mission.difficulty,
        "briefing": mission.briefing,
        "objective": cfg.get("objective", {}),
        "loadout": {"modules": modules, "mass_budget": 100},
    }


@router.post("/missions/{slug}/runs")
def create_run(
    slug: str,
    body: CreateRunIn,
    db: Session = Depends(get_db),
    player: Player = Depends(get_current_player),
) -> dict:
    mission = db.query(MissionDefinition).filter(MissionDefinition.slug == slug).first()
    if not mission:
        raise HTTPException(404, "Mission not found")
    p = (
        db.query(PlayerMissionProgress)
        .filter(
            PlayerMissionProgress.player_id == player.id,
            PlayerMissionProgress.mission_id == mission.id,
        )
        .first()
    )
    if p and not p.unlocked:
        raise HTTPException(403, "Mission locked")

    cfg = mission_config(mission)
    modules = body.loadout.get("modules", ["standard_tank", "reinforced_hull"])
    cfg = apply_loadout_to_config(cfg, modules)

    run = MissionRun(
        player_id=player.id,
        mission_id=mission.id,
        status="active",
        loadout_json=json.dumps(body.loadout),
    )
    db.add(run)
    if p:
        p.attempts += 1
    db.commit()
    db.refresh(run)

    session = MissionSession.create(run.id, cfg, mission_slug=slug)
    register_session(session)

    return {
        "run_id": run.id,
        "ws_url": f"/ws/mission/{run.id}",
        "mission_slug": slug,
    }


@router.get("/runs/{run_id}/result")
def get_run_result(
    run_id: str,
    db: Session = Depends(get_db),
    player: Player = Depends(get_current_player),
) -> dict:
    run = db.query(MissionRun).filter(MissionRun.id == run_id, MissionRun.player_id == player.id).first()
    if not run:
        raise HTTPException(404, "Run not found")
    telemetry = json.loads(run.telemetry_json or "{}")
    replay = json.loads(run.replay_json or "[]")
    return {
        "run_id": run.id,
        "status": run.status,
        "score": run.score,
        "medal": run.medal,
        "telemetry": telemetry,
        "replay_frames": len(replay),
    }


@router.get("/runs/{run_id}/replay")
def get_run_replay(
    run_id: str,
    db: Session = Depends(get_db),
    player: Player = Depends(get_current_player),
) -> dict:
    run = db.query(MissionRun).filter(MissionRun.id == run_id, MissionRun.player_id == player.id).first()
    if not run:
        raise HTTPException(404, "Run not found")
    return {"run_id": run.id, "frames": json.loads(run.replay_json or "[]")}

import json

from sqlalchemy.orm import Session

from app.content.loader import load_all_missions
from app.models.entities import MissionDefinition, Player, PlayerMissionProgress


def ensure_progress_rows(db: Session, player: Player) -> None:
    missions = db.query(MissionDefinition).order_by(MissionDefinition.difficulty).all()
    existing = {
        p.mission_id
        for p in db.query(PlayerMissionProgress).filter(PlayerMissionProgress.player_id == player.id).all()
    }
    for m in missions:
        if m.id not in existing:
            db.add(PlayerMissionProgress(player_id=player.id, mission_id=m.id, unlocked=False))
    db.commit()


def refresh_unlocks(db: Session, player: Player) -> None:
    missions = {m.slug: m for m in db.query(MissionDefinition).all()}
    progress = {
        p.mission_id: p
        for p in db.query(PlayerMissionProgress).filter(PlayerMissionProgress.player_id == player.id).all()
    }
    completed_slugs = set()
    for m in missions.values():
        p = progress.get(m.id)
        if p and p.best_medal:
            completed_slugs.add(m.slug)

    yaml_missions = {m["slug"]: m for m in load_all_missions()}
    for slug, mission in missions.items():
        p = progress.get(mission.id)
        if not p:
            continue
        yaml = yaml_missions.get(slug, {})
        prereqs = yaml.get("prerequisites", [])
        if not prereqs:
            p.unlocked = True
        else:
            p.unlocked = all(pr in completed_slugs for pr in prereqs)
    db.commit()


def mission_config(mission: MissionDefinition) -> dict:
    return json.loads(mission.config_json)

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_player
from app.database import get_db
from app.models.entities import MissionDefinition, Player, PlayerMissionProgress

router = APIRouter()


@router.get("/progress")
def get_progress(
    db: Session = Depends(get_db),
    player: Player = Depends(get_current_player),
) -> dict:
    missions = db.query(MissionDefinition).all()
    progress = {
        p.mission_id: p
        for p in db.query(PlayerMissionProgress).filter(PlayerMissionProgress.player_id == player.id).all()
    }
    items = []
    for m in missions:
        p = progress.get(m.id)
        items.append(
            {
                "mission_slug": m.slug,
                "unlocked": p.unlocked if p else False,
                "best_medal": p.best_medal if p else None,
                "attempts": p.attempts if p else 0,
            }
        )
    return {"player_id": player.id, "missions": items}

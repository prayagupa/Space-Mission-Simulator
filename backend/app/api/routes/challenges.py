from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_player
from app.database import get_db
from app.models.entities import Player
from app.services.daily_challenge import daily_mission_slug

router = APIRouter()


@router.get("/daily-challenge")
def get_daily_challenge(
    db: Session = Depends(get_db),
    _player: Player = Depends(get_current_player),
) -> dict:
    return daily_mission_slug(db)

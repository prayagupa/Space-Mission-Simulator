from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_player, set_player_cookie
from app.database import get_db
from app.models.entities import Player
from app.schemas.api import SessionRestoreIn

router = APIRouter()


@router.post("/session/guest")
def create_guest_session(
    response: Response,
    player: Player = Depends(get_current_player),
) -> dict:
    set_player_cookie(response, player.id)
    return {"player_id": player.id, "message": "Guest session ready", "is_guest": player.is_guest}


@router.post("/session/restore")
def restore_session(
    body: SessionRestoreIn,
    response: Response,
    db: Session = Depends(get_db),
) -> dict:
    player = db.query(Player).filter(Player.id == body.player_id).first()
    if not player:
        raise HTTPException(404, "Player not found")
    set_player_cookie(response, player.id)
    return {"player_id": player.id, "message": "Session restored", "is_guest": player.is_guest}

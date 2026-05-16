from fastapi import Cookie, Depends, Response
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.entities import Player
from app.services.unlock import ensure_progress_rows, refresh_unlocks


def set_player_cookie(response: Response, player_id: str) -> None:
    response.set_cookie(
        key=settings.session_cookie_name,
        value=player_id,
        httponly=True,
        samesite="lax",
        max_age=settings.session_max_age,
    )


def get_current_player(
    response: Response,
    db: Session = Depends(get_db),
    session_id: str | None = Cookie(default=None, alias=settings.session_cookie_name),
) -> Player:
    if session_id:
        player = db.query(Player).filter(Player.id == session_id).first()
        if player:
            ensure_progress_rows(db, player)
            refresh_unlocks(db, player)
            return player

    player = Player(is_guest=True, display_name="Commander")
    db.add(player)
    db.commit()
    db.refresh(player)
    ensure_progress_rows(db, player)
    refresh_unlocks(db, player)
    set_player_cookie(response, player.id)
    return player

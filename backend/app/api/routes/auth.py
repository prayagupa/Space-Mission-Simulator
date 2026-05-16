from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_player, set_player_cookie
from app.config import settings
from app.database import get_db
from app.models.entities import Player
from app.schemas.api import AuthOut, LoginIn, RegisterIn
from app.services.auth import hash_password, verify_password
from app.services.progress_merge import merge_guest_into_user
from app.services.unlock import ensure_progress_rows, refresh_unlocks

router = APIRouter()


@router.post("/auth/register", response_model=AuthOut)
def register(
    body: RegisterIn,
    response: Response,
    db: Session = Depends(get_db),
    guest: Player = Depends(get_current_player),
) -> AuthOut:
    existing = db.query(Player).filter(Player.email == body.email).first()
    if existing:
        raise HTTPException(400, "Email already registered")

    user = Player(
        is_guest=False,
        email=body.email,
        password_hash=hash_password(body.password),
        display_name=body.display_name or body.email.split("@")[0],
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    ensure_progress_rows(db, user)

    if guest.is_guest:
        merge_guest_into_user(db, guest, user)

    refresh_unlocks(db, user)
    set_player_cookie(response, user.id)

    return AuthOut(
        player_id=user.id,
        email=user.email,
        display_name=user.display_name,
        message="Account created",
    )


@router.post("/auth/login", response_model=AuthOut)
def login(
    body: LoginIn,
    response: Response,
    db: Session = Depends(get_db),
    guest: Player = Depends(get_current_player),
) -> AuthOut:
    user = db.query(Player).filter(Player.email == body.email).first()
    if not user or not user.password_hash or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password")

    if guest.is_guest and guest.id != user.id:
        merge_guest_into_user(db, guest, user)

    refresh_unlocks(db, user)
    set_player_cookie(response, user.id)

    return AuthOut(
        player_id=user.id,
        email=user.email,
        display_name=user.display_name,
        message="Logged in",
    )


@router.post("/auth/logout")
def logout(response: Response) -> dict:
    response.delete_cookie(settings.session_cookie_name)
    return {"message": "Logged out"}


@router.get("/auth/me")
def me(player: Player = Depends(get_current_player)) -> dict:
    return {
        "player_id": player.id,
        "email": player.email,
        "display_name": player.display_name,
        "is_guest": player.is_guest,
    }

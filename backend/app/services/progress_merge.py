from sqlalchemy.orm import Session

from app.models.entities import MissionRun, Player, PlayerMissionProgress

MEDAL_RANK = {"bronze": 1, "silver": 2, "gold": 3}


def merge_guest_into_user(db: Session, guest: Player, user: Player) -> None:
    if guest.id == user.id or not guest.is_guest:
        return

    guest_progress = db.query(PlayerMissionProgress).filter(PlayerMissionProgress.player_id == guest.id).all()
    user_map = {
        p.mission_id: p
        for p in db.query(PlayerMissionProgress).filter(PlayerMissionProgress.player_id == user.id).all()
    }

    for gp in guest_progress:
        up = user_map.get(gp.mission_id)
        if not up:
            continue
        up.unlocked = up.unlocked or gp.unlocked
        up.attempts = max(up.attempts, gp.attempts)
        if gp.best_medal:
            old = MEDAL_RANK.get(up.best_medal or "", 0)
            new = MEDAL_RANK.get(gp.best_medal, 0)
            if new > old:
                up.best_medal = gp.best_medal

    db.query(MissionRun).filter(MissionRun.player_id == guest.id).update(
        {MissionRun.player_id: user.id},
        synchronize_session=False,
    )
    db.query(PlayerMissionProgress).filter(PlayerMissionProgress.player_id == guest.id).delete(
        synchronize_session=False
    )
    db.delete(guest)
    db.commit()

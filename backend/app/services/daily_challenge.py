import hashlib
from datetime import date

from sqlalchemy.orm import Session

from app.models.entities import MissionDefinition


def daily_mission_slug(db: Session, today: date | None = None) -> dict:
    today = today or date.today()
    missions = db.query(MissionDefinition).order_by(MissionDefinition.difficulty).all()
    if not missions:
        return {"date": str(today), "slug": None, "name": None, "bonus_multiplier": 1.0}
    seed = int(hashlib.md5(today.isoformat().encode()).hexdigest(), 16)
    pick = missions[seed % len(missions)]
    return {
        "date": str(today),
        "slug": pick.slug,
        "name": pick.name,
        "bonus_multiplier": 1.25,
        "description": f"Complete {pick.name} today for a 25% score bonus.",
    }

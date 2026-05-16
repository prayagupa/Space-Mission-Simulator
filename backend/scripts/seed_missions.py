import json
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))

from app.content.loader import load_all_missions, mission_config_json
from app.database import SessionLocal, init_db
from app.models.entities import MissionDefinition, Player
from app.services.unlock import ensure_progress_rows, refresh_unlocks

MAP_POSITIONS = {
    "tutorial-first-ignition": (120, 280),
    "low-earth-insertion": (320, 180),
    "debris-field": (520, 320),
    "moon-landing": (720, 200),
    "asteroid-survey": (400, 420),
}


def seed_if_empty() -> None:
    init_db()
    db = SessionLocal()
    try:
        existing = {m.slug: m for m in db.query(MissionDefinition).all()}
        for data in load_all_missions():
            slug = data["slug"]
            fallback = MAP_POSITIONS.get(slug, (0, 0))
            pos = data.get("map_position") or fallback
            if isinstance(pos, dict):
                mx = int(pos.get("x", fallback[0]))
                my = int(pos.get("y", fallback[1]))
            else:
                mx, my = int(pos[0]), int(pos[1])
            if slug in existing:
                row = existing[slug]
                row.name = data.get("name", slug)
                row.difficulty = int(data.get("difficulty", 1))
                row.briefing = data.get("briefing", "")
                row.config_json = mission_config_json(data)
                row.map_x = mx
                row.map_y = my
            else:
                db.add(
                    MissionDefinition(
                        slug=slug,
                        name=data.get("name", slug),
                        difficulty=int(data.get("difficulty", 1)),
                        briefing=data.get("briefing", ""),
                        config_json=mission_config_json(data),
                        map_x=mx,
                        map_y=my,
                    )
                )
        db.commit()

        players = db.query(Player).all()
        for player in players:
            ensure_progress_rows(db, player)
            refresh_unlocks(db, player)
    finally:
        db.close()


if __name__ == "__main__":
    seed_if_empty()
    print("Missions seeded.")

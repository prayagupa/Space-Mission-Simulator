import json
from pathlib import Path

import yaml

from app.config import CONTENT_DIR


def load_mission_yaml(path: Path) -> dict:
    with path.open(encoding="utf-8") as f:
        return yaml.safe_load(f)


def load_all_missions() -> list[dict]:
    missions = []
    if not CONTENT_DIR.exists():
        return missions
    for path in sorted(CONTENT_DIR.glob("*.yaml")):
        data = load_mission_yaml(path)
        data["slug"] = data.get("slug", path.stem)
        missions.append(data)
    return missions


def mission_config_json(mission: dict) -> str:
    return json.dumps(mission)

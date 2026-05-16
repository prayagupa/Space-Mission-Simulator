import json

from sqlalchemy.orm import Session

from app.models.entities import Player

RECIPES = [
    {
        "id": "extended_tank",
        "name": "Extended Fuel Tank",
        "requires_medals": {"tutorial-first-ignition": "bronze"},
        "cost_scrap": 10,
    },
    {
        "id": "turbo_thruster",
        "name": "Turbo Thruster",
        "requires_medals": {"low-earth-insertion": "silver"},
        "cost_scrap": 15,
    },
    {
        "id": "reinforced_hull",
        "name": "Reinforced Hull",
        "requires_medals": {"debris-field": "bronze"},
        "cost_scrap": 12,
    },
]

MEDAL_RANK = {"bronze": 1, "silver": 2, "gold": 3}


def player_crafted(player: Player) -> list[str]:
    try:
        return json.loads(player.crafted_modules_json or "[]")
    except json.JSONDecodeError:
        return []


def player_scrap(player: Player, db: Session) -> int:
    from app.models.entities import PlayerMissionProgress

    rows = db.query(PlayerMissionProgress).filter(PlayerMissionProgress.player_id == player.id).all()
    scrap = 0
    for r in rows:
        if r.best_medal == "gold":
            scrap += 15
        elif r.best_medal == "silver":
            scrap += 8
        elif r.best_medal == "bronze":
            scrap += 3
    return scrap


def can_craft(player: Player, db: Session, recipe_id: str) -> tuple[bool, str]:
    recipe = next((r for r in RECIPES if r["id"] == recipe_id), None)
    if not recipe:
        return False, "Unknown recipe"
    crafted = player_crafted(player)
    if recipe_id in crafted:
        return False, "Already crafted"
    if player_scrap(player, db) < recipe["cost_scrap"]:
        return False, "Not enough scrap"
    from app.models.entities import MissionDefinition, PlayerMissionProgress

    rows = (
        db.query(MissionDefinition, PlayerMissionProgress)
        .join(PlayerMissionProgress, PlayerMissionProgress.mission_id == MissionDefinition.id)
        .filter(PlayerMissionProgress.player_id == player.id)
        .all()
    )
    progress = {m.slug: p for m, p in rows}
    for slug, min_medal in recipe.get("requires_medals", {}).items():
        p = progress.get(slug)
        if not p or not p.best_medal:
            return False, f"Requires {min_medal} on {slug}"
        if MEDAL_RANK.get(p.best_medal, 0) < MEDAL_RANK.get(min_medal, 0):
            return False, f"Requires {min_medal} on {slug}"
    return True, "OK"


def craft_module(player: Player, db: Session, recipe_id: str) -> list[str]:
    ok, msg = can_craft(player, db, recipe_id)
    if not ok:
        raise ValueError(msg)
    crafted = player_crafted(player)
    crafted.append(recipe_id)
    player.crafted_modules_json = json.dumps(crafted)
    db.commit()
    return crafted

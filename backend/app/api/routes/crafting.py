from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_player
from app.database import get_db
from app.models.entities import Player
from app.schemas.api import CraftIn
from app.services.crafting import RECIPES, can_craft, craft_module, player_crafted, player_scrap

router = APIRouter()


@router.get("/crafting/recipes")
def list_recipes(
    db: Session = Depends(get_db),
    player: Player = Depends(get_current_player),
) -> dict:
    crafted = player_crafted(player)
    scrap = player_scrap(player, db)
    items = []
    for r in RECIPES:
        ok, reason = can_craft(player, db, r["id"])
        items.append(
            {
                **r,
                "crafted": r["id"] in crafted,
                "can_craft": ok,
                "reason": reason if not ok else None,
            }
        )
    return {"scrap": scrap, "crafted": crafted, "recipes": items}


@router.post("/crafting/craft")
def craft(
    body: CraftIn,
    db: Session = Depends(get_db),
    player: Player = Depends(get_current_player),
) -> dict:
    try:
        crafted = craft_module(player, db, body.recipe_id)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    return {"crafted": crafted, "scrap": player_scrap(player, db)}

"""Apply hangar module selections to simulation parameters."""

MODULE_EFFECTS = {
    "standard_tank": {"fuel_mult": 1.0},
    "extended_tank": {"fuel_mult": 1.35},
    "reinforced_hull": {"hull_mult": 1.25},
    "turbo_thruster": {"thrust_mult": 1.15},
}


def loadout_modifiers(modules: list[str]) -> dict:
    fuel_mult = 1.0
    hull_mult = 1.0
    thrust_mult = 1.0
    for mod in modules:
        eff = MODULE_EFFECTS.get(mod, {})
        fuel_mult *= eff.get("fuel_mult", 1.0)
        hull_mult *= eff.get("hull_mult", 1.0)
        thrust_mult *= eff.get("thrust_mult", 1.0)
    return {"fuel_mult": fuel_mult, "hull_mult": hull_mult, "thrust_mult": thrust_mult}


def apply_loadout_to_config(config: dict, modules: list[str]) -> dict:
    mods = loadout_modifiers(modules)
    entities = []
    for ent in config.get("entities", []):
        ent = dict(ent)
        if ent.get("template") == "player_ship":
            payload = dict(ent.get("payload", {}))
            payload["fuel"] = float(payload.get("fuel", 100)) * mods["fuel_mult"]
            payload["hull"] = float(payload.get("hull", 100)) * mods["hull_mult"]
            payload["thrust_power"] = float(payload.get("thrust_power", 220)) * mods["thrust_mult"]
            ent["payload"] = payload
        entities.append(ent)
    out = dict(config)
    out["entities"] = entities
    return out

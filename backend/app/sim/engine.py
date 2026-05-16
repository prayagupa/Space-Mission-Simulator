import json
import math
from dataclasses import dataclass

from app.sim.components import Beacon, Body, Debris, FuelTank, Hull, OrbitBandMarker, Planet, Ship, Thrust
from app.sim.objectives import ObjectiveState
from app.sim.world import World


def build_world_from_config(config: dict) -> World:
    world_cfg = config.get("world", {})
    w = World(
        width=float(world_cfg.get("bounds", {}).get("width", 4000)),
        height=float(world_cfg.get("bounds", {}).get("height", 4000)),
        gravity_mode=world_cfg.get("gravity", "down"),
        gravity_strength=float(world_cfg.get("gravity_strength", 28)),
        drag=float(world_cfg.get("drag", 0.12)),
        body_cx=float(world_cfg.get("body_center", {}).get("x", 2000)),
        body_cy=float(world_cfg.get("body_center", {}).get("y", 3200)),
        body_radius=float(world_cfg.get("body_radius", 800)),
    )

    obj_cfg = config.get("objective", {})
    w.objective = ObjectiveState(
        label=obj_cfg.get("label", "Complete mission"),
        type=obj_cfg.get("type", "altitude_band"),
        required_seconds=float(obj_cfg.get("required_seconds", 5)),
        altitude_min_km=float(obj_cfg.get("altitude_min_km", 80)),
        peri_km=float(obj_cfg.get("peri_km", 200)),
        apo_km=float(obj_cfg.get("apo_km", 280)),
        target_distance=float(obj_cfg.get("target_distance", 60)),
    )

    for ent in config.get("entities", []):
        eid = ent.get("id", "entity")
        template = ent.get("template", "")
        spawn = ent.get("spawn", {})
        payload = ent.get("payload", {})
        x = float(spawn.get("x", 400))
        y = float(spawn.get("y", 600))

        if template == "player_ship":
            w.ship = Ship(
                entity_id=eid,
                body=Body(x=x, y=y, angle=-math.pi / 2),
                fuel=FuelTank(capacity=float(payload.get("fuel", 100))),
                hull=Hull(max_hull=float(payload.get("hull", 100))),
                thrust=Thrust(power=float(payload.get("thrust_power", 220))),
            )
        elif template == "debris":
            w.debris.append(
                Debris(
                    entity_id=eid,
                    x=x,
                    y=y,
                    vx=float(payload.get("vx", 30)),
                    vy=float(payload.get("vy", -20)),
                )
            )
        elif template == "beacon":
            w.beacon = Beacon(entity_id=eid, x=x, y=y, radius=float(payload.get("radius", 40)))
        elif template == "planet":
            w.planet = Planet(
                entity_id=eid,
                cx=float(payload.get("cx", w.body_cx)),
                cy=float(payload.get("cy", w.body_cy)),
                radius=float(payload.get("radius", w.body_radius)),
            )
        elif template == "orbit_band":
            w.markers.append(
                OrbitBandMarker(
                    entity_id=eid,
                    peri_km=float(payload.get("peri_km", 200)),
                    apo_km=float(payload.get("apo_km", 280)),
                )
            )
            w.objective.peri_km = float(payload.get("peri_km", 200))
            w.objective.apo_km = float(payload.get("apo_km", 280))

    if w.planet is None and w.gravity_mode == "radial":
        w.planet = Planet("planet", w.body_cx, w.body_cy, w.body_radius)

    return w


def compute_score(world: World) -> int:
    if world.status != "won":
        return 0
    ship = world.ship
    if not ship:
        return 0
    fuel_pct = ship.fuel.remaining / ship.fuel.capacity if ship.fuel.capacity else 0
    hull_pct = ship.hull.current / ship.hull.max_hull if ship.hull.max_hull else 0
    time_bonus = max(0, 300 - int(world.elapsed))
    return int(500 + fuel_pct * 200 + hull_pct * 200 + time_bonus)


def compute_medal(config: dict, world: World, score: int) -> str | None:
    if world.status != "won":
        return None
    ship = world.ship
    if not ship:
        return "bronze"
    fuel_pct = (ship.fuel.remaining / ship.fuel.capacity) * 100 if ship.fuel.capacity else 0
    thresholds = config.get("medal_thresholds", {})
    gold = thresholds.get("gold", {})
    silver = thresholds.get("silver", {})
    bronze = thresholds.get("bronze", {})
    collisions = world.collisions

    if gold and fuel_pct >= gold.get("fuel_pct_min", 40) and collisions <= gold.get("max_collisions", 0):
        return "gold"
    if silver and fuel_pct >= silver.get("fuel_pct_min", 20) and collisions <= silver.get("max_collisions", 1):
        return "silver"
    if bronze.get("complete", True):
        return "bronze"
    return "bronze"


def telemetry_json(world: World) -> str:
    ship = world.ship
    data = {
        "elapsed": world.elapsed,
        "collisions": world.collisions,
        "fuel_pct": ship.fuel.remaining / ship.fuel.capacity if ship and ship.fuel.capacity else 0,
        "hull_pct": ship.hull.current / ship.hull.max_hull if ship and ship.hull.max_hull else 0,
    }
    return json.dumps(data)

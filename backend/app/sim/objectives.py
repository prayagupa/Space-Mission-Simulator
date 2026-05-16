from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.sim.world import World


@dataclass
class ObjectiveState:
    label: str
    progress: float = 0.0
    type: str = ""
    band_seconds: float = 0.0
    required_seconds: float = 5.0
    target_distance: float = 60.0
    peri_km: float = 200.0
    apo_km: float = 280.0
    altitude_min_km: float = 80.0

    def to_dict(self) -> dict:
        return {
            "label": self.label,
            "progress": min(1.0, max(0.0, self.progress)),
            "type": self.type,
        }


def update_objective(world: "World", dt: float) -> None:
    obj = world.objective
    ship = world.ship
    if ship is None:
        return

    if obj.type == "altitude_band":
        alt = ship.altitude_km(world)
        in_band = alt >= obj.altitude_min_km
        if in_band:
            obj.band_seconds += dt
        else:
            obj.band_seconds = max(0.0, obj.band_seconds - dt * 0.5)
        obj.progress = min(1.0, obj.band_seconds / obj.required_seconds)
        if obj.band_seconds >= obj.required_seconds:
            world.status = "won"

    elif obj.type == "orbit_band":
        cx, cy = world.body_cx, world.body_cy
        scx = ship.body.x + ship.body.width / 2
        scy = ship.body.y + ship.body.height / 2
        dist = ((scx - cx) ** 2 + (scy - cy) ** 2) ** 0.5
        alt_km = (dist - world.body_radius) / 10.0
        in_band = obj.peri_km <= alt_km <= obj.apo_km
        if in_band:
            obj.band_seconds += dt
        else:
            obj.band_seconds = max(0.0, obj.band_seconds - dt * 0.5)
        obj.progress = min(1.0, obj.band_seconds / obj.required_seconds)
        if obj.band_seconds >= obj.required_seconds:
            world.status = "won"

    elif obj.type == "reach_beacon":
        beacon = world.beacon
        if beacon:
            dist = ship.distance_to(beacon.x, beacon.y)
            obj.progress = max(0.0, 1.0 - dist / 800.0)
            if dist <= obj.target_distance:
                world.status = "won"

    if ship.hull.current <= 0:
        world.status = "lost"
        world.events.append({"name": "hull_destroyed"})

    fuel = ship.fuel
    if fuel.remaining <= 0 and obj.type == "reach_beacon":
        stall_time = getattr(world, "_stall_time", 0.0) + dt
        world._stall_time = stall_time
        if stall_time > 8.0 and world.status == "active":
            world.status = "lost"
            world.events.append({"name": "fuel_empty"})

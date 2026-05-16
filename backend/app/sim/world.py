from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING

from app.sim.objectives import ObjectiveState, update_objective

if TYPE_CHECKING:
    from app.sim.components import Beacon, Debris, OrbitBandMarker, Planet, PlayerInput, Ship


def _player_input() -> PlayerInput:
    from app.sim.components import PlayerInput

    return PlayerInput()


@dataclass
class World:
    width: float = 4000.0
    height: float = 4000.0
    gravity_mode: str = "down"
    gravity_strength: float = 28.0
    drag: float = 0.12
    body_cx: float = 2000.0
    body_cy: float = 3200.0
    body_radius: float = 800.0
    tick: int = 0
    elapsed: float = 0.0
    status: str = "active"
    ship: Ship | None = None
    debris: list[Debris] = field(default_factory=list)
    beacon: Beacon | None = None
    planet: Planet | None = None
    markers: list[OrbitBandMarker] = field(default_factory=list)
    input: PlayerInput = field(default_factory=_player_input)
    objective: ObjectiveState = field(default_factory=lambda: ObjectiveState(label="", type=""))
    events: list[dict] = field(default_factory=list)
    collisions: int = 0
    _stall_time: float = 0.0

    @property
    def fuel(self):
        return self.ship.fuel if self.ship else None

    def entities_with_update(self):
        if self.ship:
            yield self.ship
        for d in self.debris:
            yield d

    def tick_sim(self, dt: float) -> None:
        if self.status != "active":
            return
        self.events.clear()
        for ent in self.entities_with_update():
            if hasattr(ent, "update"):
                ent.update(dt, self)
        update_objective(self, dt)
        self.tick += 1
        self.elapsed += dt

    def snapshot(self) -> dict:
        entities = []
        if self.ship:
            entities.append(self.ship.render_state())
        for d in self.debris:
            entities.append(d.render_state())
        if self.beacon:
            entities.append(self.beacon.render_state())
        if self.planet:
            entities.append(self.planet.render_state())
        for m in self.markers:
            entities.append(m.render_state())
        alt_km = self.ship.altitude_km(self) if self.ship else 0
        return {
            "type": "state",
            "tick": self.tick,
            "elapsed": round(self.elapsed, 2),
            "status": self.status,
            "entities": entities,
            "events": list(self.events),
            "objective": self.objective.to_dict(),
            "altitude_km": round(alt_km, 1),
        }

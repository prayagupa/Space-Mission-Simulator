import math
from dataclasses import dataclass
from typing import TYPE_CHECKING

from app.sim.physics import aabb_overlap, apply_drag, apply_gravity, integrate

if TYPE_CHECKING:
    from app.sim.world import World


@dataclass
class Body:
    x: float
    y: float
    vx: float = 0.0
    vy: float = 0.0
    angle: float = -math.pi / 2
    angular_vel: float = 0.0
    width: float = 48.0
    height: float = 48.0


class FuelTank:
    def __init__(self, capacity: float = 100.0) -> None:
        self.capacity = capacity
        self.remaining = capacity

    def update(self, dt: float, world: "World") -> None:
        ship = world.ship
        if ship is None:
            return
        if world.input.thrust and self.remaining > 0:
            self.remaining = max(0.0, self.remaining - 12.0 * dt)

    def render_state(self) -> dict:
        return {"type": "fuel", "pct": self.remaining / self.capacity if self.capacity else 0}


class Hull:
    def __init__(self, max_hull: float = 100.0) -> None:
        self.max_hull = max_hull
        self.current = max_hull

    def damage(self, amount: float, world: "World") -> None:
        prev = self.current
        self.current = max(0.0, self.current - amount)
        if self.current < prev:
            world.events.append({"name": "collision", "hull": self.current})

    def render_state(self) -> dict:
        return {"type": "hull", "pct": self.current / self.max_hull if self.max_hull else 0}


class Thrust:
    def __init__(self, power: float = 220.0) -> None:
        self.power = power

    def update(self, dt: float, world: "World") -> None:
        ship = world.ship
        fuel = world.fuel
        if ship is None or fuel is None:
            return
        if world.input.thrust and fuel.remaining > 0:
            ship.body.vx += math.cos(ship.body.angle) * self.power * dt
            ship.body.vy += math.sin(ship.body.angle) * self.power * dt
            if fuel.remaining / fuel.capacity < 0.2:
                world.events.append({"name": "fuel_low"})


@dataclass
class Ship:
    entity_id: str
    body: Body
    fuel: FuelTank
    hull: Hull
    thrust: Thrust

    def update(self, dt: float, world: "World") -> None:
        rotate = world.input.rotate
        if rotate:
            ship_rotate_speed = 2.8
            self.body.angular_vel = rotate * ship_rotate_speed
        else:
            self.body.angular_vel *= 0.85
        self.body.angle += self.body.angular_vel * dt

        self.fuel.update(dt, world)
        self.thrust.update(dt, world)

        b = self.body
        b.vx, b.vy = apply_gravity(
            b.x,
            b.y,
            b.vx,
            b.vy,
            mode=world.gravity_mode,
            strength=world.gravity_strength,
            body_cx=world.body_cx,
            body_cy=world.body_cy,
            dt=dt,
        )
        b.vx, b.vy = apply_drag(b.vx, b.vy, world.drag, dt)
        b.x, b.y, b.vx, b.vy = integrate(b.x, b.y, b.vx, b.vy, dt)

        b.x = max(0, min(world.width - b.width, b.x))
        b.y = max(0, min(world.height - b.height, b.y))

        self._check_collisions(world)

    def _check_collisions(self, world: "World") -> None:
        b = self.body
        for ent in world.debris:
            if ent.hit_cooldown <= 0 and aabb_overlap(
                b.x, b.y, b.width, b.height, ent.x, ent.y, ent.width, ent.height
            ):
                self.hull.damage(15, world)
                world.collisions += 1
                ent.hit_cooldown = 1.0

    def altitude_km(self, world: "World") -> float:
        return (world.height - self.body.y - self.body.height / 2) / 10.0

    def distance_to(self, x: float, y: float) -> float:
        cx = self.body.x + self.body.width / 2
        cy = self.body.y + self.body.height / 2
        return math.hypot(x - cx, y - cy)

    def render_state(self) -> dict:
        b = self.body
        return {
            "id": self.entity_id,
            "kind": "ship",
            "x": b.x,
            "y": b.y,
            "angle": b.angle,
            "vx": b.vx,
            "vy": b.vy,
            "components": {
                "fuel": self.fuel.render_state(),
                "hull": self.hull.render_state(),
            },
        }


@dataclass
class Debris:
    entity_id: str
    x: float
    y: float
    width: float = 28.0
    height: float = 28.0
    vx: float = 0.0
    vy: float = 0.0
    hit_cooldown: float = 0.0

    def update(self, dt: float, world: "World") -> None:
        if self.hit_cooldown > 0:
            self.hit_cooldown -= dt
        self.x += self.vx * dt
        self.y += self.vy * dt
        if self.x < 0 or self.x > world.width:
            self.vx *= -1
        if self.y < 0 or self.y > world.height:
            self.vy *= -1

    def render_state(self) -> dict:
        return {
            "id": self.entity_id,
            "kind": "debris",
            "x": self.x,
            "y": self.y,
            "width": self.width,
            "height": self.height,
        }


@dataclass
class Beacon:
    entity_id: str
    x: float
    y: float
    radius: float = 40.0

    def render_state(self) -> dict:
        return {
            "id": self.entity_id,
            "kind": "beacon",
            "x": self.x,
            "y": self.y,
            "radius": self.radius,
        }


@dataclass
class Planet:
    entity_id: str
    cx: float
    cy: float
    radius: float

    def render_state(self) -> dict:
        return {
            "id": self.entity_id,
            "kind": "planet",
            "cx": self.cx,
            "cy": self.cy,
            "radius": self.radius,
        }


@dataclass
class OrbitBandMarker:
    entity_id: str
    peri_km: float
    apo_km: float

    def render_state(self) -> dict:
        return {
            "id": self.entity_id,
            "kind": "orbit_band",
            "peri_km": self.peri_km,
            "apo_km": self.apo_km,
        }


@dataclass
class PlayerInput:
    thrust: bool = False
    rotate: int = 0
    seq: int = 0

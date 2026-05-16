import math


def apply_gravity(
    x: float,
    y: float,
    vx: float,
    vy: float,
    *,
    mode: str,
    strength: float,
    body_cx: float,
    body_cy: float,
    dt: float,
) -> tuple[float, float]:
    if mode == "radial":
        dx = body_cx - x
        dy = body_cy - y
        dist = math.hypot(dx, dy) or 1.0
        ax = (dx / dist) * strength
        ay = (dy / dist) * strength
    else:
        ax, ay = 0.0, strength
    return vx + ax * dt, vy + ay * dt


def apply_drag(vx: float, vy: float, drag: float, dt: float) -> tuple[float, float]:
    factor = max(0.0, 1.0 - drag * dt)
    return vx * factor, vy * factor


def integrate(x: float, y: float, vx: float, vy: float, dt: float) -> tuple[float, float, float, float]:
    return x + vx * dt, y + vy * dt, vx, vy


def aabb_overlap(
    ax: float,
    ay: float,
    aw: float,
    ah: float,
    bx: float,
    by: float,
    bw: float,
    bh: float,
) -> bool:
    return ax < bx + bw and ax + aw > bx and ay < by + bh and ay + ah > by

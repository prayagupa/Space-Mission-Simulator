from typing import TYPE_CHECKING, Protocol

if TYPE_CHECKING:
    from app.sim.world import World


class Updatable(Protocol):
    def update(self, dt: float, world: "World") -> None: ...


class Renderable(Protocol):
    def render_state(self) -> dict: ...

import asyncio
from dataclasses import dataclass, field

from app.config import settings
from app.sim.components import PlayerInput
from app.sim.engine import build_world_from_config
from app.sim.world import World


@dataclass
class MissionSession:
    run_id: str
    mission_config: dict
    world: World
    mission_slug: str = ""
    input: PlayerInput = field(default_factory=PlayerInput)
    replay_frames: list[dict] = field(default_factory=list)
    _task: asyncio.Task | None = None

    @classmethod
    def create(cls, run_id: str, config: dict, mission_slug: str = "") -> "MissionSession":
        world = build_world_from_config(config)
        return cls(run_id=run_id, mission_config=config, world=world, mission_slug=mission_slug)

    def apply_input(self, thrust: bool, rotate: int, seq: int) -> None:
        self.input.thrust = thrust
        self.input.rotate = max(-1, min(1, rotate))
        self.input.seq = seq
        self.world.input = self.input

    def tick(self) -> dict:
        dt = 1.0 / settings.tick_rate_hz
        self.world.tick_sim(dt)
        snap = self.world.snapshot()
        if self.world.tick % 10 == 0:
            self.replay_frames.append(
                {
                    "tick": snap["tick"],
                    "ship": next((e for e in snap["entities"] if e.get("kind") == "ship"), None),
                    "status": snap["status"],
                }
            )
            if len(self.replay_frames) > 120:
                self.replay_frames.pop(0)
        return snap


ACTIVE_SESSIONS: dict[str, MissionSession] = {}


def get_session(run_id: str) -> MissionSession | None:
    return ACTIVE_SESSIONS.get(run_id)


def register_session(session: MissionSession) -> None:
    ACTIVE_SESSIONS[session.run_id] = session


def remove_session(run_id: str) -> None:
    ACTIVE_SESSIONS.pop(run_id, None)

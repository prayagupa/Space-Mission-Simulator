import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class Player(Base):
    __tablename__ = "players"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    is_guest: Mapped[bool] = mapped_column(Boolean, default=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True, index=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    display_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    crafted_modules_json: Mapped[str] = mapped_column(Text, default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    progress: Mapped[list["PlayerMissionProgress"]] = relationship(back_populates="player")
    runs: Mapped[list["MissionRun"]] = relationship(back_populates="player")


class MissionDefinition(Base):
    __tablename__ = "mission_definitions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    difficulty: Mapped[int] = mapped_column(Integer, default=1)
    briefing: Mapped[str] = mapped_column(Text, default="")
    config_json: Mapped[str] = mapped_column(Text, default="{}")
    map_x: Mapped[int] = mapped_column(Integer, default=0)
    map_y: Mapped[int] = mapped_column(Integer, default=0)

    progress_rows: Mapped[list["PlayerMissionProgress"]] = relationship(back_populates="mission")
    runs: Mapped[list["MissionRun"]] = relationship(back_populates="mission")


class PlayerMissionProgress(Base):
    __tablename__ = "player_mission_progress"
    __table_args__ = (UniqueConstraint("player_id", "mission_id", name="uq_player_mission"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    player_id: Mapped[str] = mapped_column(String(36), ForeignKey("players.id"))
    mission_id: Mapped[str] = mapped_column(String(36), ForeignKey("mission_definitions.id"))
    unlocked: Mapped[bool] = mapped_column(Boolean, default=False)
    best_medal: Mapped[str | None] = mapped_column(String(20), nullable=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)

    player: Mapped["Player"] = relationship(back_populates="progress")
    mission: Mapped["MissionDefinition"] = relationship(back_populates="progress_rows")


class MissionRun(Base):
    __tablename__ = "mission_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    player_id: Mapped[str] = mapped_column(String(36), ForeignKey("players.id"))
    mission_id: Mapped[str] = mapped_column(String(36), ForeignKey("mission_definitions.id"))
    status: Mapped[str] = mapped_column(String(20), default="active")
    score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    medal: Mapped[str | None] = mapped_column(String(20), nullable=True)
    telemetry_json: Mapped[str] = mapped_column(Text, default="{}")
    replay_json: Mapped[str] = mapped_column(Text, default="[]")
    loadout_json: Mapped[str] = mapped_column(Text, default="{}")
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    player: Mapped["Player"] = relationship(back_populates="runs")
    mission: Mapped["MissionDefinition"] = relationship(back_populates="runs")

from collections.abc import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _column_names(table: str) -> set[str]:
    insp = inspect(engine)
    if table not in insp.get_table_names():
        return set()
    return {c["name"] for c in insp.get_columns(table)}


def migrate_schema() -> None:
    """Add columns for existing SQLite DBs without Alembic."""
    player_cols = _column_names("players")
    if player_cols:
        alters = []
        if "email" not in player_cols:
            alters.append("ALTER TABLE players ADD COLUMN email VARCHAR(255)")
        if "password_hash" not in player_cols:
            alters.append("ALTER TABLE players ADD COLUMN password_hash VARCHAR(255)")
        if "crafted_modules_json" not in player_cols:
            alters.append("ALTER TABLE players ADD COLUMN crafted_modules_json TEXT DEFAULT '[]'")
        if alters:
            with engine.begin() as conn:
                for stmt in alters:
                    conn.execute(text(stmt))

    mission_cols = _column_names("mission_definitions")
    if mission_cols:
        with engine.begin() as conn:
            if "map_x" not in mission_cols:
                conn.execute(text("ALTER TABLE mission_definitions ADD COLUMN map_x INTEGER DEFAULT 0"))
            if "map_y" not in mission_cols:
                conn.execute(text("ALTER TABLE mission_definitions ADD COLUMN map_y INTEGER DEFAULT 0"))

    run_cols = _column_names("mission_runs")
    if run_cols:
        with engine.begin() as conn:
            if "replay_json" not in run_cols:
                conn.execute(text("ALTER TABLE mission_runs ADD COLUMN replay_json TEXT DEFAULT '[]'"))
            if "loadout_json" not in run_cols:
                conn.execute(text("ALTER TABLE mission_runs ADD COLUMN loadout_json TEXT DEFAULT '{}'"))

    from app import models  # noqa: F401

    Base.metadata.create_all(bind=engine)


def init_db() -> None:
    from app import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    migrate_schema()

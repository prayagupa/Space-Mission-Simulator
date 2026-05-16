import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent))


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    from app.database import init_db
    from scripts.seed_missions import seed_if_empty

    init_db()
    seed_if_empty()

import pytest

from app.services.loadout import apply_loadout_to_config


def test_extended_tank_boosts_fuel():
    config = {
        "entities": [
            {
                "id": "ship",
                "template": "player_ship",
                "spawn": {"x": 0, "y": 0},
                "payload": {"fuel": 100, "hull": 100, "thrust_power": 220},
            }
        ]
    }
    out = apply_loadout_to_config(config, ["extended_tank", "turbo_thruster"])
    ship = next(e for e in out["entities"] if e["template"] == "player_ship")
    assert ship["payload"]["fuel"] == 135.0
    assert ship["payload"]["thrust_power"] == pytest.approx(253.0)

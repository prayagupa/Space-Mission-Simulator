from app.sim.engine import build_world_from_config, compute_score


def test_tutorial_altitude_win():
    config = {
        "objective": {
            "type": "altitude_band",
            "label": "Hold altitude",
            "altitude_min_km": 80,
            "required_seconds": 1,
        },
        "world": {"gravity": "down", "bounds": {"width": 4000, "height": 4000}},
        "entities": [
            {
                "id": "ship",
                "template": "player_ship",
                "spawn": {"x": 1900, "y": 500},
                "payload": {"fuel": 100, "hull": 100},
            }
        ],
    }
    world = build_world_from_config(config)
    for _ in range(30):
        world.tick_sim(0.05)
    assert world.status == "won"
    assert compute_score(world) > 0

import logging
import sys

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
    stream=sys.stdout,
)

logger = logging.getLogger("space_mission")


def log_run_event(run_id: str, event: str, **kwargs) -> None:
    extra = " ".join(f"{k}={v}" for k, v in kwargs.items())
    logger.info("run_id=%s event=%s %s", run_id, event, extra)

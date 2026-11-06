import logging
import sys

def setup_logging():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s (req:%(request_id)s): %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        stream=sys.stdout
    )

class RequestIdFilter(logging.Filter):
    def __init__(self, request_id: str = "-"):
        super().__init__()
        self.request_id = request_id

    def filter(self, record):
        if not hasattr(record, "request_id"):
            record.request_id = self.request_id
        return True

logger = logging.getLogger("gym_app")
logger.addFilter(RequestIdFilter())

import logging

from app.settings import APPLICATIONINSIGHTS_CONNECTION_STRING

class NBLogger:
    def __init__(self, name: str | None = None):
        self.app_insight_connection_string = APPLICATIONINSIGHTS_CONNECTION_STRING
        self.logger = logging.getLogger(name or __name__)
        self.logger.setLevel(logging.INFO)
        self.logger.propagate = False

        if not self._has_handler(logging.StreamHandler):
            console_handler = logging.StreamHandler()
            console_handler.setLevel(logging.INFO)
            formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
            console_handler.setFormatter(formatter)
            self.logger.addHandler(console_handler)

    def _has_handler(self, handler_type: type[logging.Handler]) -> bool:
        return any(isinstance(handler, handler_type) for handler in self.logger.handlers)

    def Log(self) -> logging.Logger:
        return self.logger

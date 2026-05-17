from typing import Any

from app.core.errors import ERROR_STATUS_MAP, ErrorCode


class AppException(Exception):
    def __init__(
        self,
        code: ErrorCode,
        message: str,
        details: dict[str, Any] | list[Any] | None = None,
    ) -> None:
        self.code = code
        self.message = message
        self.details = details
        self.status_code = ERROR_STATUS_MAP[code]
        super().__init__(message)

"""Custom exceptions for Tuish SDK."""

from __future__ import annotations

from typing import Any


class TuishError(Exception):
    """Base exception for Tuish SDK."""

    pass


class TuishCryptoError(TuishError):
    """Cryptographic operation failed."""

    pass


class TuishApiError(TuishError):
    """API request failed."""

    def __init__(
        self,
        message: str,
        status_code: int,
        code: str | None = None,
        details: dict[str, Any] | None = None,
    ):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.details = details or {}

    def __str__(self) -> str:
        if self.code:
            return f"[{self.code}] {super().__str__()} (HTTP {self.status_code})"
        return f"{super().__str__()} (HTTP {self.status_code})"

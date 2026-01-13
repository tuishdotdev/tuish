"""Custom Textual messages for Tuish widgets."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

from textual.message import Message

if TYPE_CHECKING:
    from tuish.models import LicenseCheckResult, LicenseDetails


@dataclass
class LicenseCheckStarted(Message):
    """Posted when a license check begins.

    Attributes:
        offline_only: Whether this is an offline-only check.
    """

    offline_only: bool = False


@dataclass
class LicenseCheckComplete(Message):
    """Posted when a license check completes.

    Attributes:
        result: The license check result from SDK.
    """

    result: LicenseCheckResult


@dataclass
class LicenseChanged(Message):
    """Posted when license state changes.

    Attributes:
        license: Current license details, or None if no license.
        valid: Whether the license is valid.
        offline_verified: Whether verified offline (cached signature).
    """

    license: LicenseDetails | None
    valid: bool
    offline_verified: bool = False


@dataclass
class PurchaseComplete(Message):
    """Posted when a purchase completes successfully.

    Attributes:
        license: The newly purchased license details.
    """

    license: LicenseDetails


class PurchaseCancelled(Message):
    """Posted when user cancels purchase flow."""


@dataclass
class PurchaseError(Message):
    """Posted when purchase fails.

    Attributes:
        error: Error message describing the failure.
        retryable: Whether the error is retryable.
    """

    error: str
    retryable: bool = True


@dataclass
class LoginComplete(Message):
    """Posted when OTP login completes.

    Attributes:
        license: The activated license.
    """

    license: LicenseDetails


class ManagerExit(Message):
    """Posted when user exits the license manager."""

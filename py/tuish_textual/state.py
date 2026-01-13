"""State enums and containers for Tuish Textual widgets."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from tuish.models import LicenseDetails


class LicenseCheckState(Enum):
    """License check state machine states."""

    IDLE = "idle"
    """Initial state, no check performed yet."""

    CHECKING = "checking"
    """Currently performing license check."""

    VALID = "valid"
    """License is valid."""

    INVALID = "invalid"
    """License is invalid (expired, revoked, etc.)."""

    NOT_FOUND = "not_found"
    """No license found on this machine."""

    ERROR = "error"
    """Error occurred during license check."""


class PurchaseState(Enum):
    """Purchase flow state machine states."""

    IDLE = "idle"
    """Initial state, purchase not started."""

    CREATING = "creating"
    """Creating checkout session."""

    WAITING = "waiting"
    """Waiting for user to complete checkout in browser."""

    SUCCESS = "success"
    """Purchase completed successfully."""

    ERROR = "error"
    """Error occurred during purchase."""

    CANCELLED = "cancelled"
    """User cancelled the purchase."""

    TIMEOUT = "timeout"
    """Purchase polling timed out."""


class LoginState(Enum):
    """Login flow state machine states."""

    ENTER_EMAIL = "enter_email"
    """Waiting for user to enter email."""

    SENDING_OTP = "sending_otp"
    """Sending OTP to user's phone."""

    ENTER_OTP = "enter_otp"
    """Waiting for user to enter OTP."""

    VERIFYING = "verifying"
    """Verifying OTP with server."""

    SELECT_LICENSE = "select_license"
    """User selecting from available licenses."""

    SUCCESS = "success"
    """Login completed, license activated."""

    ERROR = "error"
    """Error occurred during login."""


class ManagerScreen(Enum):
    """License manager screen states."""

    MENU = "menu"
    """Main menu screen."""

    STATUS = "status"
    """Viewing license status."""

    PURCHASE = "purchase"
    """Purchase flow screen."""

    ENTER_KEY = "enter_key"
    """Manual key entry screen."""

    LOGIN = "login"
    """OTP login screen."""

    CONFIRM_CLEAR = "confirm_clear"
    """Confirming license clear."""


@dataclass
class LicenseState:
    """Shared state container for license data.

    This dataclass holds the current license state that can be shared
    across widgets. It provides a simple container for reactive state
    management in Textual applications.

    Attributes:
        license: Current license details, or None if no license.
        valid: Whether the current license is valid.
        is_loading: Whether a license check is in progress.
        error: Error message if the last operation failed.
    """

    license: LicenseDetails | None = None
    valid: bool = False
    is_loading: bool = False
    error: str | None = None


@dataclass
class PurchaseStateData:
    """State container for purchase flow data.

    Attributes:
        state: Current purchase state.
        checkout_url: URL for checkout page (when waiting).
        session_id: Checkout session ID (when waiting).
        error: Error message if purchase failed.
        elapsed_seconds: Seconds elapsed while waiting.
    """

    state: PurchaseState = PurchaseState.IDLE
    checkout_url: str | None = None
    session_id: str | None = None
    error: str | None = None
    elapsed_seconds: int = 0


@dataclass
class LoginStateData:
    """State container for login flow data.

    Attributes:
        state: Current login state.
        email: Email address entered by user.
        otp_id: OTP request ID from server.
        phone_masked: Masked phone number for OTP display.
        available_licenses: List of licenses available after login.
        error: Error message if login failed.
    """

    state: LoginState = LoginState.ENTER_EMAIL
    email: str | None = None
    otp_id: str | None = None
    phone_masked: str | None = None
    available_licenses: list[LicenseDetails] = field(default_factory=list)
    error: str | None = None

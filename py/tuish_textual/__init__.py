"""Tuish Textual - TUI components for license verification and monetization."""

from __future__ import annotations

from tuish_textual.messages import (
    LicenseChanged,
    LicenseCheckComplete,
    LicenseCheckStarted,
    LoginComplete,
    ManagerExit,
    PurchaseCancelled,
    PurchaseComplete,
    PurchaseError,
)
from tuish_textual.state import (
    LicenseCheckState,
    LicenseState,
    LoginState,
    LoginStateData,
    ManagerScreen,
    PurchaseState,
    PurchaseStateData,
)
from tuish_textual.widgets.license_gate import LicenseGate
from tuish_textual.widgets.license_manager import TuishLicenseManager
from tuish_textual.widgets.license_status import LicenseStatus
from tuish_textual.widgets.login_flow import LoginFlow
from tuish_textual.widgets.purchase_flow import PurchaseFlow
from tuish_textual.widgets.qr_code import QrCode

__version__ = "0.1.0"

__all__ = [
    # Widgets
    "LicenseGate",
    "LicenseStatus",
    "LoginFlow",
    "PurchaseFlow",
    "QrCode",
    "TuishLicenseManager",
    # Messages
    "LicenseChanged",
    "LicenseCheckComplete",
    "LicenseCheckStarted",
    "LoginComplete",
    "ManagerExit",
    "PurchaseCancelled",
    "PurchaseComplete",
    "PurchaseError",
    # State enums
    "LicenseCheckState",
    "LoginState",
    "ManagerScreen",
    "PurchaseState",
    # State containers
    "LicenseState",
    "LoginStateData",
    "PurchaseStateData",
]

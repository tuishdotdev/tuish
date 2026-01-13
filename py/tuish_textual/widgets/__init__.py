"""Tuish Textual widgets.

This module exports all widgets:
- LicenseGate: Conditional rendering based on license/feature
- LicenseStatus: Display current license state
- LoginFlow: OTP-based authentication flow
- PurchaseFlow: Complete checkout experience
- QrCode: Unicode QR code rendering
- TuishLicenseManager: Self-service license management
"""

from __future__ import annotations

from tuish_textual.widgets.license_gate import LicenseGate
from tuish_textual.widgets.license_manager import TuishLicenseManager
from tuish_textual.widgets.license_status import LicenseStatus
from tuish_textual.widgets.login_flow import LoginFlow
from tuish_textual.widgets.purchase_flow import PurchaseFlow
from tuish_textual.widgets.qr_code import QrCode

__all__: list[str] = [
    "LicenseGate",
    "LicenseStatus",
    "LoginFlow",
    "PurchaseFlow",
    "QrCode",
    "TuishLicenseManager",
]

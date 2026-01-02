"""Tuish Python SDK - License verification and monetization for terminal apps."""

from __future__ import annotations

import subprocess
import sys
import time
from typing import Callable

from tuish.client import TuishClient
from tuish.exceptions import TuishApiError, TuishCryptoError, TuishError
from tuish.fingerprint import get_machine_fingerprint
from tuish.license import LicenseManager
from tuish.models import (
    CheckoutSessionResult,
    LicenseCheckResult,
    LicenseDetails,
    LicenseInvalidReason,
    LoginResult,
    PurchaseConfirmResult,
    PurchaseInitResult,
    SavedCard,
    TuishConfig,
)
from tuish.storage import LicenseStorage

__version__ = "0.1.0"

__all__ = [
    "Tuish",
    "TuishConfig",
    "LicenseCheckResult",
    "LicenseDetails",
    "CheckoutSessionResult",
    "LicenseInvalidReason",
    "LoginResult",
    "PurchaseInitResult",
    "PurchaseConfirmResult",
    "SavedCard",
    "TuishError",
    "TuishApiError",
    "TuishCryptoError",
    "TuishClient",
    "LicenseManager",
    "LicenseStorage",
    "get_machine_fingerprint",
]


class Tuish:
    """
    Main SDK class for Tuish TUI monetization platform.

    Example:
        ```python
        from tuish import Tuish

        client = Tuish(product_id="prod_xxx", public_key="MCowBQYDK2VwAyEA...")
        result = client.check_license()

        if result.valid:
            print("Licensed!")
        else:
            client.purchase_in_browser()
        ```
    """

    def __init__(
        self,
        product_id: str,
        public_key: str,
        api_base_url: str | None = None,
        api_key: str | None = None,
        storage_dir: str | None = None,
        debug: bool = False,
    ):
        """
        Initialize Tuish SDK.

        Args:
            product_id: Product ID for this application
            public_key: Ed25519 public key (SPKI base64 or 64-char hex)
            api_base_url: Custom API base URL (default: production)
            api_key: API key for authenticated requests
            storage_dir: Custom storage directory for license cache
            debug: Enable debug logging
        """
        self._config = TuishConfig(
            product_id=product_id,
            public_key=public_key,
            api_base_url=api_base_url or "https://tuish-api-production.doug-lance.workers.dev",
            api_key=api_key,
            storage_dir=storage_dir,
            debug=debug,
        )

        self._client = TuishClient(
            api_base_url=self._config.api_base_url,
            api_key=self._config.api_key,
            debug=self._config.debug,
        )

        self._storage = LicenseStorage(
            storage_dir=self._config.storage_dir,
            debug=self._config.debug,
        )

        self._license_manager = LicenseManager(
            product_id=self._config.product_id,
            public_key=self._config.public_key,
            storage=self._storage,
            client=self._client,
            debug=self._config.debug,
        )

    def check_license(self) -> LicenseCheckResult:
        """
        Check if user has valid license.
        Performs offline verification first, then online if needed.
        """
        return self._license_manager.check_license()

    def get_machine_fingerprint(self) -> str:
        """Get current machine fingerprint."""
        return self._license_manager.get_machine_fingerprint()

    # ============ Browser Purchase Flow ============

    def purchase_in_browser(
        self,
        email: str | None = None,
        open_browser: bool = True,
    ) -> CheckoutSessionResult:
        """
        Create checkout session and open in browser.

        Args:
            email: Pre-fill customer email
            open_browser: Whether to open URL in browser (default: True)

        Returns:
            CheckoutSessionResult with session_id and checkout_url
        """
        session = self._client.create_checkout_session(
            product_id=self._config.product_id,
            email=email,
        )

        if open_browser:
            self._open_url(session.checkout_url)

        return session

    def wait_for_checkout_complete(
        self,
        session_id: str,
        poll_interval_ms: int = 2000,
        timeout_ms: int = 600000,  # 10 minutes
        on_poll: Callable[[str], None] | None = None,
    ) -> LicenseCheckResult:
        """
        Poll for checkout completion.

        Args:
            session_id: Session ID from purchase_in_browser
            poll_interval_ms: Polling interval in milliseconds
            timeout_ms: Timeout in milliseconds
            on_poll: Callback called with status on each poll

        Returns:
            LicenseCheckResult when complete or timeout
        """
        poll_interval_s = poll_interval_ms / 1000
        timeout_s = timeout_ms / 1000
        start_time = time.time()

        while time.time() - start_time < timeout_s:
            status = self._client.get_checkout_status(session_id)

            if on_poll:
                on_poll(status.status)

            if status.status == "complete" and status.license_key:
                self._license_manager.save_license(status.license_key)
                return self.check_license()

            if status.status == "expired":
                return LicenseCheckResult(
                    valid=False,
                    reason="expired",
                    offline_verified=False,
                )

            time.sleep(poll_interval_s)

        return LicenseCheckResult(
            valid=False,
            reason="network_error",
            offline_verified=False,
        )

    # ============ License Management ============

    def store_license(self, license_key: str) -> None:
        """Store a license key manually."""
        self._license_manager.save_license(license_key)

    def get_cached_license_key(self) -> str | None:
        """Get cached license key."""
        return self._license_manager.get_cached_license_key()

    def clear_license(self) -> None:
        """Clear cached license."""
        self._license_manager.clear_license()

    def extract_license_info(self, license_key: str) -> LicenseDetails | None:
        """Extract license info without verification (for display only)."""
        return self._license_manager.extract_license_info(license_key)

    # ============ Utilities ============

    def _open_url(self, url: str) -> None:
        """Open URL in default browser."""
        if sys.platform == "darwin":
            subprocess.run(["open", url], check=False)
        elif sys.platform == "win32":
            subprocess.run(["start", url], shell=True, check=False)
        else:  # Linux and others
            subprocess.run(["xdg-open", url], check=False)

    @property
    def client(self) -> TuishClient:
        """Get underlying API client."""
        return self._client

    @property
    def storage(self) -> LicenseStorage:
        """Get license storage."""
        return self._storage

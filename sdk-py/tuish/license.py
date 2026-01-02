"""License verification and management."""

from __future__ import annotations

from tuish.client import TuishClient
from tuish.crypto import (
    extract_license_payload,
    is_license_expired,
    parse_public_key,
    verify_license,
)
from tuish.fingerprint import get_machine_fingerprint
from tuish.models import LicenseCheckResult, LicenseDetails
from tuish.storage import LicenseStorage
from tuish.utils import bytes_to_hex


class LicenseManager:
    """License manager handles verification and caching."""

    def __init__(
        self,
        product_id: str,
        public_key: str,
        storage: LicenseStorage,
        client: TuishClient,
        debug: bool = False,
    ):
        self._product_id = product_id
        self._public_key_hex = bytes_to_hex(parse_public_key(public_key))
        self._storage = storage
        self._client = client
        self._debug = debug
        self._machine_fingerprint: str | None = None

        if self._debug:
            print(f"[tuish] Parsed public key: {self._public_key_hex[:16]}...")

    def get_machine_fingerprint(self) -> str:
        """Get machine fingerprint (cached after first call)."""
        if self._machine_fingerprint is None:
            self._machine_fingerprint = get_machine_fingerprint()
        return self._machine_fingerprint

    def check_license(self) -> LicenseCheckResult:
        """
        Check if user has valid license.
        Tries offline verification first, then online validation.
        """
        machine_fingerprint = self.get_machine_fingerprint()

        # Try to load cached license
        cached = self._storage.load_license(self._product_id)

        if cached:
            if self._debug:
                print("[tuish] Found cached license, verifying offline...")

            # Verify offline first
            offline_result = self._verify_offline(cached.license_key, machine_fingerprint)

            if offline_result.valid:
                # If cache is fresh, return offline result
                if not self._storage.needs_refresh(cached):
                    return offline_result

                # Try online refresh
                if self._debug:
                    print("[tuish] Cache needs refresh, validating online...")

                online_result = self._validate_online(cached.license_key, machine_fingerprint)

                if online_result.valid:
                    # Update cache with fresh timestamp
                    self._storage.save_license(
                        self._product_id, cached.license_key, machine_fingerprint
                    )
                    return online_result

                # Network error - trust offline if valid
                if online_result.reason == "network_error":
                    return offline_result

                # License invalidated server-side
                self._storage.remove_license(self._product_id)
                return online_result

            # Offline verification failed
            if offline_result.reason == "expired":
                # Check online in case license was renewed
                online_result = self._validate_online(cached.license_key, machine_fingerprint)
                if not online_result.valid:
                    self._storage.remove_license(self._product_id)
                return online_result

            # Other failures (signature, format, machine mismatch)
            self._storage.remove_license(self._product_id)
            return offline_result

        # No cached license
        if self._debug:
            print("[tuish] No cached license found")

        return LicenseCheckResult(
            valid=False,
            reason="not_found",
            offline_verified=False,
        )

    def _verify_offline(
        self,
        license_key: str,
        machine_fingerprint: str,
    ) -> LicenseCheckResult:
        """Verify license offline using public key."""
        try:
            result = verify_license(license_key, self._public_key_hex, machine_fingerprint)

            if result.valid and result.payload:
                return LicenseCheckResult(
                    valid=True,
                    license=LicenseDetails(
                        id=result.payload.lid,
                        product_id=result.payload.pid,
                        features=result.payload.features,
                        status="active",
                        issued_at=result.payload.iat,
                        expires_at=result.payload.exp,
                    ),
                    offline_verified=True,
                )

            return LicenseCheckResult(
                valid=False,
                reason=result.reason,
                license=LicenseDetails(
                    id=result.payload.lid,
                    product_id=result.payload.pid,
                    features=result.payload.features,
                    status="expired" if result.reason == "expired" else "revoked",
                    issued_at=result.payload.iat,
                    expires_at=result.payload.exp,
                ) if result.payload else None,
                offline_verified=True,
            )
        except Exception as e:
            if self._debug:
                print(f"[tuish] Offline verification error: {e}")
            return LicenseCheckResult(
                valid=False,
                reason="invalid_format",
                offline_verified=True,
            )

    def _validate_online(
        self,
        license_key: str,
        machine_fingerprint: str,
    ) -> LicenseCheckResult:
        """Validate license online with API."""
        try:
            result = self._client.validate_license(
                license_key=license_key,
                machine_fingerprint=machine_fingerprint,
            )

            if result.valid and result.license:
                return LicenseCheckResult(
                    valid=True,
                    license=result.license,
                    offline_verified=False,
                )

            return LicenseCheckResult(
                valid=False,
                reason=result.reason,  # type: ignore
                license=result.license,
                offline_verified=False,
            )
        except Exception as e:
            if self._debug:
                print(f"[tuish] Online validation error: {e}")
            return LicenseCheckResult(
                valid=False,
                reason="network_error",
                offline_verified=False,
            )

    def save_license(self, license_key: str) -> None:
        """Store license key after successful purchase."""
        machine_fingerprint = self.get_machine_fingerprint()
        self._storage.save_license(self._product_id, license_key, machine_fingerprint)

    def get_cached_license_key(self) -> str | None:
        """Get cached license key without verification."""
        cached = self._storage.load_license(self._product_id)
        return cached.license_key if cached else None

    def clear_license(self) -> None:
        """Clear cached license."""
        self._storage.remove_license(self._product_id)

    def extract_license_info(self, license_key: str) -> LicenseDetails | None:
        """Extract license info without verification (for display only)."""
        payload = extract_license_payload(license_key)
        if not payload:
            return None

        expired = is_license_expired(license_key)
        return LicenseDetails(
            id=payload.lid,
            product_id=payload.pid,
            features=payload.features,
            status="expired" if expired else "active",
            issued_at=payload.iat,
            expires_at=payload.exp,
        )

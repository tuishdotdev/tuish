"""File-based license storage for caching."""

from __future__ import annotations

import hashlib
import time
from pathlib import Path

from tuish.models import CachedLicenseData

CACHE_REFRESH_HOURS = 24


def get_default_storage_dir() -> Path:
    """Get default storage directory (~/.tuish/licenses/)."""
    return Path.home() / ".tuish" / "licenses"


class LicenseStorage:
    """File-based license storage for caching licenses locally."""

    def __init__(
        self,
        storage_dir: str | None = None,
        debug: bool = False,
    ):
        self._storage_dir = Path(storage_dir) if storage_dir else get_default_storage_dir()
        self._debug = debug
        self._ensure_storage_dir()

    def _ensure_storage_dir(self) -> None:
        """Ensure storage directory exists."""
        try:
            self._storage_dir.mkdir(parents=True, exist_ok=True)
            if self._debug:
                print(f"[tuish] Storage directory: {self._storage_dir}")
        except OSError as e:
            if self._debug:
                print(f"[tuish] Failed to create storage directory: {e}")
            # Don't crash - caching is optional

    def _get_license_file_path(self, product_id: str) -> Path:
        """Get file path for a product's license cache."""
        # Hash product ID for safe filename
        hash_digest = hashlib.sha256(product_id.encode("utf-8")).hexdigest()[:16]
        return self._storage_dir / f"{hash_digest}.json"

    def save_license(
        self,
        product_id: str,
        license_key: str,
        machine_fingerprint: str,
    ) -> None:
        """Save a license to disk."""
        file_path = self._get_license_file_path(product_id)
        now_ms = int(time.time() * 1000)

        data = CachedLicenseData(
            license_key=license_key,
            cached_at=now_ms,
            refresh_at=now_ms + (CACHE_REFRESH_HOURS * 60 * 60 * 1000),
            product_id=product_id,
            machine_fingerprint=machine_fingerprint,
        )

        try:
            self._ensure_storage_dir()
            file_path.write_text(data.model_dump_json(indent=2), encoding="utf-8")
            if self._debug:
                print(f"[tuish] Saved license to: {file_path}")
        except OSError as e:
            if self._debug:
                print(f"[tuish] Failed to save license: {e}")
            # Don't throw - caching failure shouldn't break the app

    def load_license(self, product_id: str) -> CachedLicenseData | None:
        """Load a cached license from disk."""
        file_path = self._get_license_file_path(product_id)

        if not file_path.exists():
            return None

        try:
            content = file_path.read_text(encoding="utf-8")
            data = CachedLicenseData.model_validate_json(content)
            if self._debug:
                print(f"[tuish] Loaded cached license from: {file_path}")
            return data
        except Exception as e:
            if self._debug:
                print(f"[tuish] Failed to load cached license: {e}")
            return None

    def needs_refresh(self, cached: CachedLicenseData) -> bool:
        """Check if cached license needs online refresh."""
        now_ms = int(time.time() * 1000)
        return now_ms >= cached.refresh_at

    def remove_license(self, product_id: str) -> None:
        """Remove a cached license."""
        file_path = self._get_license_file_path(product_id)

        if file_path.exists():
            try:
                file_path.unlink()
                if self._debug:
                    print(f"[tuish] Removed cached license: {file_path}")
            except OSError as e:
                if self._debug:
                    print(f"[tuish] Failed to remove cached license: {e}")

    def clear_all(self) -> None:
        """Clear all cached licenses."""
        if not self._storage_dir.exists():
            return

        try:
            for file_path in self._storage_dir.glob("*.json"):
                file_path.unlink()
            if self._debug:
                print("[tuish] Cleared all cached licenses")
        except OSError as e:
            if self._debug:
                print(f"[tuish] Failed to clear cached licenses: {e}")

    @property
    def storage_dir(self) -> Path:
        """Get the storage directory path."""
        return self._storage_dir

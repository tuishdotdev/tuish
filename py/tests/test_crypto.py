"""Tests for crypto module."""

from __future__ import annotations

import time

import pytest

from tuish.crypto import (
    extract_license_payload,
    get_license_time_remaining,
    is_license_expired,
    parse_license,
    parse_public_key,
    verify_license,
)
from tuish.exceptions import TuishCryptoError

from .conftest import (
    TEST_PUBLIC_KEY_HEX,
    create_test_license,
)


class TestParsePublicKey:
    """Tests for parse_public_key function."""

    def test_parse_hex_key(self, test_public_key_hex: str) -> None:
        """Parse hex format public key."""
        key_bytes = parse_public_key(test_public_key_hex)
        assert len(key_bytes) == 32
        assert key_bytes.hex() == test_public_key_hex

    def test_parse_spki_key(self, test_public_key_spki: str) -> None:
        """Parse SPKI base64 format public key."""
        key_bytes = parse_public_key(test_public_key_spki)
        assert len(key_bytes) == 32
        assert key_bytes.hex() == TEST_PUBLIC_KEY_HEX

    def test_invalid_format_raises(self) -> None:
        """Invalid key format raises TuishCryptoError."""
        with pytest.raises(TuishCryptoError):
            parse_public_key("invalid-key-format")


class TestParseLicense:
    """Tests for parse_license function."""

    def test_parse_valid_license(self, valid_license: str) -> None:
        """Parse valid license string."""
        parsed = parse_license(valid_license)
        assert parsed is not None
        assert parsed.header.alg == "ed25519"
        assert parsed.header.ver == 1
        assert parsed.payload.lid == "lic_test123"
        assert parsed.payload.pid == "prod_test456"

    def test_parse_invalid_format(self) -> None:
        """Invalid format returns None."""
        assert parse_license("not-a-license") is None
        assert parse_license("only.two.parts.here") is None  # 4 parts
        assert parse_license("one") is None


class TestVerifyLicense:
    """Tests for verify_license function."""

    def test_verify_valid_license(
        self, valid_license: str, test_public_key_hex: str
    ) -> None:
        """Verify valid license passes."""
        result = verify_license(valid_license, test_public_key_hex)
        assert result.valid is True
        assert result.payload is not None
        assert result.reason is None

    def test_verify_expired_license(
        self, expired_license: str, test_public_key_hex: str
    ) -> None:
        """Verify expired license fails with reason."""
        result = verify_license(expired_license, test_public_key_hex)
        assert result.valid is False
        assert result.reason == "expired"
        assert result.payload is not None  # Payload still extracted

    def test_verify_wrong_machine(self, test_public_key_hex: str) -> None:
        """Verify machine-bound license with wrong machine fails."""
        license_key = create_test_license(machine_id="correct-machine-id")
        result = verify_license(
            license_key, test_public_key_hex, machine_id="wrong-machine-id"
        )
        assert result.valid is False
        assert result.reason == "machine_mismatch"

    def test_verify_machine_bound_correct(self, test_public_key_hex: str) -> None:
        """Verify machine-bound license with correct machine passes."""
        license_key = create_test_license(machine_id="my-machine")
        result = verify_license(license_key, test_public_key_hex, machine_id="my-machine")
        assert result.valid is True

    def test_verify_any_machine_license(
        self, valid_license: str, test_public_key_hex: str
    ) -> None:
        """License without machine binding works on any machine."""
        # valid_license has machine_id=""
        result = verify_license(
            valid_license, test_public_key_hex, machine_id="any-machine-id"
        )
        assert result.valid is True

    def test_verify_invalid_signature(self, test_public_key_hex: str) -> None:
        """Tampered license fails signature verification."""
        license_key = create_test_license()
        # Tamper with signature
        parts = license_key.split(".")
        parts[2] = "AAAAinvalidsignature" + parts[2][20:]
        tampered = ".".join(parts)

        result = verify_license(tampered, test_public_key_hex)
        assert result.valid is False
        assert result.reason == "invalid_signature"


class TestExtractLicensePayload:
    """Tests for extract_license_payload function."""

    def test_extract_valid(self, valid_license: str) -> None:
        """Extract payload from valid license."""
        payload = extract_license_payload(valid_license)
        assert payload is not None
        assert payload.lid == "lic_test123"
        assert payload.features == []

    def test_extract_with_features(self, license_with_features: str) -> None:
        """Extract payload with features."""
        payload = extract_license_payload(license_with_features)
        assert payload is not None
        assert "pro" in payload.features
        assert "export" in payload.features

    def test_extract_invalid(self) -> None:
        """Extract from invalid license returns None."""
        assert extract_license_payload("invalid") is None


class TestIsLicenseExpired:
    """Tests for is_license_expired function."""

    def test_perpetual_not_expired(self, valid_license: str) -> None:
        """Perpetual license is not expired."""
        assert is_license_expired(valid_license) is False

    def test_expired_license(self, expired_license: str) -> None:
        """Past expiration is expired."""
        assert is_license_expired(expired_license) is True

    def test_future_expiration(self) -> None:
        """Future expiration is not expired."""
        license_key = create_test_license(
            expires_at=int(time.time() * 1000) + 3600000  # 1 hour from now
        )
        assert is_license_expired(license_key) is False


class TestGetLicenseTimeRemaining:
    """Tests for get_license_time_remaining function."""

    def test_perpetual_returns_none(self, valid_license: str) -> None:
        """Perpetual license returns None."""
        assert get_license_time_remaining(valid_license) is None

    def test_expired_returns_negative(self, expired_license: str) -> None:
        """Expired license returns negative."""
        remaining = get_license_time_remaining(expired_license)
        assert remaining is not None
        assert remaining < 0

    def test_future_returns_positive(self) -> None:
        """Future expiration returns positive."""
        license_key = create_test_license(
            expires_at=int(time.time() * 1000) + 3600000
        )
        remaining = get_license_time_remaining(license_key)
        assert remaining is not None
        assert remaining > 0

"""Shared test fixtures for Tuish SDK tests."""

from __future__ import annotations

import base64
import json
import time
from typing import Any

import pytest
from nacl.signing import SigningKey

from tuish.utils import to_base64url

# ============ Test Key Pair ============
# Generate a deterministic test key pair for reproducible tests

TEST_SEED = b"tuish-test-seed-32-bytes-exactly"  # 32 bytes
TEST_SIGNING_KEY = SigningKey(TEST_SEED)
TEST_VERIFY_KEY = TEST_SIGNING_KEY.verify_key

# Export formats
TEST_PRIVATE_KEY_HEX = TEST_SIGNING_KEY.encode().hex()
TEST_PUBLIC_KEY_HEX = TEST_VERIFY_KEY.encode().hex()

# SPKI format: 12-byte header + 32-byte key
SPKI_HEADER = bytes([0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00])
TEST_PUBLIC_KEY_SPKI = base64.b64encode(SPKI_HEADER + TEST_VERIFY_KEY.encode()).decode("ascii")


def create_test_license(
    license_id: str = "lic_test123",
    product_id: str = "prod_test456",
    customer_id: str = "cus_test789",
    developer_id: str = "dev_testabc",
    features: list[str] | None = None,
    expires_at: int | None = None,
    machine_id: str = "",
    issued_at: int | None = None,
) -> str:
    """
    Create a signed test license token.

    Args:
        license_id: License ID
        product_id: Product ID
        customer_id: Customer ID
        developer_id: Developer ID
        features: Feature flags
        expires_at: Expiration timestamp (ms), None = perpetual
        machine_id: Machine fingerprint binding, "" = any machine
        issued_at: Issue timestamp (ms), None = now

    Returns:
        Signed license string (header.payload.signature)
    """
    if features is None:
        features = []

    if issued_at is None:
        issued_at = int(time.time() * 1000)

    header = {"alg": "ed25519", "ver": 1}
    payload = {
        "lid": license_id,
        "pid": product_id,
        "cid": customer_id,
        "did": developer_id,
        "features": features,
        "iat": issued_at,
        "exp": expires_at,
        "mid": machine_id,
    }

    header_b64 = to_base64url(json.dumps(header, separators=(",", ":")).encode())
    payload_b64 = to_base64url(json.dumps(payload, separators=(",", ":")).encode())

    message = f"{header_b64}.{payload_b64}".encode()
    signature = TEST_SIGNING_KEY.sign(message).signature
    signature_b64 = to_base64url(signature)

    return f"{header_b64}.{payload_b64}.{signature_b64}"


@pytest.fixture
def test_public_key_hex() -> str:
    """Test public key in hex format."""
    return TEST_PUBLIC_KEY_HEX


@pytest.fixture
def test_public_key_spki() -> str:
    """Test public key in SPKI base64 format."""
    return TEST_PUBLIC_KEY_SPKI


@pytest.fixture
def valid_license() -> str:
    """Valid perpetual license."""
    return create_test_license(expires_at=None, machine_id="")


@pytest.fixture
def expired_license() -> str:
    """Expired license (1 hour ago)."""
    return create_test_license(
        expires_at=int(time.time() * 1000) - 3600000,  # 1 hour ago
        machine_id="",
    )


@pytest.fixture
def machine_bound_license() -> str:
    """License bound to specific machine."""
    return create_test_license(
        expires_at=None,
        machine_id="abc123def456",
    )


@pytest.fixture
def license_with_features() -> str:
    """License with feature flags."""
    return create_test_license(
        features=["pro", "export", "api"],
        expires_at=None,
        machine_id="",
    )


# ============ Mock API Responses ============

@pytest.fixture
def mock_checkout_response() -> dict[str, Any]:
    """Mock checkout session response."""
    return {
        "sessionId": "sess_test123",
        "checkoutUrl": "https://checkout.stripe.com/test",
    }


@pytest.fixture
def mock_checkout_complete_response() -> dict[str, Any]:
    """Mock completed checkout response."""
    return {
        "status": "complete",
        "licenseKey": create_test_license(),
        "license": {
            "id": "lic_test123",
            "productId": "prod_test456",
            "features": [],
            "status": "active",
            "issuedAt": int(time.time() * 1000),
            "expiresAt": None,
        },
    }


@pytest.fixture
def mock_validate_response() -> dict[str, Any]:
    """Mock license validation response."""
    return {
        "valid": True,
        "license": {
            "id": "lic_test123",
            "productId": "prod_test456",
            "features": [],
            "status": "active",
            "issuedAt": int(time.time() * 1000),
            "expiresAt": None,
        },
    }


@pytest.fixture
def mock_error_response() -> dict[str, Any]:
    """Mock API error response."""
    return {
        "error": {
            "code": "not_found",
            "message": "License not found",
        }
    }

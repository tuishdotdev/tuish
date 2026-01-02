"""Ed25519 signature verification using PyNaCl."""

from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Literal

from nacl.exceptions import BadSignatureError
from nacl.signing import VerifyKey

from tuish.exceptions import TuishCryptoError
from tuish.models import LicenseHeader, LicensePayload, SignedLicense
from tuish.utils import bytes_to_json, from_base64url, hex_to_bytes

# SPKI header for Ed25519 public keys (12 bytes)
# Format: 30 2a 30 05 06 03 2b 65 70 03 21 00 [32 bytes key]
ED25519_SPKI_HEADER = "MCowBQYDK2VwAyEA"


VerifyReason = Literal[
    "invalid_format",
    "invalid_signature",
    "expired",
    "machine_mismatch",
]


@dataclass
class VerifyResult:
    """Result of license verification."""

    valid: bool
    payload: LicensePayload | None = None
    reason: VerifyReason | None = None


def parse_public_key(public_key: str) -> bytes:
    """
    Parse public key from SPKI base64 or hex format.
    Returns raw 32-byte key.
    """
    # Check if SPKI base64 format
    if public_key.startswith(ED25519_SPKI_HEADER) or public_key.startswith("MCoq"):
        import base64
        decoded = base64.b64decode(public_key)

        # SPKI format: 12 byte header + 32 byte key
        if len(decoded) != 44:
            raise TuishCryptoError(
                f"Invalid SPKI public key length: expected 44 bytes, got {len(decoded)}"
            )

        # Extract raw key (last 32 bytes)
        return decoded[12:]

    # Check if hex format (64 characters = 32 bytes)
    if len(public_key) == 64:
        try:
            return hex_to_bytes(public_key)
        except ValueError:
            pass

    raise TuishCryptoError(
        "Invalid public key format. Expected SPKI base64 (MCow...) or 64-character hex"
    )


def parse_license(license_string: str) -> SignedLicense | None:
    """
    Parse a license string into its components.
    Returns None if format is invalid.
    """
    try:
        parts = license_string.split(".")
        if len(parts) != 3:
            return None

        header_b64, payload_b64, signature_b64 = parts

        if not all([header_b64, payload_b64, signature_b64]):
            return None

        # Decode header and payload
        header_json = bytes_to_json(from_base64url(header_b64))
        payload_json = bytes_to_json(from_base64url(payload_b64))

        return SignedLicense(
            header=LicenseHeader(**header_json),
            payload=LicensePayload(**payload_json),
            signature=signature_b64,
        )
    except Exception:
        return None


def verify_license(
    license_string: str,
    public_key_hex: str,
    machine_id: str | None = None,
) -> VerifyResult:
    """
    Verify a license signature and check validity.

    Args:
        license_string: The full license string (header.payload.signature)
        public_key_hex: 64-character hex string of public key
        machine_id: Optional machine fingerprint to verify binding

    Returns:
        VerifyResult with valid=True/False and reason if invalid
    """
    # Parse the license
    parsed = parse_license(license_string)
    if not parsed:
        return VerifyResult(valid=False, reason="invalid_format")

    # Prepare verification data
    parts = license_string.split(".")
    message = f"{parts[0]}.{parts[1]}".encode()
    signature_bytes = from_base64url(parsed.signature)
    public_key_bytes = hex_to_bytes(public_key_hex)

    # Verify signature using PyNaCl
    try:
        verify_key = VerifyKey(public_key_bytes)
        # PyNaCl expects signature + message concatenated for verify()
        # But we can use verify_key.verify(smessage) where smessage = sig + msg
        # Or: construct signed message manually
        verify_key.verify(message, signature_bytes)
    except BadSignatureError:
        return VerifyResult(valid=False, reason="invalid_signature")
    except Exception:
        return VerifyResult(valid=False, reason="invalid_signature")

    payload = parsed.payload

    # Check expiration (exp is in milliseconds)
    now_ms = int(time.time() * 1000)
    if payload.exp is not None and payload.exp < now_ms:
        return VerifyResult(valid=False, payload=payload, reason="expired")

    # Check machine ID binding
    # If license.mid is empty string, license is valid on any machine
    if machine_id and payload.mid and payload.mid != machine_id:
        return VerifyResult(valid=False, payload=payload, reason="machine_mismatch")

    return VerifyResult(valid=True, payload=payload)


def extract_license_payload(license_string: str) -> LicensePayload | None:
    """Extract payload from license without verification (for display only)."""
    parsed = parse_license(license_string)
    return parsed.payload if parsed else None


def is_license_expired(license_string: str) -> bool:
    """Check if license is expired based on payload (without signature verification)."""
    payload = extract_license_payload(license_string)
    if not payload:
        return True
    if payload.exp is None:
        return False  # Perpetual license
    now_ms = int(time.time() * 1000)
    return payload.exp < now_ms


def get_license_time_remaining(license_string: str) -> int | None:
    """Get milliseconds until expiration (None if perpetual, negative if expired)."""
    payload = extract_license_payload(license_string)
    if not payload or payload.exp is None:
        return None
    now_ms = int(time.time() * 1000)
    return payload.exp - now_ms

"""Encoding utilities for license handling."""

import base64
import json
from typing import Any


def to_base64url(data: bytes) -> str:
    """Convert bytes to base64url string (no padding)."""
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def from_base64url(s: str) -> bytes:
    """Convert base64url string to bytes (handles missing padding)."""
    # Add back padding if needed
    padding = 4 - (len(s) % 4)
    if padding != 4:
        s += "=" * padding
    return base64.urlsafe_b64decode(s)


def hex_to_bytes(hex_str: str) -> bytes:
    """Convert hex string to bytes."""
    return bytes.fromhex(hex_str)


def bytes_to_hex(data: bytes) -> str:
    """Convert bytes to hex string."""
    return data.hex()


def json_to_bytes(obj: Any) -> bytes:
    """Convert object to JSON bytes."""
    return json.dumps(obj, separators=(",", ":")).encode("utf-8")


def bytes_to_json(data: bytes) -> Any:
    """Convert bytes to JSON object."""
    return json.loads(data.decode("utf-8"))

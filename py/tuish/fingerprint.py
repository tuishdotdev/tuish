"""Machine fingerprint generation for license binding."""

import getpass
import hashlib
import platform
import socket


def get_machine_fingerprint() -> str:
    """
    Generate a stable machine fingerprint for license binding.

    Uses: hostname + username + platform + architecture
    Matches TypeScript SDK implementation.
    """
    components = [
        socket.gethostname(),
        getpass.getuser(),
        _map_platform(platform.system()),
        _map_arch(platform.machine()),
    ]

    fingerprint_input = ":".join(components)
    return hashlib.sha256(fingerprint_input.encode("utf-8")).hexdigest()


def _map_platform(value: str) -> str:
    normalized = value.lower()
    if normalized == "macos":
        return "darwin"
    if normalized == "windows":
        return "win32"
    return normalized


def _map_arch(value: str) -> str:
    normalized = value.lower()
    if normalized in {"x86_64", "amd64"}:
        return "x64"
    if normalized in {"aarch64", "arm64"}:
        return "arm64"
    if normalized in {"x86", "i386", "i686"}:
        return "ia32"
    if normalized == "arm":
        return "arm"
    return normalized

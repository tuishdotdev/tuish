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
        platform.system().lower(),  # 'darwin', 'linux', 'windows'
        platform.machine(),  # 'x86_64', 'arm64', etc.
    ]

    fingerprint_input = ":".join(components)
    return hashlib.sha256(fingerprint_input.encode("utf-8")).hexdigest()

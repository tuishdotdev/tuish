from __future__ import annotations

import getpass
import hashlib
import json
import platform
import socket
import tempfile
from pathlib import Path
from typing import Any

from tuish.crypto import parse_public_key, verify_license
from tuish.fingerprint import _map_arch, _map_platform, get_machine_fingerprint
from tuish.models import CachedLicenseData
from tuish.storage import LicenseStorage
from tuish.utils import bytes_to_hex


def find_repo_root(start: Path) -> Path:
    current = start
    for _ in range(10):
        candidate = current / "oss" / "spec" / "tests" / "vectors"
        if candidate.exists():
            return current
        if current.parent == current:
            break
        current = current.parent
    raise RuntimeError("Unable to locate repo root for spec vectors")


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def sha256_hex(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def evaluate_flow(input_data: dict[str, Any]) -> dict[str, Any]:
    actions: list[str] = []

    resolver = input_data.get("resolver")
    if resolver and resolver.get("enabled") and resolver.get("found"):
        offline = resolver.get("offline")
        if offline and offline.get("valid"):
            actions.append("save")
            return {"final": {"valid": True, "reason": None, "source": "offline"}, "cache_actions": actions}
        if offline and offline.get("reason") in {"expired", "invalid_signature"}:
            online = resolver.get("online") or {"valid": False, "reason": "network_error"}
            if online.get("valid"):
                actions.append("save")
                return {"final": {"valid": True, "reason": None, "source": "online"}, "cache_actions": actions}
            return {"final": {"valid": False, "reason": online.get("reason"), "source": "online"}, "cache_actions": actions}

    cache = input_data.get("cache")
    if cache and cache.get("found"):
        offline = cache.get("offline")
        if offline and offline.get("valid"):
            if cache.get("fresh"):
                return {"final": {"valid": True, "reason": None, "source": "offline"}, "cache_actions": actions}
            online = cache.get("online") or {"valid": False, "reason": "network_error"}
            if online.get("valid"):
                actions.append("save")
                return {"final": {"valid": True, "reason": None, "source": "online"}, "cache_actions": actions}
            if online.get("reason") == "network_error":
                return {"final": {"valid": True, "reason": None, "source": "offline"}, "cache_actions": actions}
            actions.append("remove")
            return {"final": {"valid": False, "reason": online.get("reason"), "source": "online"}, "cache_actions": actions}

        if offline and offline.get("reason") == "expired":
            online = cache.get("online") or {"valid": False, "reason": "network_error"}
            if not online.get("valid"):
                actions.append("remove")
            return {"final": {"valid": online.get("valid"), "reason": online.get("reason"), "source": "online"}, "cache_actions": actions}

        if offline:
            actions.append("remove")
            return {"final": {"valid": False, "reason": offline.get("reason"), "source": "offline"}, "cache_actions": actions}

    return {"final": {"valid": False, "reason": "not_found", "source": "not_found"}, "cache_actions": actions}


REPO_ROOT = find_repo_root(Path(__file__).resolve())
VECTORS_DIR = REPO_ROOT / "oss" / "spec" / "tests" / "vectors"


def test_license_vectors() -> None:
    vectors = read_json(VECTORS_DIR / "license.json")
    public_key_spki = vectors["keys"]["public_key_spki_base64"]
    public_key_hex = vectors["keys"]["public_key_hex"]

    parsed = parse_public_key(public_key_spki)
    assert bytes_to_hex(parsed) == public_key_hex

    for case in vectors["cases"]:
        result = verify_license(case["license"], public_key_hex, case["machine_id"])
        assert result.valid == case["expected"]["valid"]
        if case["expected"].get("reason"):
            assert result.reason == case["expected"]["reason"]
        if case["expected"].get("payload"):
            assert result.payload is not None
            assert result.payload.model_dump() == case["expected"]["payload"]


def test_fingerprint_vectors() -> None:
    vectors = read_json(VECTORS_DIR / "fingerprint.json")
    for case in vectors["cases"]:
        components = case["components"]
        fingerprint_input = ":".join(
            [
                components["hostname"],
                components["username"],
                components["platform"],
                components["arch"],
            ]
        )
        assert sha256_hex(fingerprint_input) == case["expected"]

    for entry in vectors["platform_map"]:
        assert _map_platform(entry["input"]) == entry["expected"]
    for entry in vectors["arch_map"]:
        assert _map_arch(entry["input"]) == entry["expected"]

    runtime_components = [
        socket.gethostname(),
        getpass.getuser(),
        _map_platform(platform.system()),
        _map_arch(platform.machine()),
    ]
    runtime_input = ":".join(runtime_components)
    assert get_machine_fingerprint() == sha256_hex(runtime_input)


def test_cache_vectors() -> None:
    vectors = read_json(VECTORS_DIR / "cache.json")
    with tempfile.TemporaryDirectory() as tmp_dir:
        storage = LicenseStorage(storage_dir=tmp_dir)
        storage.save_license(vectors["product_id"], "license-test", "machine-test")
        files = list(Path(tmp_dir).iterdir())
        names = {file.name for file in files}
        assert vectors["expected_filename"] in names

        for case in vectors["cases"]:
            cached = CachedLicenseData(
                license_key="license-test",
                cached_at=case["cached_at"],
                refresh_at=case["refresh_at"],
                product_id=vectors["product_id"],
                machine_fingerprint="machine-test",
            )
            assert storage.needs_refresh(cached) == case["expected_needs_refresh"]


def test_flow_vectors() -> None:
    vectors = read_json(VECTORS_DIR / "license_check_flow.json")
    for case in vectors["cases"]:
        result = evaluate_flow(case["input"])
        assert result == case["expected"]

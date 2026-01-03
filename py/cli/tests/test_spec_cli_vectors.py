from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path


def load_vectors() -> dict:
    vectors_path = Path(__file__).resolve().parents[3] / "spec/tests/vectors/cli.json"
    return json.loads(vectors_path.read_text())


def run_case(args: list[str]) -> subprocess.CompletedProcess[str]:
    with tempfile.TemporaryDirectory() as temp_dir:
        config_path = Path(temp_dir) / "config.json"
        cmd = [
            sys.executable,
            "-m",
            "tuish_cli",
            "--config",
            str(config_path),
            "--json",
            *args,
        ]
        return subprocess.run(cmd, capture_output=True, text=True, check=False)


def test_spec_cli_vectors() -> None:
    vectors = load_vectors()
    for case in vectors["cases"]:
        result = run_case(case["args"])
        expect = case["expect"]

        assert result.returncode == expect["exit_code"], f"{case['name']} exit code"

        if "stdout" in expect:
            assert json.loads(result.stdout) == expect["stdout"], f"{case['name']} stdout"

        if "stderr" in expect:
            assert json.loads(result.stderr) == expect["stderr"], f"{case['name']} stderr"

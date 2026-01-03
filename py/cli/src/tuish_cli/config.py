from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path

import typer

DEFAULT_API_BASE_URL = "https://api.tuish.dev"


@dataclass
class CLIContext:
    config_path: Path
    api_url: str | None = None
    json: bool = False


@dataclass
class Config:
    api_key: str | None = None
    api_base_url: str | None = None


def resolve_config_path(cli_path: Path | None) -> Path:
    if cli_path is not None:
        return cli_path

    env_path = os.getenv("TUISH_CONFIG")
    if env_path:
        return Path(env_path)

    return Path.home() / ".tuish" / "config.json"


def load_config(path: Path) -> Config:
    if not path.exists():
        return Config()

    data = json.loads(path.read_text())
    return Config(
        api_key=data.get("apiKey"),
        api_base_url=data.get("apiBaseUrl"),
    )


def save_config(path: Path, config: Config) -> None:
    if not path.parent.exists():
        path.parent.mkdir(parents=True, exist_ok=True)

    payload: dict[str, str] = {}
    if config.api_key:
        payload["apiKey"] = config.api_key
    if config.api_base_url:
        payload["apiBaseUrl"] = config.api_base_url

    path.write_text(json.dumps(payload, indent=2))


def delete_config(path: Path) -> None:
    if path.exists():
        path.unlink()


def fail(ctx: CLIContext, message: str) -> None:
    if ctx.json:
        from tuish_cli.output import emit_error

        emit_error(message)
        raise typer.Exit(code=1)
    raise typer.BadParameter(message)


def require_api_key(ctx: CLIContext, config: Config) -> str:
    if not config.api_key:
        fail(ctx, "No API key found; run tuish login")
    return config.api_key

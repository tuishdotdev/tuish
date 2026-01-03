from __future__ import annotations

import typer
from rich.console import Console

from tuish_cli.config import load_config, require_api_key
from tuish_cli.output import emit_json

console = Console()


def keys(ctx: typer.Context) -> None:
    config = load_config(ctx.obj.config_path)
    api_key = require_api_key(ctx.obj, config)

    if ctx.obj.json:
        payload = {"apiKey": api_key}
        if config.api_base_url:
            payload["apiBaseUrl"] = config.api_base_url
        emit_json(payload)
        return

    console.print("[bold]API Key[/bold]")
    console.print(api_key)

    if config.api_base_url:
        console.print()
        console.print("[bold]API Base URL[/bold]")
        console.print(config.api_base_url)

from __future__ import annotations

import typer
from rich.console import Console

from tuish_cli.config import DEFAULT_API_BASE_URL, fail, load_config, save_config
from tuish_cli.output import emit_success

console = Console()


def login(
    ctx: typer.Context,
    api_key: str | None = typer.Option(None, "--api-key", help="API key to store"),
) -> None:
    config = load_config(ctx.obj.config_path)

    key = api_key
    if not key:
        if ctx.obj.json:
            fail(ctx.obj, "API key is required")
        key = typer.prompt("Enter your Tuish API key")
    key = key.strip()
    if not key:
        fail(ctx.obj, "API key is required")

    config.api_key = key
    if ctx.obj.api_url:
        config.api_base_url = ctx.obj.api_url
    elif not config.api_base_url:
        config.api_base_url = DEFAULT_API_BASE_URL

    save_config(ctx.obj.config_path, config)
    if ctx.obj.json:
        emit_success("API key stored successfully")
        return
    console.print("[green]Saved credentials.[/green]")
    console.print(f"[dim]Config: {ctx.obj.config_path}[/dim]")

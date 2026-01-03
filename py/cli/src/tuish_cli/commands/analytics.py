from __future__ import annotations

import typer
from rich.console import Console

from tuish_cli.config import load_config, require_api_key
from tuish_cli.output import emit_not_implemented

console = Console()


def analytics(
    ctx: typer.Context,
    period: str | None = typer.Option(None, "--period", help="Time window (e.g. 7d, 30d)"),
) -> None:
    config = load_config(ctx.obj.config_path)
    require_api_key(ctx.obj, config)

    if ctx.obj.json:
        extra = {"period": period} if period else None
        emit_not_implemented(
            "Analytics",
            "Analytics will be added once the API is available.",
            extra=extra,
        )
        return

    console.print("[bold]Analytics[/bold]")
    console.print("[yellow]Not implemented yet[/yellow]")
    if period:
        console.print(f"[dim]Period: {period}[/dim]")
    else:
        console.print("[dim]Analytics will be added once the API is available.[/dim]")

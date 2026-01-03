from __future__ import annotations

import typer
from rich.console import Console

from tuish_cli.config import delete_config
from tuish_cli.output import emit_success

console = Console()


def logout(ctx: typer.Context) -> None:
    delete_config(ctx.obj.config_path)
    if ctx.obj.json:
        emit_success("Logged out successfully")
        return
    console.print("[green]Credentials cleared.[/green]")
    console.print(f"[dim]Config: {ctx.obj.config_path}[/dim]")

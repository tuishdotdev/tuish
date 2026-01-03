from __future__ import annotations

import typer
from rich.console import Console

from tuish_cli.output import emit_not_implemented

console = Console()


def demo(ctx: typer.Context) -> None:
    if ctx.obj.json:
        emit_not_implemented(
            "Tuish demo",
            "Interactive purchase flow demo will be added soon.",
        )
        return
    console.print("[bold]Tuish demo[/bold]")
    console.print("[yellow]Interactive purchase flow demo will be added soon.[/yellow]")

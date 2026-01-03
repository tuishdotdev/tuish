from __future__ import annotations

import typer
from rich.console import Console

from tuish_cli.config import load_config, require_api_key
from tuish_cli.output import emit_not_implemented

app = typer.Typer(help="Manage customers")
console = Console()


def _ensure_auth(ctx: typer.Context) -> None:
    config = load_config(ctx.obj.config_path)
    require_api_key(ctx.obj, config)


@app.command("list")
def list_customers(ctx: typer.Context) -> None:
    _ensure_auth(ctx)
    if ctx.obj.json:
        emit_not_implemented(
            "Customers",
            "Listing customers will be added once the API is available.",
        )
        return
    console.print("[bold]Customers[/bold]")
    console.print("[yellow]Not implemented yet[/yellow]")
    console.print("[dim]Listing customers will be added once the API is available.[/dim]")


@app.command()
def view(ctx: typer.Context, customer_id: str = typer.Argument(..., help="Customer ID")) -> None:
    _ensure_auth(ctx)
    if ctx.obj.json:
        emit_not_implemented(
            "Customer details",
            "Customer lookup will be added once the API is available.",
            extra={"customerId": customer_id},
        )
        return
    console.print("[bold]Customer details[/bold]")
    console.print("[yellow]Not implemented yet[/yellow]")
    console.print(f"[dim]Customer: {customer_id}[/dim]")


@app.command()
def revoke(ctx: typer.Context, customer_id: str = typer.Argument(..., help="Customer ID")) -> None:
    _ensure_auth(ctx)
    if ctx.obj.json:
        emit_not_implemented(
            "Revoke license",
            "License revocation will be added once the API is available.",
            extra={"customerId": customer_id},
        )
        return
    console.print("[bold]Revoke license[/bold]")
    console.print("[yellow]Not implemented yet[/yellow]")
    console.print(f"[dim]Customer: {customer_id}[/dim]")

from __future__ import annotations

import typer
from rich.console import Console

from tuish_cli.config import load_config, require_api_key
from tuish_cli.output import emit_not_implemented

app = typer.Typer(help="Manage products")
console = Console()


def _ensure_auth(ctx: typer.Context) -> None:
    config = load_config(ctx.obj.config_path)
    require_api_key(ctx.obj, config)


@app.command("list")
def list_products(ctx: typer.Context) -> None:
    _ensure_auth(ctx)
    if ctx.obj.json:
        emit_not_implemented(
            "Products",
            "Listing products will be added once the API is available.",
        )
        return
    console.print("[bold]Products[/bold]")
    console.print("[yellow]Not implemented yet[/yellow]")
    console.print("[dim]Listing products will be added once the API is available.[/dim]")


@app.command()
def create(ctx: typer.Context) -> None:
    _ensure_auth(ctx)
    if ctx.obj.json:
        emit_not_implemented(
            "Create product",
            "Interactive creation will be added once the API is available.",
        )
        return
    console.print("[bold]Create product[/bold]")
    console.print("[yellow]Not implemented yet[/yellow]")
    console.print("[dim]Interactive creation will be added once the API is available.[/dim]")


@app.command()
def update(ctx: typer.Context, product_id: str = typer.Argument(..., help="Product ID")) -> None:
    _ensure_auth(ctx)
    if ctx.obj.json:
        emit_not_implemented(
            "Update product",
            "Updates will be added once the API is available.",
            extra={"productId": product_id},
        )
        return
    console.print("[bold]Update product[/bold]")
    console.print("[yellow]Not implemented yet[/yellow]")
    console.print(f"[dim]Product: {product_id}[/dim]")


@app.command()
def delete(ctx: typer.Context, product_id: str = typer.Argument(..., help="Product ID")) -> None:
    _ensure_auth(ctx)
    if ctx.obj.json:
        emit_not_implemented(
            "Delete product",
            "Deletion will be added once the API is available.",
            extra={"productId": product_id},
        )
        return
    console.print("[bold]Delete product[/bold]")
    console.print("[yellow]Not implemented yet[/yellow]")
    console.print(f"[dim]Product: {product_id}[/dim]")

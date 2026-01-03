from __future__ import annotations

from pathlib import Path

import typer

from tuish_cli import commands
from tuish_cli.config import CLIContext, resolve_config_path

app = typer.Typer(help="Tuish developer CLI")


@app.callback()
def main(
    ctx: typer.Context,
    config: Path | None = typer.Option(None, "--config", help="Path to config file"),
    api_url: str | None = typer.Option(None, "--api-url", help="Override API base URL"),
    json: bool = typer.Option(
        False, "--json", "-j", help="Output JSON (headless mode for scripting)"
    ),
) -> None:
    ctx.obj = CLIContext(
        config_path=resolve_config_path(config), api_url=api_url, json=json
    )


app.command()(commands.login)
app.command()(commands.logout)
app.command()(commands.keys)
app.command()(commands.analytics)
app.command()(commands.demo)
app.add_typer(commands.products_app, name="products")
app.add_typer(commands.customers_app, name="customers")


if __name__ == "__main__":
    app()

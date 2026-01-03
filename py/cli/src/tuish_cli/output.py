from __future__ import annotations

import json

import typer


def emit_json(payload: dict, *, err: bool = False) -> None:
    typer.echo(json.dumps(payload, indent=2), err=err)


def emit_success(message: str) -> None:
    emit_json({"success": True, "message": message})


def emit_error(message: str) -> None:
    emit_json({"error": message}, err=True)


def emit_not_implemented(title: str, message: str, extra: dict | None = None) -> None:
    payload = {"status": "not_implemented", "title": title, "message": message}
    if extra:
        payload.update(extra)
    emit_json(payload)

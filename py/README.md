# Tuish Python SDK

Python SDK for [Tuish](https://tuish.dev) - Drop-in licensing and monetization for terminal/TUI apps.

> **Status: Alpha** - The SDK is available and evolving.

## Installation

```bash
pip install tuish
```

## Quick Start

```python
from tuish import Tuish

client = Tuish(product_id="prod_xxx", public_key="pk_xxx")
result = client.check_license()

if result.valid:
    print("Licensed!")
else:
    client.purchase_in_browser()
```

## Features

- License verification (online + offline via Ed25519)
- Automatic license storage in `~/.tuish/licenses/`
- Machine fingerprinting for license binding
- Browser-based purchase flow
- Async support with `asyncio`

## Textual Components

See [`tuish_textual`](./tuish_textual) for Textual TUI widgets.

## CLI (Preview)

See [`py/cli`](./cli) for the Python CLI scaffold.

## Contributing

Interested in helping build the Python SDK? See [CONTRIBUTING.md](../CONTRIBUTING.md).

## License

MIT

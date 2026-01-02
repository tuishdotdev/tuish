# Tuish Rust SDK

Rust SDK for [Tuish](https://tuish.dev) - Drop-in licensing and monetization for terminal/TUI apps.

> **Status: Beta** - API may change before 1.0

## Installation

```bash
cargo add tuish
```

Or add to `Cargo.toml`:

```toml
[dependencies]
tuish = "0.1"
```

## Quick Start

```rust
use tuish::Tuish;

#[tokio::main]
async fn main() -> Result<(), tuish::Error> {
    let client = Tuish::new("prod_xxx", "pk_xxx");

    let result = client.check_license().await?;
    if result.valid {
        println!("Licensed!");
    } else {
        client.purchase_in_browser().await?;
    }

    Ok(())
}
```

## Features

Default features: `http`, `storage`, `browser`

```toml
# Minimal (offline verification only)
tuish = { version = "0.1", default-features = false }

# With HTTP client for online verification
tuish = { version = "0.1", default-features = false, features = ["http"] }
```

| Feature | Description |
|---------|-------------|
| `http` | HTTP client for online verification (reqwest) |
| `storage` | Local license storage (~/.tuish/licenses/) |
| `browser` | Open browser for purchase flow |

## API

### `Tuish::new(product_id, public_key) -> Tuish`

Create a new client.

### `client.check_license() -> Result<LicenseResult>`

Verify license for current machine.

### `client.purchase_in_browser() -> Result<()>`

Open browser for license purchase.

## Development

```bash
cargo test
cargo build --release
```

## License

MIT

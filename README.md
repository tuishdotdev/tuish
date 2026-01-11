# Tuish SDKs

Open source SDKs for [Tuish](https://tuish.dev) - Drop-in licensing and monetization for terminal/TUI apps.

## SDKs

| SDK | Language | Status | Install |
|-----|----------|--------|---------|
| [ts](./ts) | TypeScript/JavaScript | Stable | `npm install @tuish/sdk` |
| [go](./go) | Go | Stable | `go get github.com/tuishdotdev/tuish/go` |
| [rs](./rs) | Rust | Beta | `cargo add tuish` |
| [py](./py) | Python | Alpha | `pip install tuish` |

## CLI

The Tuish CLI (`tuish`) serves two purposes:

```bash
# For developers: manage products and analytics
tuish login --api-key tuish_sk_xxx
tuish products create --name "My App" --slug my-app --price 29.99

# For end-users: manage license
tuish license status --product-id prod_xxx --public-key MCow... --json
tuish license purchase --product-id prod_xxx --public-key MCow... --json
```

See [ts/cli](./ts/cli) for full documentation.

## Other Packages

| Package | Description |
|---------|-------------|
| [ts/cli](./ts/cli) | Tuish CLI (developer + end-user commands) |
| [go/tui](./go/tui) | Bubble Tea TUI components |
| [rs/packages/tuish-ratatui](./rs/packages/tuish-ratatui) | Ratatui widgets |
| [py/tuish_textual](./py/tuish_textual) | Textual widgets |
| [docs](./docs) | Documentation site |

## Quick Start

### TypeScript

```typescript
import { Tuish } from '@tuish/sdk'

const tuish = new Tuish({
  productId: 'prod_xxx',
  publicKey: 'pk_xxx'
})

const result = await tuish.checkLicense()
if (result.valid) {
  console.log('Licensed!')
} else {
  await tuish.purchaseInBrowser()
}
```

### Go

```go
import tuish "github.com/tuishdotdev/tuish/go"

client := tuish.New("prod_xxx", "pk_xxx")
result, err := client.CheckLicense()
if result.Valid {
    fmt.Println("Licensed!")
}
```

### Rust

```rust
use tuish::Tuish;

let client = Tuish::new("prod_xxx", "pk_xxx");
let result = client.check_license().await?;
if result.valid {
    println!("Licensed!");
}
```

## Development

```bash
# From repository root
pnpm install
pnpm build
pnpm test
```

## Documentation

Full documentation at [tuish.dev](https://tuish.dev)

## License

MIT

# Tuish SDKs

Open source SDKs for [Tuish](https://tuish.dev) - Drop-in licensing and monetization for terminal/TUI apps.

## SDKs

| SDK | Language | Status | Install |
|-----|----------|--------|---------|
| [ts](./ts) | TypeScript/JavaScript | Stable | `npm install @tuish/sdk` |
| [go](./go) | Go | Stable | `go get github.com/tuish/tuish/sdk-go` |
| [rs](./rs) | Rust | Beta | `cargo add tuish` |
| [py](./py) | Python | Planned | Coming soon |

## Other Packages

| Package | Description |
|---------|-------------|
| [cli](./cli) | Developer CLI for product management |
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
import tuish "github.com/tuish/tuish/sdk-go"

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

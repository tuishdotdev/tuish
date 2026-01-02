# Tuish SDKs

Open source SDKs for [Tuish](https://tuish.dev) - Drop-in licensing and monetization for terminal/TUI apps.

## SDKs

| SDK | Language | Status | Install |
|-----|----------|--------|---------|
| [sdk-ts](./sdk-ts) | TypeScript/JavaScript | Stable | `npm install @tuish/sdk` |
| [sdk-go](./sdk-go) | Go | Stable | `go get github.com/tuish/tuish/sdk-go` |
| [sdk-rs](./sdk-rs) | Rust | Beta | `cargo add tuish` |
| [sdk-py](./sdk-py) | Python | Planned | Coming soon |

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
  // Trigger purchase flow
  await tuish.purchaseInBrowser()
}
```

### Go

```go
import "github.com/tuish/tuish/sdk-go"

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

## Documentation

Full documentation at [docs.tuish.dev](https://docs.tuish.dev)

## License

MIT

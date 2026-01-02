# Tuish Go SDK

Go SDK for [Tuish](https://tuish.dev) - Drop-in licensing and monetization for terminal/TUI apps.

## Installation

```bash
go get github.com/tuish/tuish/go
```

## Quick Start

```go
package main

import (
    "fmt"
    tuish "github.com/tuish/tuish/go"
)

func main() {
    client := tuish.New("prod_xxx", "pk_xxx")

    result, err := client.CheckLicense()
    if err != nil {
        panic(err)
    }

    if result.Valid {
        fmt.Println("Licensed!")
    } else {
        client.PurchaseInBrowser()
    }
}
```

## Features

- License verification (online + offline via Ed25519)
- Automatic license storage in `~/.tuish/licenses/`
- Machine fingerprinting for license binding
- Browser-based purchase flow

## API

### `tuish.New(productId, publicKey string) *Client`

Create a new Tuish client.

### `client.CheckLicense() (*LicenseResult, error)`

Check if current machine has a valid license.

### `client.PurchaseInBrowser() error`

Open browser for license purchase.

## Development

```bash
go test ./...
```

## License

MIT

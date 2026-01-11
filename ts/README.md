# Tuish TypeScript SDK

TypeScript/JavaScript SDK for [Tuish](https://tuish.dev) - Drop-in licensing and monetization for terminal/TUI apps.

## Installation

```bash
npm install @tuish/sdk
```

## Quick Start

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

## Packages

This monorepo contains:

| Package | Description |
|---------|-------------|
| [tuish](./cli) | CLI for developers and end-users |
| [@tuish/sdk](./packages/sdk) | Core SDK for license verification and purchase flows |
| [@tuish/crypto](./packages/crypto) | Ed25519 signing and verification |
| [@tuish/types](./packages/types) | Shared TypeScript types |
| [@tuish/cli-core](./packages/cli-core) | CLI framework internals |
| [@tuish/adapters-node](./packages/adapters-node) | Node.js platform adapter |
| [@tuish/adapters-browser](./packages/adapters-browser) | Browser platform adapter |
| [@tuish/ink](./packages/ink) | Ink components for terminal UIs |
| [@tuish/react](./packages/react) | React hooks for browser UIs |

## CLI

```bash
npm install -g tuish

# Developer commands
tuish login --api-key tuish_sk_xxx
tuish products create --name "My App" --slug my-app --price 29.99

# End-user commands
tuish license status --product-id prod_xxx --public-key MCow... --json
tuish license purchase --product-id prod_xxx --public-key MCow... --json
```

## Development

```bash
pnpm install
pnpm build      # Build all packages
pnpm test       # Run tests
pnpm typecheck  # Type check
```

## License

MIT

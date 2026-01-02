# Tuish CLI

Developer CLI for [Tuish](https://tuish.dev) - manage your products, view analytics, and connect Stripe.

## Installation

```bash
npm install -g tuish
```

## Commands

```bash
tuish login          # Authenticate with Tuish
tuish products       # List your products
tuish products add   # Create a new product
tuish analytics      # View license analytics
tuish stripe         # Manage Stripe connection
```

## Quick Start

```bash
# 1. Login (opens browser for OAuth)
tuish login

# 2. Create your first product
tuish products add

# 3. Connect Stripe
tuish stripe connect
```

## Development

```bash
pnpm install
pnpm dev        # Watch mode
pnpm build      # Build
pnpm test       # Run tests
```

### Testing

```bash
# Unit tests
pnpm test

# Integration tests (requires build)
pnpm test:integration
```

## License

MIT

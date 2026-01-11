# Tuish CLI

Command-line interface for [Tuish](https://tuish.dev) - licensing and monetization for terminal apps.

## Installation

```bash
npm install -g tuish
```

## Two Modes

The CLI serves two audiences:

| Mode | Purpose | Authentication |
|------|---------|----------------|
| **Developer** | Manage products, view analytics, configure Stripe | API key (`tuish login`) |
| **End-User** | Check license, activate, purchase | Product ID + public key |

---

## End-User Commands (License Management)

For users of Tuish-licensed applications:

```bash
# Check current license status
tuish license status --product-id prod_xxx --public-key MCow... --json

# Activate a license key
tuish license activate --product-id prod_xxx --public-key MCow... --license-key lic_xxx --json

# Purchase a license (opens browser)
tuish license purchase --product-id prod_xxx --public-key MCow... --json

# Clear stored license
tuish license deactivate --product-id prod_xxx --public-key MCow... --json
```

### Required Flags

| Flag | Description |
|------|-------------|
| `--product-id` | Product ID from developer |
| `--public-key` | Ed25519 public key (SPKI base64 format) |
| `--license-key` | License key (for `activate` only) |
| `--json` | Output JSON (required for headless mode) |

---

## Developer Commands

For developers building Tuish-licensed applications:

### Authentication

```bash
tuish signup --email dev@example.com     # Create account
tuish login --api-key tuish_sk_xxx       # Store API key
tuish logout                             # Clear API key
tuish whoami                             # Check auth status
```

### Products

```bash
tuish products                           # List products
tuish products list                      # List products
tuish products get --id prod_xxx         # Get product details
tuish products create --name "My App" --slug my-app --price 29.99
tuish products update --id prod_xxx --name "New Name"
tuish products delete --id prod_xxx
```

### Licenses (Admin)

```bash
tuish licenses                           # List all licenses
tuish licenses list --product prod_xxx   # Filter by product
tuish licenses get --id lic_xxx          # Get license details
tuish licenses issue --customer cus_xxx --product prod_xxx
tuish licenses revoke --id lic_xxx
tuish licenses reinstate --id lic_xxx
tuish licenses usage --id lic_xxx --amount 1
```

### Customers

```bash
tuish customers                          # List customers
tuish customers get --id cus_xxx         # Get customer details
tuish customers licenses --id cus_xxx    # Get customer's licenses
```

### Analytics

```bash
tuish analytics licenses --period 30d    # License analytics
tuish analytics features                 # Feature usage
tuish analytics devices                  # Device analytics
```

### Webhooks

```bash
tuish webhooks                           # List webhooks
tuish webhooks create --url https://... --events license.created
tuish webhooks delete --id wh_xxx
tuish webhooks test --id wh_xxx
```

### Stripe Connect

```bash
tuish connect                            # Check Stripe status
tuish connect start                      # Start OAuth flow
```

---

## Interactive Mode

Run `tuish` without arguments for the interactive TUI:

```bash
tuish                                    # Launch TUI dashboard
```

---

## JSON Output

Add `--json` flag for machine-readable output:

```bash
tuish products --json
tuish license status --product-id prod_xxx --public-key MCow... --json
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `TUISH_DEV` | Set to use localhost:8787 instead of production API |

---

## Development

```bash
pnpm install
pnpm dev        # Watch mode
pnpm build      # Build
pnpm test       # Run tests
```

## License

MIT

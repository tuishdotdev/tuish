import { render } from 'ink';
import meow from 'meow';
import { App } from './app.js';
import { runHeadless } from './headless.js';
import type { CliFlags } from './types.js';

const cli = meow(
	`
  Usage
    $ tuish <command> [options]

  Commands
    (no command)    Launch interactive TUI dashboard

    Auth:
      signup          Create a new developer account
      login           Log in with your API key
      logout          Clear stored API key
      whoami          Show current authentication status

    Stripe Connect:
      connect         Show Stripe Connect status
      connect start   Start Stripe Connect OAuth flow

    Products:
      products            List all products
      products list       List all products
      products get        Get a product by ID
      products create     Create a new product
      products update     Update an existing product
      products delete     Delete a product

    Licenses:
      licenses            List all licenses
      licenses list       List all licenses
      licenses get        Get a license by ID
      licenses issue      Issue a new license
      licenses revoke     Revoke a license
      licenses reinstate  Reinstate a revoked license
      licenses usage      Record usage for a license

    Customers:
      customers           List all customers
      customers list      List all customers
      customers get       Get a customer by ID
      customers licenses  Get licenses for a customer

    Analytics:
      analytics licenses  License analytics (activations, etc.)
      analytics features  Feature usage analytics
      analytics devices   Device analytics

    Webhooks:
      webhooks            List all webhooks
      webhooks list       List all webhooks
      webhooks create     Create a new webhook
      webhooks delete     Delete a webhook
      webhooks test       Test a webhook

  Options
    -j, --json      Output JSON (headless mode for scripting)

    Signup:
      -e, --email     Developer email (required)
      -n, --name      Developer name

    Login:
      --api-key       API key (required)
      -k, --key       API key (alias)

    Products Create:
      --name          Product name (required)
      -s, --slug      URL slug (required)
      -d, --desc      Description
      -p, --price     Price in dollars (required, e.g., 29.99)
      -b, --billing   Billing type: one_time or subscription (default: one_time)

    Products Update/Get/Delete:
      -i, --id        Product ID (required)
      --name          New product name
      -d, --desc      New description
      -p, --price     New price in dollars

    Licenses:
      -i, --id        License ID
      --customer      Customer ID
      --product       Product ID
      --features      Comma-separated feature list
      --amount        Usage amount (for usage command)

    Customers:
      -i, --id        Customer ID (required for get/licenses)

    Analytics:
      --period        Time period (e.g., 7d, 30d, 90d)

    Webhooks:
      -i, --id        Webhook ID (for delete/test)
      --url           Webhook URL (for create)
      --events        Comma-separated event types (for create)

  General:
    --help          Show this help message
    --version       Show version

  Environment
    TUISH_DEV       Set to any value to use localhost:8787

  Examples
    $ tuish
    $ tuish signup -e dev@example.com -n "My Name"
    $ tuish login -k tuish_sk_xxx
    $ tuish products --json
    $ tuish products create --name "My App" -s my-app -p 29.99 --json
    $ tuish licenses list --product prod_xxx --json
    $ tuish webhooks create --url https://example.com/hook --events license.created,license.revoked --json
`,
	{
		importMeta: import.meta,
		flags: {
			// Common
			json: { type: 'boolean', shortFlag: 'j' },
			email: { type: 'string', shortFlag: 'e' },
			name: { type: 'string', shortFlag: 'n' },
			key: { type: 'string', shortFlag: 'k' },
			apiKey: { type: 'string' },
			id: { type: 'string', shortFlag: 'i' },
			// Products
			slug: { type: 'string', shortFlag: 's' },
			desc: { type: 'string', shortFlag: 'd' },
			price: { type: 'string', shortFlag: 'p' },
			billing: { type: 'string', shortFlag: 'b' },
			// Licenses
			customer: { type: 'string' },
			product: { type: 'string' },
			features: { type: 'string' },
			amount: { type: 'string' },
			// Analytics
			period: { type: 'string' },
			// Webhooks
			url: { type: 'string' },
			events: { type: 'string' },
		},
	},
);

const [command, subcommand] = cli.input;

// Re-export the CliFlags type from types.ts (meow generates its own type, but we use the shared one)
export type { CliFlags } from './types.js';

// Cast cli.flags to our CliFlags type for consistency
const flags = cli.flags as unknown as CliFlags;

if (cli.flags.json) {
	// Headless mode: output JSON directly
	runHeadless(command, subcommand, flags);
} else {
	// TUI mode: render Ink app
	render(<App command={command} subcommand={subcommand} flags={flags} />);
}

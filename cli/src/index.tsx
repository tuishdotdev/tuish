import { render } from 'ink';
import meow from 'meow';
import { App } from './app.js';

const cli = meow(
	`
  Usage
    $ tuish <command> [options]

  Commands
    (no command)    Launch interactive TUI dashboard
    signup          Create a new developer account
    login           Log in with your API key
    logout          Clear stored API key
    whoami          Show current authentication status
    connect         Connect your Stripe account (required to sell)
    products        List all products
    products list   List all products
    products create Create a new product
    products update Update an existing product

  Options (for scripting)
    Signup:
      -e, --email     Developer email (required)
      -n, --name      Developer name

    Login:
      -k, --key       API key

    Products Create:
      --name          Product name (required)
      -s, --slug      URL slug (required)
      -d, --desc      Description
      -p, --price     Price in dollars (required, e.g., 29.99)
      -b, --billing   Billing type: one_time or subscription (default: one_time)

    Products Update:
      -i, --id        Product ID (required)
      --name          New product name
      -d, --desc      New description
      -p, --price     New price in dollars

  General:
    --help          Show this help message
    --version       Show version

  Environment
    TUISH_DEV       Set to any value to use localhost:8787

  Examples
    $ tuish
    $ tuish signup -e dev@example.com -n "My Name"
    $ tuish login -k tuish_sk_xxx
    $ tuish products create --name "My App" -s my-app -p 29.99
    $ tuish products update -i prod_xxx -p 39.99
`,
	{
		importMeta: import.meta,
		flags: {
			// Common
			email: { type: 'string', shortFlag: 'e' },
			name: { type: 'string', shortFlag: 'n' },
			key: { type: 'string', shortFlag: 'k' },
			// Products
			slug: { type: 'string', shortFlag: 's' },
			desc: { type: 'string', shortFlag: 'd' },
			price: { type: 'string', shortFlag: 'p' },
			billing: { type: 'string', shortFlag: 'b' },
			id: { type: 'string', shortFlag: 'i' },
		},
	},
);

const [command, subcommand] = cli.input;

export type CliFlags = typeof cli.flags;

render(<App command={command} subcommand={subcommand} flags={cli.flags} />);

import type { PlatformContext } from '@tuish/cli-core';
import {
  loginCommand,
  logoutCommand,
  signupCommand,
  whoamiCommand,
  productListCommand,
  productCreateCommand,
  connectStatusCommand,
  formatCurrency,
} from '@tuish/cli-core';

// Use a generic type to avoid importing xterm at the module level
type TerminalLike = {
  write: (data: string) => void;
  writeln: (data: string) => void;
  clear: () => void;
};

type CommandHandler = (
  ctx: PlatformContext,
  args: string[],
  term: TerminalLike,
) => Promise<void>;

// Track authentication state for conditional help menu
let isAuthenticated = false;

export function setIsAuthenticated(value: boolean): void {
  isAuthenticated = value;
}

export function getIsAuthenticated(): boolean {
  return isAuthenticated;
}

const COMMANDS: Record<string, CommandHandler> = {
  help: async (ctx) => {
    ctx.output.writeLine('\x1b[1mUsage:\x1b[0m tuish <command>');
    ctx.output.writeLine('');
    ctx.output.writeLine('\x1b[1mCommands:\x1b[0m');
    ctx.output.writeLine('  \x1b[33mtuish signup <email>\x1b[0m              Create a new account');
    ctx.output.writeLine('  \x1b[33mtuish login <api-key>\x1b[0m             Log in with your API key');
    ctx.output.writeLine('  \x1b[33mtuish whoami\x1b[0m                      Show current auth status');
    ctx.output.writeLine('  \x1b[33mtuish docs\x1b[0m                        Open documentation');

    // Show authenticated-only commands when logged in
    if (isAuthenticated) {
      ctx.output.writeLine('  \x1b[33mtuish logout\x1b[0m                      Clear stored credentials');
      ctx.output.writeLine('  \x1b[33mtuish products\x1b[0m                    List your products');
      ctx.output.writeLine('  \x1b[33mtuish products create <n> <p>\x1b[0m     Create a product');
      ctx.output.writeLine('  \x1b[33mtuish connect\x1b[0m                     Check Stripe Connect status');
    } else {
      ctx.output.writeLine('');
      ctx.output.writeLine('\x1b[90m  (Log in to see more commands)\x1b[0m');
      ctx.output.writeLine('');
    }
  },

  docs: async (ctx) => {
    ctx.output.writeLine('Opening documentation...');
    window.open('/docs', '_self');
  },

  signup: async (ctx, args) => {
    const email = args[0];
    if (!email) {
      ctx.output.writeLine('\x1b[31mUsage: signup <email>\x1b[0m');
      return;
    }

    ctx.output.writeLine(`Signing up with email: ${email}...`);
    const result = await signupCommand(ctx, { email });

    if (result.success && result.data) {
      isAuthenticated = true;
      ctx.output.writeLine('');
      ctx.output.writeLine(`\x1b[32mAccount created successfully!\x1b[0m`);
      ctx.output.writeLine('');
      ctx.output.writeLine(`Your API key: \x1b[1;33m${result.data.apiKey}\x1b[0m`);
      ctx.output.writeLine('');
      ctx.output.writeLine('\x1b[90mSave this key securely - it won\'t be shown again.\x1b[0m');
      ctx.output.writeLine('\x1b[90mYou are now logged in automatically.\x1b[0m');
    } else {
      ctx.output.writeLine(`\x1b[31mError: ${result.error}\x1b[0m`);
    }
  },

  login: async (ctx, args) => {
    const apiKey = args[0];
    if (!apiKey) {
      ctx.output.writeLine('\x1b[31mUsage: login <api-key>\x1b[0m');
      ctx.output.writeLine('\x1b[90mExample: login sk_live_abc123...\x1b[0m');
      return;
    }

    ctx.output.writeLine('Validating API key...');
    const result = await loginCommand(ctx, { apiKey });

    if (result.success) {
      isAuthenticated = true;
      ctx.output.writeLine(`\x1b[32m${result.message}\x1b[0m`);
    } else {
      ctx.output.writeLine(`\x1b[31mError: ${result.error}\x1b[0m`);
    }
  },

  logout: async (ctx) => {
    const result = await logoutCommand(ctx);
    isAuthenticated = false;
    ctx.output.writeLine(`\x1b[32m${result.message}\x1b[0m`);
  },

  whoami: async (ctx) => {
    const result = await whoamiCommand(ctx);
    if (result.data?.isAuthenticated) {
      ctx.output.writeLine(`\x1b[32mAuthenticated\x1b[0m`);
      ctx.output.writeLine(`API key: ${result.data.apiKeyPreview}`);
    } else {
      ctx.output.writeLine('\x1b[33mNot logged in.\x1b[0m');
      ctx.output.writeLine('Run \x1b[36msignup <email>\x1b[0m to create an account, or');
      ctx.output.writeLine('Run \x1b[36mlogin <api-key>\x1b[0m to authenticate.');
    }
  },

  products: async (ctx, args) => {
    if (args[0] === 'create') {
      // Usage: products create <name> <price> [subscription]
      const name = args[1];
      const priceArg = args[2];
      const billingTypeArg = args[3];

      if (!name || !priceArg) {
        ctx.output.writeLine('\x1b[1mUsage:\x1b[0m tuish products create <name> <price> [subscription]');
        ctx.output.writeLine('');
        ctx.output.writeLine('\x1b[1mArguments:\x1b[0m');
        ctx.output.writeLine('  \x1b[33mname\x1b[0m          Product name (use quotes for spaces)');
        ctx.output.writeLine('  \x1b[33mprice\x1b[0m         Price in cents (e.g., 999 for $9.99)');
        ctx.output.writeLine('  \x1b[33msubscription\x1b[0m  Optional: add "subscription" for monthly billing');
        ctx.output.writeLine('');
        ctx.output.writeLine('\x1b[1mExamples:\x1b[0m');
        ctx.output.writeLine('  \x1b[36mtuish products create "My CLI Tool" 999\x1b[0m');
        ctx.output.writeLine('  \x1b[36mtuish products create "Pro Plan" 1999 subscription\x1b[0m');
        return;
      }

      const priceCents = parseInt(priceArg, 10);
      if (isNaN(priceCents) || priceCents < 0) {
        ctx.output.writeLine('\x1b[31mError: Price must be a positive number (in cents)\x1b[0m');
        return;
      }

      // Generate slug from name
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const billingType = billingTypeArg === 'subscription' ? 'subscription' : 'one_time';

      ctx.output.writeLine(`Creating product "${name}"...`);

      const result = await productCreateCommand(ctx, {
        name,
        slug,
        priceCents,
        billingType,
      });

      if (result.success && result.data) {
        const { product } = result.data;
        const price = formatCurrency(product.priceCents, product.currency);
        const billing = product.billingType === 'subscription' ? '/mo' : '';
        ctx.output.writeLine('');
        ctx.output.writeLine(`\x1b[32mProduct created successfully!\x1b[0m`);
        ctx.output.writeLine('');
        ctx.output.writeLine(`  \x1b[1m${product.name}\x1b[0m`);
        ctx.output.writeLine(`  Slug: ${product.slug}`);
        ctx.output.writeLine(`  Price: ${price}${billing}`);
        ctx.output.writeLine(`  Type: ${product.billingType}`);
      } else {
        ctx.output.writeLine(`\x1b[31mError: ${result.error}\x1b[0m`);
      }
      return;
    }

    ctx.output.writeLine('Fetching products...');
    const result = await productListCommand(ctx);

    if (result.success && result.data) {
      const { products } = result.data;
      if (products.length === 0) {
        ctx.output.writeLine('');
        ctx.output.writeLine('\x1b[33mNo products yet.\x1b[0m');
        ctx.output.writeLine('Create one with: \x1b[36mtuish products create <name> <price>\x1b[0m');
      } else {
        ctx.output.writeLine('');
        ctx.output.writeLine(`\x1b[1mYour Products (${products.length}):\x1b[0m`);
        ctx.output.writeLine('');
        for (const p of products) {
          const price = formatCurrency(p.priceCents, p.currency);
          const billing = p.billingType === 'subscription' ? '/mo' : '';
          ctx.output.writeLine(`  \x1b[36m${p.name}\x1b[0m (${p.slug})`);
          ctx.output.writeLine(`    ${price}${billing} - ${p.billingType}`);
          if (p.description) {
            ctx.output.writeLine(`    \x1b[90m${p.description}\x1b[0m`);
          }
          ctx.output.writeLine('');
        }
      }
    } else {
      ctx.output.writeLine(`\x1b[31mError: ${result.error}\x1b[0m`);
    }
  },

  connect: async (ctx) => {
    ctx.output.writeLine('Checking Stripe Connect status...');
    const result = await connectStatusCommand(ctx);

    if (result.success && result.data) {
      if (result.data.connected) {
        ctx.output.writeLine(`\x1b[32mStripe Connected\x1b[0m`);
        ctx.output.writeLine(`Account ID: ${result.data.accountId}`);
      } else {
        ctx.output.writeLine('\x1b[33mStripe not connected.\x1b[0m');
        ctx.output.writeLine('Use the full CLI to connect: \x1b[36mtuish connect\x1b[0m');
      }
    } else {
      ctx.output.writeLine(`\x1b[31mError: ${result.error}\x1b[0m`);
    }
  },

  clear: async (ctx) => {
    ctx.output.clear();
  },
};

export async function executeCommand(
  ctx: PlatformContext,
  input: string,
  term: TerminalLike,
): Promise<void> {
  const parts = input.trim().split(/\s+/);
  const firstWord = parts[0]?.toLowerCase();

  if (!firstWord) return;

  // Handle special commands that don't need tuish prefix
  if (firstWord === 'clear') {
    ctx.output.clear();
    return;
  }

  if (firstWord === 'help') {
    await COMMANDS.help?.(ctx, [], term);
    return;
  }

  if (firstWord === 'docs') {
    await COMMANDS.docs?.(ctx, [], term);
    return;
  }

  // Handle npm/npx commands gracefully
  if (firstWord === 'npm' || firstWord === 'npx') {
    ctx.output.writeLine('\x1b[33mThis is a browser demo - npm commands don\'t work here.\x1b[0m');
    ctx.output.writeLine('');
    ctx.output.writeLine('To install the real CLI, open your actual terminal and run:');
    ctx.output.writeLine('  \x1b[36mnpm install -g tuish\x1b[0m');
    return;
  }

  // Require tuish prefix for all other commands
  if (firstWord !== 'tuish') {
    ctx.output.writeLine(`\x1b[31mCommand not found: ${firstWord}\x1b[0m`);
    ctx.output.writeLine('Try \x1b[33mtuish help\x1b[0m or \x1b[33mtuish login\x1b[0m');
    return;
  }

  // Parse tuish subcommand
  const command = parts[1]?.toLowerCase() ?? '';
  const args = parts.slice(2);

  if (!command) {
    await COMMANDS.help?.(ctx, [], term);
    return;
  }

  const handler = COMMANDS[command];
  if (handler) {
    try {
      await handler(ctx, args, term);
    } catch (error) {
      ctx.output.writeLine(
        `\x1b[31mError: ${error instanceof Error ? error.message : 'Unknown error'}\x1b[0m`,
      );
    }
  } else {
    ctx.output.writeLine(`\x1b[31mtuish: '${command}' is not a tuish command.\x1b[0m`);
    ctx.output.writeLine('See \x1b[33mtuish help\x1b[0m for available commands.');
  }
}

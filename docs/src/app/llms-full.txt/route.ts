import { source } from '@/lib/source';
import { getLLMText } from '@/lib/get-llm-text';

export const revalidate = false;

export async function GET() {
	const pages = source.getPages();
	const texts = await Promise.all(pages.map(getLLMText));

	const header = `# Tuish

> Better-auth for entitlements - drop-in licensing and monetization for terminal/TUI applications. In terminal environments, the license key IS the authentication.

Tuish provides Ed25519 cryptographically signed licenses that work offline-first. Payments flow through your Stripe account via Stripe Connect (Standard accounts, direct charges). SDKs available for TypeScript, Go, Rust, and Python.

---

`;

	return new Response(header + texts.join('\n\n---\n\n'), {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
		},
	});
}

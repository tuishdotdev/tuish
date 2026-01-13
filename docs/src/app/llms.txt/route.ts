import { source } from '@/lib/source';

export const revalidate = false;

export function GET() {
	const pages = source.getPages();

	const sections: Record<string, { title: string; url: string; description?: string }[]> = {
		'Docs': [],
		'How-to Guides': [],
		'Reference': [],
		'Concepts': [],
	};

	for (const page of pages) {
		const url = `https://docs.tuish.dev${page.url}`;
		const entry = {
			title: page.data.title,
			url,
			description: page.data.description,
		};

		if (page.url.includes('/tutorials/') || page.url === '/docs') {
			sections['Docs'].push(entry);
		} else if (page.url.includes('/how-to/')) {
			sections['How-to Guides'].push(entry);
		} else if (page.url.includes('/reference/')) {
			sections['Reference'].push(entry);
		} else if (page.url.includes('/explanation/')) {
			sections['Concepts'].push(entry);
		}
	}

	const lines = [
		'# Tuish',
		'',
		'> Better-auth for entitlements - drop-in licensing and monetization for terminal/TUI applications. In terminal environments, the license key IS the authentication.',
		'',
		'Tuish provides Ed25519 cryptographically signed licenses that work offline-first. Payments flow through your Stripe account via Stripe Connect (Standard accounts, direct charges). SDKs available for TypeScript, Go, Rust, and Python.',
		'',
	];

	for (const [section, entries] of Object.entries(sections)) {
		if (entries.length === 0) continue;

		lines.push(`## ${section}`, '');
		for (const entry of entries) {
			const desc = entry.description ? `: ${entry.description}` : '';
			lines.push(`- [${entry.title}](${entry.url})${desc}`);
		}
		lines.push('');
	}

	return new Response(lines.join('\n'), {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
		},
	});
}

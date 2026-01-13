import { type NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// Rewrite /docs/xxx.mdx to /llms.mdx/docs/xxx
	if (pathname.startsWith('/docs/') && pathname.endsWith('.mdx')) {
		const slug = pathname.slice(6, -4); // Remove /docs/ prefix and .mdx suffix
		const newUrl = new URL(`/llms.mdx/docs/${slug}`, request.url);
		return NextResponse.rewrite(newUrl);
	}

	return NextResponse.next();
}

export const config = {
	matcher: '/docs/:path*.mdx',
};

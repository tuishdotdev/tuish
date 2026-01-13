import { source } from '@/lib/source';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import {
	DocsBody,
	DocsDescription,
	DocsPage,
	DocsTitle,
} from 'fumadocs-ui/page';
import { notFound } from 'next/navigation';
import { LLMCopyButton } from '@/components/page-actions';

interface PageProps {
	params: Promise<{ slug?: string[] }>;
}

export default async function Page({ params }: PageProps) {
	const { slug } = await params;
	const page = source.getPage(slug);
	if (!page) notFound();

	const MDX = page.data.body;

	return (
		<DocsPage toc={page.data.toc}>
			<DocsTitle>{page.data.title}</DocsTitle>
			<DocsDescription>{page.data.description}</DocsDescription>
			<div className="not-prose mb-6 flex items-center gap-2 border-b pb-4">
				<LLMCopyButton markdownUrl={`${page.url}.mdx`} />
			</div>
			<DocsBody>
				<MDX components={{ ...defaultMdxComponents }} />
			</DocsBody>
		</DocsPage>
	);
}

export async function generateStaticParams() {
	return source.generateParams();
}

export async function generateMetadata({ params }: PageProps) {
	const { slug } = await params;
	const page = source.getPage(slug);
	if (!page) notFound();

	return {
		title: page.data.title,
		description: page.data.description,
	};
}

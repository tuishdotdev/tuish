import type { InferPageType } from 'fumadocs-core/source';
import type { source } from './source';

export async function getLLMText(
	page: InferPageType<typeof source>,
): Promise<string> {
	const content = await page.data.getText('raw');

	return `# ${page.data.title}
URL: https://docs.tuish.dev${page.url}

${page.data.description ?? ''}

${content}`;
}

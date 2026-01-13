import 'tuimorphic/styles.css';

import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';
import { NavTitle } from '@/components/NavTitle';

export default function Layout({ children }: { children: ReactNode }) {
	return (
		<DocsLayout
			tree={source.pageTree}
			nav={{
				title: <NavTitle />,
			}}
		>
			{children}
		</DocsLayout>
	);
}

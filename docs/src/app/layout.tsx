import { RootProvider } from 'fumadocs-ui/provider';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
	title: 'Tuish Documentation',
	description: 'Documentation for the Tuish SDK - TUI monetization platform',
};

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className="theme-dark">
				<RootProvider>{children}</RootProvider>
			</body>
		</html>
	);
}

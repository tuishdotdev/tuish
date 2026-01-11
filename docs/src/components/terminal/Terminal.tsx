'use client';

import { useEffect, useRef, useState } from 'react';

export function Terminal() {
	const containerRef = useRef<HTMLDivElement>(null);
	const initializedRef = useRef(false);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		if (!containerRef.current || initializedRef.current) return;
		initializedRef.current = true;

		let cleanup: (() => void) | null = null;

		async function initTerminal() {
			if (!containerRef.current) return;

			// Dynamically import all modules
			const [xtermModule, fitModule, linksModule, cliModule] = await Promise.all([
				import('@xterm/xterm'),
				import('@xterm/addon-fit'),
				import('@xterm/addon-web-links'),
				import('tuish/browser'),
			]);

			// Import the CSS
			await import('@xterm/xterm/css/xterm.css');

			const XTerm = xtermModule.Terminal;
			const FitAddon = fitModule.FitAddon;
			const WebLinksAddon = linksModule.WebLinksAddon;
			const { renderToBrowser } = cliModule;

			const term = new XTerm({
				theme: {
					background: 'transparent',
					foreground: '#e8e8e8',
					cursor: '#50fa7b',
					cursorAccent: '#000000',
					selectionBackground: 'rgba(80, 250, 123, 0.25)',
					black: '#1a1a1a',
					red: '#ff6b6b',
					green: '#50fa7b',
					yellow: '#50fa7b',
					blue: '#8be9fd',
					magenta: '#ff79c6',
					cyan: '#8be9fd',
					white: '#f0f0f0',
					brightBlack: '#555555',
					brightRed: '#ff8585',
					brightGreen: '#69ff94',
					brightYellow: '#69ff94',
					brightBlue: '#a4ffff',
					brightMagenta: '#ff92df',
					brightCyan: '#a4ffff',
					brightWhite: '#ffffff',
				},
				fontFamily: 'Unifont, monospace',
				fontSize: typeof window !== 'undefined' && window.innerWidth < 768 ? 12 : 18,
				lineHeight: 1.3,
				cursorBlink: true,
				cursorStyle: 'underline',
				allowTransparency: true,
			});

			const fitAddon = new FitAddon();
			term.loadAddon(fitAddon);
			term.loadAddon(new WebLinksAddon());

			term.open(containerRef.current);
			fitAddon.fit();

			// Render the Ink CLI to xterm.js
			const inkInstance = renderToBrowser({
				write: (data: string) => term.write(data),
				columns: term.cols,
				rows: term.rows,
			});

			// Auto-focus the terminal
			term.focus();

			// Handle resize
			const handleResize = () => {
				try {
					fitAddon.fit();
					inkInstance.setDimensions(term.cols, term.rows);
				} catch {
					// Ignore resize errors
				}
			};
			window.addEventListener('resize', handleResize);

			// Bridge keyboard input from xterm.js to Ink
			term.onKey(({ key, domEvent }) => {
				// Map xterm.js key events to what Ink expects
				if (domEvent.key === 'Enter') {
					inkInstance.pushKey('\r');
				} else if (domEvent.key === 'Backspace') {
					inkInstance.pushKey('\x7f');
				} else if (domEvent.key === 'Escape') {
					inkInstance.pushKey('\x1b');
				} else if (domEvent.key === 'ArrowUp') {
					inkInstance.pushKey('\x1b[A');
				} else if (domEvent.key === 'ArrowDown') {
					inkInstance.pushKey('\x1b[B');
				} else if (domEvent.key === 'ArrowRight') {
					inkInstance.pushKey('\x1b[C');
				} else if (domEvent.key === 'ArrowLeft') {
					inkInstance.pushKey('\x1b[D');
				} else if (domEvent.key === 'Tab') {
					inkInstance.pushKey('\t');
				} else if (domEvent.ctrlKey && domEvent.key === 'c') {
					inkInstance.pushKey('\x03');
				} else if (key.length === 1 && !domEvent.ctrlKey && !domEvent.altKey && !domEvent.metaKey) {
					inkInstance.pushKey(key);
				}
			});

			setIsLoading(false);

			cleanup = () => {
				window.removeEventListener('resize', handleResize);
				inkInstance.unmount();
				term.dispose();
			};
		}

		initTerminal();

		return () => {
			cleanup?.();
		};
	}, []);

	return (
		<div
			ref={containerRef}
			className="terminal-container"
			style={{
				width: '100%',
				height: '100%',
				flex: 1,
				minHeight: '500px',
				background: 'rgba(10, 10, 15, 0.4)',
				backdropFilter: 'blur(12px)',
				WebkitBackdropFilter: 'blur(12px)',
				borderRadius: 0,
				border: '1px solid rgba(255, 255, 255, 0.1)',
				boxShadow: `
          0 0 0 1px rgba(255, 255, 255, 0.1) inset,
          0 4px 8px rgba(0, 0, 0, 0.4),
          0 12px 24px rgba(0, 0, 0, 0.5),
          0 24px 48px rgba(0, 0, 0, 0.6),
          0 48px 96px rgba(0, 0, 0, 0.5),
          0 0 120px rgba(80, 250, 123, 0.08)
        `,
				padding: '16px',
				overflow: 'hidden',
			}}
		>
			{isLoading && (
				<div style={{ padding: '20px', color: '#50fa7b' }}>Loading terminal...</div>
			)}
		</div>
	);
}

/**
 * Browser entry point for the Tuish CLI
 * This renders the Ink app to an xterm.js terminal in the browser
 */

// Browser globals type declarations
declare const localStorage: {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
	removeItem(key: string): void;
};

import { render } from 'ink';
import { createXtermInkBridge, type XtermInkBridge } from '@tuish/adapters-browser';
import { App } from './app.js';
import { ConfigProvider, type ConfigAdapter } from './context/ConfigContext.js';

export { ConfigProvider, type ConfigAdapter } from './context/ConfigContext.js';
export { App } from './app.js';
export type { Screen } from './app.js';

const STORAGE_KEY_PREFIX = 'tuish:';
const DEFAULT_API_URL = 'https://tuish-api-production.doug-lance.workers.dev';

/**
 * Create a localStorage-based config adapter for browser use
 */
export function createBrowserConfig(): ConfigAdapter {
	return {
		getApiKey: () => {
			return localStorage.getItem(`${STORAGE_KEY_PREFIX}apiKey`) ?? undefined;
		},
		saveApiKey: (key: string) => {
			localStorage.setItem(`${STORAGE_KEY_PREFIX}apiKey`, key);
		},
		clearApiKey: () => {
			localStorage.removeItem(`${STORAGE_KEY_PREFIX}apiKey`);
		},
		getApiBaseUrl: () => {
			return (
				localStorage.getItem(`${STORAGE_KEY_PREFIX}apiBaseUrl`) ?? DEFAULT_API_URL
			);
		},
	};
}

export interface RenderToBrowserOptions {
	/** Callback to write output to xterm.js */
	write: (data: string) => void;
	/** Terminal columns */
	columns?: number;
	/** Terminal rows */
	rows?: number;
	/** Initial command (for deep linking) */
	command?: string;
	/** Initial subcommand */
	subcommand?: string;
	/** Custom config adapter (defaults to localStorage) */
	config?: ConfigAdapter;
}

export interface BrowserInstance {
	/** Unmount the app */
	unmount: () => void;
	/** Wait for the app to exit */
	waitUntilExit: () => Promise<void>;
	/** Clear the terminal output */
	clear: () => void;
	/** Rerender with new props */
	rerender: (command?: string, subcommand?: string) => void;
	/** Push a keypress event from xterm.js */
	pushKey: (key: string) => void;
	/** Update terminal dimensions */
	setDimensions: (columns: number, rows: number) => void;
	/** The xterm-ink bridge for advanced use */
	bridge: XtermInkBridge;
}

/**
 * Render the Tuish CLI to an xterm.js terminal in the browser
 */
export function renderToBrowser(options: RenderToBrowserOptions): BrowserInstance {
	const { write, columns = 80, rows = 24, command, subcommand, config } = options;

	const bridge = createXtermInkBridge(write, columns, rows);
	const browserConfig = config ?? createBrowserConfig();

	let currentCommand = command;
	let currentSubcommand = subcommand;

	const renderApp = () => {
		return render(
			<ConfigProvider config={browserConfig}>
				<App command={currentCommand} subcommand={currentSubcommand} />
			</ConfigProvider>,
			{
				stdout: bridge.stdout as unknown as NodeJS.WriteStream,
				stdin: bridge.stdin as unknown as NodeJS.ReadStream,
				stderr: bridge.stderr as unknown as NodeJS.WriteStream,
				exitOnCtrlC: false, // We handle this in xterm.js
			},
		);
	};

	let instance = renderApp();

	return {
		unmount: () => instance.unmount(),
		waitUntilExit: () => instance.waitUntilExit(),
		clear: () => instance.clear(),
		rerender: (cmd?: string, subcmd?: string) => {
			currentCommand = cmd;
			currentSubcommand = subcmd;
			instance.rerender(
				<ConfigProvider config={browserConfig}>
					<App command={currentCommand} subcommand={currentSubcommand} />
				</ConfigProvider>,
			);
		},
		pushKey: bridge.pushKey,
		setDimensions: bridge.setDimensions,
		bridge,
	};
}

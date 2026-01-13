import { useCallback, useContext, useMemo } from 'react';
import { ConfigContext } from '../context/ConfigContext.js';

// Lazy-load Node.js config only when needed (allows browser tree-shaking)
let nodeConfigModule: typeof import('../lib/config.js') | null = null;

async function getNodeConfigModule() {
	if (!nodeConfigModule) {
		nodeConfigModule = await import('../lib/config.js');
	}
	return nodeConfigModule;
}

// Synchronous cache for after first load
let cachedNodeConfig: ReturnType<
	typeof import('../lib/config.js').createConfig
> | null = null;

function getOrCreateNodeConfig() {
	if (cachedNodeConfig) return cachedNodeConfig;

	// In browser, this path should never be hit because ConfigContext is always provided
	// In Node.js, we can use require synchronously
	// Use globalThis check to avoid TypeScript DOM lib requirement
	if (typeof globalThis !== 'undefined' && !('window' in globalThis)) {
		// Node.js environment - use require for synchronous loading
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const { createConfig } = require('../lib/config.js');
		cachedNodeConfig = createConfig();
		return cachedNodeConfig;
	}

	// Browser without ConfigContext - throw helpful error
	throw new Error(
		'useConfig in browser mode requires ConfigProvider. Wrap your app in <ConfigProvider config={...}>',
	);
}

export function useConfig() {
	// Try to get config from context (browser mode)
	const contextConfig = useContext(ConfigContext);

	// Fall back to conf-based config (Node.js mode)
	const nodeConfig = useMemo(() => {
		if (contextConfig) return null;
		return getOrCreateNodeConfig();
	}, [contextConfig]);

	const getApiKey = useCallback((): string | undefined => {
		if (contextConfig) return contextConfig.getApiKey();
		return nodeConfig?.get('apiKey');
	}, [contextConfig, nodeConfig]);

	const saveApiKey = useCallback(
		(key: string): void => {
			if (contextConfig) {
				contextConfig.saveApiKey(key);
			} else {
				nodeConfig?.set('apiKey', key);
			}
		},
		[contextConfig, nodeConfig],
	);

	const clearApiKey = useCallback((): void => {
		if (contextConfig) {
			contextConfig.clearApiKey();
		} else {
			nodeConfig?.delete('apiKey');
		}
	}, [contextConfig, nodeConfig]);

	const getApiBaseUrl = useCallback((): string => {
		if (contextConfig) return contextConfig.getApiBaseUrl();
		return (
			nodeConfig?.get('apiBaseUrl') ??
			'https://tuish-api-production.doug-lance.workers.dev'
		);
	}, [contextConfig, nodeConfig]);

	return {
		getApiKey,
		saveApiKey,
		clearApiKey,
		getApiBaseUrl,
	};
}

/**
 * Browser-safe version of useConfig that only uses ConfigContext
 * No Node.js imports - safe for browser bundling
 */
import { useCallback, useContext } from 'react';
import { ConfigContext } from '../context/ConfigContext.js';

const DEFAULT_API_URL = 'https://tuish-api-production.doug-lance.workers.dev';

export function useConfig() {
	const contextConfig = useContext(ConfigContext);

	if (!contextConfig) {
		throw new Error(
			'useConfig in browser mode requires ConfigProvider. Wrap your app with <ConfigProvider config={...}>',
		);
	}

	const getApiKey = useCallback((): string | undefined => {
		return contextConfig.getApiKey();
	}, [contextConfig]);

	const saveApiKey = useCallback(
		(key: string): void => {
			contextConfig.saveApiKey(key);
		},
		[contextConfig],
	);

	const clearApiKey = useCallback((): void => {
		contextConfig.clearApiKey();
	}, [contextConfig]);

	const getApiBaseUrl = useCallback((): string => {
		return contextConfig.getApiBaseUrl() ?? DEFAULT_API_URL;
	}, [contextConfig]);

	return {
		getApiKey,
		saveApiKey,
		clearApiKey,
		getApiBaseUrl,
	};
}

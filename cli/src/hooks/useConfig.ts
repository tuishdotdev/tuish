import { useCallback, useMemo } from 'react';
import { createConfig } from '../lib/config.js';

export function useConfig() {
	const config = useMemo(() => createConfig(), []);

	const getApiKey = useCallback((): string | undefined => {
		return config.get('apiKey');
	}, [config]);

	const saveApiKey = useCallback(
		(key: string): void => {
			config.set('apiKey', key);
		},
		[config],
	);

	const clearApiKey = useCallback((): void => {
		config.delete('apiKey');
	}, [config]);

	const getApiBaseUrl = useCallback((): string => {
		return config.get('apiBaseUrl');
	}, [config]);

	return {
		getApiKey,
		saveApiKey,
		clearApiKey,
		getApiBaseUrl,
	};
}

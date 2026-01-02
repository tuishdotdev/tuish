import { useCallback, useEffect, useState } from 'react';
import { useConfig } from './useConfig.js';

type AuthState = {
	isAuthenticated: boolean;
	apiKey: string | null;
	isLoading: boolean;
};

export function useAuth() {
	const { getApiKey, saveApiKey, clearApiKey } = useConfig();
	const [state, setState] = useState<AuthState>({
		isAuthenticated: false,
		apiKey: null,
		isLoading: true,
	});

	useEffect(() => {
		const key = getApiKey();
		setState({
			isAuthenticated: !!key,
			apiKey: key ?? null,
			isLoading: false,
		});
	}, [getApiKey]);

	const login = useCallback(
		(key: string): void => {
			saveApiKey(key);
			setState({
				isAuthenticated: true,
				apiKey: key,
				isLoading: false,
			});
		},
		[saveApiKey],
	);

	const logout = useCallback((): void => {
		clearApiKey();
		setState({
			isAuthenticated: false,
			apiKey: null,
			isLoading: false,
		});
	}, [clearApiKey]);

	return {
		...state,
		login,
		logout,
	};
}

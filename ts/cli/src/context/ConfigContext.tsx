import { createContext, useContext, type ReactNode } from 'react';

export interface ConfigAdapter {
	getApiKey: () => string | undefined;
	saveApiKey: (key: string) => void;
	clearApiKey: () => void;
	getApiBaseUrl: () => string;
}

// Export the context so useConfig can use useContext directly
export const ConfigContext = createContext<ConfigAdapter | null>(null);

export function ConfigProvider({
	config,
	children,
}: {
	config: ConfigAdapter;
	children: ReactNode;
}) {
	return (
		<ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>
	);
}

export function useConfigContext(): ConfigAdapter {
	const ctx = useContext(ConfigContext);
	if (!ctx) {
		throw new Error('useConfigContext must be used within a ConfigProvider');
	}
	return ctx;
}

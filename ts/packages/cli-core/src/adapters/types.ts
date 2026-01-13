/**
 * Storage adapter for persisting key-value data.
 * Node.js: uses filesystem (conf package)
 * Browser: uses localStorage
 */
export interface StorageAdapter {
	get(key: string): string | undefined;
	set(key: string, value: string): void;
	delete(key: string): void;
	clear(): void;
}

/**
 * Config adapter for managing API configuration.
 * Provides a typed interface for common config values.
 */
export interface ConfigAdapter {
	getApiKey(): string | undefined;
	setApiKey(key: string): void;
	clearApiKey(): void;
	getApiBaseUrl(): string;
	setApiBaseUrl(url: string): void;
}

/**
 * Fingerprint adapter for machine identification.
 * Node.js: uses OS-level identifiers (hostname, username, etc.)
 * Browser: uses session-based demo fingerprint
 */
export interface FingerprintAdapter {
	getMachineFingerprint(): string;
}

/**
 * Output adapter for terminal/console output.
 * Node.js: writes to stdout
 * Browser: writes to xterm.js terminal
 */
export interface OutputAdapter {
	write(text: string): void;
	writeLine(text: string): void;
	clear(): void;
}

/**
 * Platform context passed to all commands.
 * Contains all platform-specific adapters.
 */
export interface PlatformContext {
	storage: StorageAdapter;
	config: ConfigAdapter;
	fingerprint: FingerprintAdapter;
	output: OutputAdapter;
	/** Whether running in interactive TTY mode */
	isInteractive: boolean;
	/** Whether running in browser environment */
	isBrowser: boolean;
	/** Optional license key resolver for automatic discovery */
	licenseKeyResolver?: LicenseKeyResolver;
}

/**
 * Source of a resolved license key.
 * Used for debugging and cache invalidation.
 */
export type LicenseKeySource =
	| 'environment' // TUISH_LICENSE_KEY or TUISH_LICENSE_KEY_{PRODUCT_ID}
	| 'local_file' // .tuish or .tuishrc in directory tree
	| 'global_storage' // ~/.tuish/licenses/
	| 'localStorage'; // Browser localStorage

/**
 * Result of resolving a license key.
 * Includes source tracking for debugging and cache management.
 */
export interface ResolvedLicenseKey {
	/** The license key string */
	licenseKey: string;

	/** Where the key was found */
	source: LicenseKeySource;

	/** Path to the file (for local_file) or env var name (for environment) */
	sourcePath?: string;
}

/**
 * Resolver for discovering license keys from multiple sources.
 * Node.js: checks env vars, local files (.tuish, .tuishrc), then global storage
 * Browser: checks localStorage only
 */
export interface LicenseKeyResolver {
	/**
	 * Resolve a license key for a product.
	 * Returns undefined if no key found in any source.
	 *
	 * @param productId - The product ID to resolve a license for
	 * @param startDir - Starting directory for file search (Node.js only, defaults to cwd)
	 */
	resolve(productId: string, startDir?: string): ResolvedLicenseKey | undefined;
}

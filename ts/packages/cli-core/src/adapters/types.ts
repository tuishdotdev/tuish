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
}

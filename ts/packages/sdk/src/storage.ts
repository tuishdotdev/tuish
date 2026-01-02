import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, readdirSync } from 'node:fs';
import { hostname, userInfo, platform, arch, homedir } from 'node:os';
import { join } from 'node:path';
import type { CachedLicenseData } from './types';

const DEFAULT_STORAGE_DIR = join(homedir(), '.tuish', 'licenses');
const CACHE_REFRESH_HOURS = 24; // Refresh online validation every 24 hours

/**
 * File-based license storage for caching licenses locally
 */
export class LicenseStorage {
	private readonly storageDir: string;
	private readonly debug: boolean;

	constructor(options: { storageDir?: string; debug?: boolean } = {}) {
		this.storageDir = options.storageDir ?? DEFAULT_STORAGE_DIR;
		this.debug = options.debug ?? false;
		this.ensureStorageDir();
	}

	/**
	 * Ensure storage directory exists
	 */
	private ensureStorageDir(): void {
		if (!existsSync(this.storageDir)) {
			mkdirSync(this.storageDir, { recursive: true });
			if (this.debug) {
				console.log(`[tuish] Created storage directory: ${this.storageDir}`);
			}
		}
	}

	/**
	 * Get the file path for a product's license cache
	 */
	private getLicenseFilePath(productId: string): string {
		// Hash the product ID to create a safe filename
		const hash = createHash('sha256').update(productId).digest('hex').slice(0, 16);
		return join(this.storageDir, `${hash}.json`);
	}

	/**
	 * Save a license to disk
	 */
	saveLicense(
		productId: string,
		licenseKey: string,
		machineFingerprint: string
	): void {
		const filePath = this.getLicenseFilePath(productId);
		const now = Date.now();

		const data: CachedLicenseData = {
			licenseKey,
			cachedAt: now,
			refreshAt: now + CACHE_REFRESH_HOURS * 60 * 60 * 1000,
			productId,
			machineFingerprint,
		};

		try {
			this.ensureStorageDir();
			writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
			if (this.debug) {
				console.log(`[tuish] Saved license to: ${filePath}`);
			}
		} catch (error) {
			if (this.debug) {
				console.error(`[tuish] Failed to save license:`, error);
			}
			// Don't throw - caching failure shouldn't break the app
		}
	}

	/**
	 * Load a cached license from disk
	 */
	loadLicense(productId: string): CachedLicenseData | null {
		const filePath = this.getLicenseFilePath(productId);

		if (!existsSync(filePath)) {
			return null;
		}

		try {
			const content = readFileSync(filePath, 'utf-8');
			const data = JSON.parse(content) as CachedLicenseData;

			if (this.debug) {
				console.log(`[tuish] Loaded cached license from: ${filePath}`);
			}

			return data;
		} catch (error) {
			if (this.debug) {
				console.error(`[tuish] Failed to load cached license:`, error);
			}
			return null;
		}
	}

	/**
	 * Check if the cached license needs online refresh
	 */
	needsRefresh(cached: CachedLicenseData): boolean {
		return Date.now() >= cached.refreshAt;
	}

	/**
	 * Remove a cached license
	 */
	removeLicense(productId: string): void {
		const filePath = this.getLicenseFilePath(productId);

		if (existsSync(filePath)) {
			try {
				unlinkSync(filePath);
				if (this.debug) {
					console.log(`[tuish] Removed cached license: ${filePath}`);
				}
			} catch (error) {
				if (this.debug) {
					console.error(`[tuish] Failed to remove cached license:`, error);
				}
			}
		}
	}

	/**
	 * Clear all cached licenses
	 */
	clearAll(): void {
		if (!existsSync(this.storageDir)) {
			return;
		}

		try {
			const files = readdirSync(this.storageDir);
			for (const file of files) {
				if (file.endsWith('.json')) {
					unlinkSync(join(this.storageDir, file));
				}
			}
			if (this.debug) {
				console.log(`[tuish] Cleared all cached licenses`);
			}
		} catch (error) {
			if (this.debug) {
				console.error(`[tuish] Failed to clear cached licenses:`, error);
			}
		}
	}

	/**
	 * Get the storage directory path
	 */
	getStorageDir(): string {
		return this.storageDir;
	}
}

/**
 * Get a stable machine fingerprint for license binding
 * Uses a combination of hostname, username, and platform
 */
export function getMachineFingerprintSync(): string {
	const components = [
		hostname(),
		userInfo().username,
		platform(),
		arch(),
	];

	const fingerprint = createHash('sha256')
		.update(components.join(':'))
		.digest('hex');

	return fingerprint;
}

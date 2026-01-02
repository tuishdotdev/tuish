import { verifyLicense, extractLicensePayload, isLicenseExpired } from '@tuish/crypto';
import { TuishClient } from './client';
import { LicenseStorage, getMachineFingerprintSync } from './storage';
import type { LicenseCheckResult, LicenseDetails, CachedLicenseData } from './types';

/**
 * SPKI header for Ed25519 public keys (12 bytes)
 * Format: 30 2a 30 05 06 03 2b 65 70 03 21 00 [32 bytes key]
 */
const ED25519_SPKI_HEADER = 'MCowBQYDK2VwAyEA';

/**
 * Parse a public key from SPKI base64 or hex format
 * Returns the raw 32-byte key as hex
 */
function parsePublicKey(publicKey: string): string {
	// Check if it's SPKI base64 format
	if (publicKey.startsWith(ED25519_SPKI_HEADER) || publicKey.startsWith('MCoq')) {
		// Decode base64
		const decoded = Buffer.from(publicKey, 'base64');

		// SPKI format: 12 byte header + 32 byte key
		if (decoded.length !== 44) {
			throw new Error(
				`Invalid SPKI public key length: expected 44 bytes, got ${decoded.length}`
			);
		}

		// Extract the raw key (last 32 bytes)
		const rawKey = decoded.subarray(12);
		return rawKey.toString('hex');
	}

	// Check if it's already hex format (64 characters = 32 bytes)
	if (/^[0-9a-fA-F]{64}$/.test(publicKey)) {
		return publicKey.toLowerCase();
	}

	throw new Error(
		'Invalid public key format. Expected SPKI base64 (MCow...) or 64-character hex string'
	);
}

/**
 * License manager handles verification and caching
 */
export class LicenseManager {
	private readonly productId: string;
	private readonly publicKeyHex: string;
	private readonly storage: LicenseStorage;
	private readonly client: TuishClient;
	private readonly debug: boolean;
	private machineFingerprint?: string;

	constructor(options: {
		productId: string;
		publicKey: string;
		storage: LicenseStorage;
		client: TuishClient;
		debug?: boolean;
	}) {
		this.productId = options.productId;
		this.publicKeyHex = parsePublicKey(options.publicKey);
		this.storage = options.storage;
		this.client = options.client;
		this.debug = options.debug ?? false;

		if (this.debug) {
			console.log(`[tuish] Parsed public key: ${this.publicKeyHex.slice(0, 16)}...`);
		}
	}

	/**
	 * Get the machine fingerprint (cached after first call)
	 */
	getMachineFingerprint(): string {
		if (!this.machineFingerprint) {
			this.machineFingerprint = getMachineFingerprintSync();
		}
		return this.machineFingerprint;
	}

	/**
	 * Check if the user has a valid license
	 * Tries offline verification first, then online validation
	 */
	async checkLicense(): Promise<LicenseCheckResult> {
		const machineFingerprint = this.getMachineFingerprint();

		// Try to load cached license
		const cached = this.storage.loadLicense(this.productId);

		if (cached) {
			if (this.debug) {
				console.log(`[tuish] Found cached license, verifying offline...`);
			}

			// Verify offline first
			const offlineResult = await this.verifyOffline(cached.licenseKey, machineFingerprint);

			if (offlineResult.valid) {
				// If cache is fresh, return offline result
				if (!this.storage.needsRefresh(cached)) {
					return offlineResult;
				}

				// Try online refresh in background, but return offline result
				if (this.debug) {
					console.log(`[tuish] Cache needs refresh, will validate online...`);
				}

				const onlineResult = await this.validateOnline(
					cached.licenseKey,
					machineFingerprint
				);

				if (onlineResult.valid) {
					// Update cache with fresh timestamp
					this.storage.saveLicense(this.productId, cached.licenseKey, machineFingerprint);
					return onlineResult;
				}

				// If online says invalid but offline is valid, trust offline for now
				// (could be network issue, revocation, etc.)
				if (onlineResult.reason === 'network_error') {
					return offlineResult;
				}

				// License was revoked or otherwise invalidated server-side
				this.storage.removeLicense(this.productId);
				return onlineResult;
			}

			// Offline verification failed
			if (offlineResult.reason === 'expired') {
				// Check online in case there's a renewed license
				const onlineResult = await this.validateOnline(
					cached.licenseKey,
					machineFingerprint
				);
				if (!onlineResult.valid) {
					this.storage.removeLicense(this.productId);
				}
				return onlineResult;
			}

			// Other offline failures (signature, format, machine mismatch)
			this.storage.removeLicense(this.productId);
			return offlineResult;
		}

		// No cached license
		if (this.debug) {
			console.log(`[tuish] No cached license found`);
		}

		return {
			valid: false,
			reason: 'not_found',
			offlineVerified: false,
		};
	}

	/**
	 * Verify a license offline using the public key
	 */
	async verifyOffline(
		licenseKey: string,
		machineFingerprint: string
	): Promise<LicenseCheckResult> {
		try {
			const result = await verifyLicense(licenseKey, this.publicKeyHex, machineFingerprint);

			if (result.valid && result.payload) {
				return {
					valid: true,
					license: {
						id: result.payload.lid,
						productId: result.payload.pid,
						features: result.payload.features,
						status: 'active',
						issuedAt: result.payload.iat,
						expiresAt: result.payload.exp,
					},
					offlineVerified: true,
				};
			}

			return {
				valid: false,
				reason: result.reason,
				license: result.payload
					? {
							id: result.payload.lid,
							productId: result.payload.pid,
							features: result.payload.features,
							status: result.reason === 'expired' ? 'expired' : 'revoked',
							issuedAt: result.payload.iat,
							expiresAt: result.payload.exp,
						}
					: undefined,
				offlineVerified: true,
			};
		} catch (error) {
			if (this.debug) {
				console.error(`[tuish] Offline verification error:`, error);
			}
			return {
				valid: false,
				reason: 'invalid_format',
				offlineVerified: true,
			};
		}
	}

	/**
	 * Validate a license online with the API
	 */
	async validateOnline(
		licenseKey: string,
		machineFingerprint: string
	): Promise<LicenseCheckResult> {
		try {
			const result = await this.client.validateLicense({
				licenseKey,
				machineFingerprint,
			});

			if (result.valid && result.license) {
				return {
					valid: true,
					license: result.license,
					offlineVerified: false,
				};
			}

			return {
				valid: false,
				reason: result.reason as LicenseCheckResult['reason'],
				license: result.license,
				offlineVerified: false,
			};
		} catch (error) {
			if (this.debug) {
				console.error(`[tuish] Online validation error:`, error);
			}
			return {
				valid: false,
				reason: 'network_error',
				offlineVerified: false,
			};
		}
	}

	/**
	 * Store a license key after successful purchase
	 */
	saveLicense(licenseKey: string): void {
		const machineFingerprint = this.getMachineFingerprint();
		this.storage.saveLicense(this.productId, licenseKey, machineFingerprint);
	}

	/**
	 * Get the cached license key without verification
	 */
	getCachedLicenseKey(): string | null {
		const cached = this.storage.loadLicense(this.productId);
		return cached?.licenseKey ?? null;
	}

	/**
	 * Clear the cached license
	 */
	clearLicense(): void {
		this.storage.removeLicense(this.productId);
	}

	/**
	 * Extract license info without verification (for display only)
	 */
	extractLicenseInfo(licenseKey: string): LicenseDetails | null {
		const payload = extractLicensePayload(licenseKey);
		if (!payload) {
			return null;
		}

		const expired = isLicenseExpired(licenseKey);

		return {
			id: payload.lid,
			productId: payload.pid,
			features: payload.features,
			status: expired ? 'expired' : 'active',
			issuedAt: payload.iat,
			expiresAt: payload.exp,
		};
	}
}

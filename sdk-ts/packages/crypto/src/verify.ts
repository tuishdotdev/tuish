import * as ed from '@noble/ed25519';
import type { LicensePayload, SignedLicense } from '@tuish/types';
import { fromBase64Url, hexToBytes } from './utils';
import { parseLicense } from './sign';

export interface VerifyResult {
	valid: boolean;
	payload?: LicensePayload;
	reason?: 'invalid_format' | 'invalid_signature' | 'expired' | 'machine_mismatch';
}

/** Verify a license signature */
export async function verifyLicense(
	licenseString: string,
	publicKeyHex: string,
	machineId?: string
): Promise<VerifyResult> {
	// Parse the license
	const parsed = parseLicense(licenseString);
	if (!parsed) {
		return { valid: false, reason: 'invalid_format' };
	}

	// Verify signature
	const parts = licenseString.split('.');
	const message = `${parts[0]}.${parts[1]}`;
	const messageBytes = new TextEncoder().encode(message);
	const signatureBytes = fromBase64Url(parsed.signature);
	const publicKeyBytes = hexToBytes(publicKeyHex);

	try {
		const isValid = await ed.verifyAsync(signatureBytes, messageBytes, publicKeyBytes);
		if (!isValid) {
			return { valid: false, reason: 'invalid_signature' };
		}
	} catch {
		return { valid: false, reason: 'invalid_signature' };
	}

	// Check expiration
	if (parsed.payload.exp !== null && parsed.payload.exp < Date.now()) {
		return { valid: false, payload: parsed.payload, reason: 'expired' };
	}

	// Check machine ID if license is locked to a specific machine
	// If license.mid is null, license is valid on any machine
	if (machineId && parsed.payload.mid !== null && parsed.payload.mid !== machineId) {
		return { valid: false, payload: parsed.payload, reason: 'machine_mismatch' };
	}

	return { valid: true, payload: parsed.payload };
}

/** Quick check if a license format is valid (without signature verification) */
export function isValidLicenseFormat(licenseString: string): boolean {
	return parseLicense(licenseString) !== null;
}

/** Extract payload from license without verification (for display purposes only) */
export function extractLicensePayload(licenseString: string): LicensePayload | null {
	const parsed = parseLicense(licenseString);
	return parsed?.payload ?? null;
}

/** Check if a license is expired based on payload (without signature verification) */
export function isLicenseExpired(licenseString: string): boolean {
	const payload = extractLicensePayload(licenseString);
	if (!payload) {
		return true;
	}
	if (payload.exp === null) {
		return false; // Perpetual license
	}
	return payload.exp < Date.now();
}

/** Get time until license expires in milliseconds (null if perpetual, negative if expired) */
export function getLicenseTimeRemaining(licenseString: string): number | null {
	const payload = extractLicensePayload(licenseString);
	if (!payload) {
		return null;
	}
	if (payload.exp === null) {
		return null; // Perpetual
	}
	return payload.exp - Date.now();
}

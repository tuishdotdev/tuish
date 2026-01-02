import * as ed from '@noble/ed25519';
import type { LicenseHeader, LicensePayload, SignedLicense } from '@tuish/types';
import { hexToBytes, toBase64Url, jsonToBytes, bytesToHex } from './utils';

/**
 * Parse a private key from PKCS8 base64 or hex format
 * Returns the raw 32-byte key as Uint8Array
 */
function parsePrivateKey(privateKey: string): Uint8Array {
	// Check if it's PKCS8 base64 format (starts with MC4C for Ed25519)
	if (privateKey.startsWith('MC4C') || privateKey.startsWith('MC8C')) {
		// Decode base64
		const decoded = Uint8Array.from(atob(privateKey), (c) => c.charCodeAt(0));

		// PKCS8 Ed25519 format: 16 byte header + 32 byte key
		if (decoded.length !== 48) {
			throw new Error(
				`Invalid PKCS8 private key length: expected 48 bytes, got ${decoded.length}`
			);
		}

		// Extract the raw key (last 32 bytes)
		return decoded.subarray(16);
	}

	// Check if it's already hex format (64 characters = 32 bytes)
	if (/^[0-9a-fA-F]{64}$/.test(privateKey)) {
		return hexToBytes(privateKey);
	}

	throw new Error(
		'Invalid private key format. Expected PKCS8 base64 (MC4C...) or 64-character hex string'
	);
}

/** Create a signed license string */
export async function signLicense(
	payload: LicensePayload,
	privateKey: string
): Promise<string> {
	const header: LicenseHeader = {
		alg: 'ed25519',
		ver: 1,
	};

	const headerB64 = toBase64Url(jsonToBytes(header));
	const payloadB64 = toBase64Url(jsonToBytes(payload));

	const message = `${headerB64}.${payloadB64}`;
	const messageBytes = new TextEncoder().encode(message);
	const privateKeyBytes = parsePrivateKey(privateKey);

	const signatureBytes = await ed.signAsync(messageBytes, privateKeyBytes);
	const signatureB64 = toBase64Url(signatureBytes);

	return `${headerB64}.${payloadB64}.${signatureB64}`;
}

/** Create a license payload for signing */
export function createLicensePayload(params: {
	licenseId: string;
	productId: string;
	customerId: string;
	developerId: string;
	features: string[];
	machineId: string;
	expiresAt?: number | null;
}): LicensePayload {
	return {
		lid: params.licenseId,
		pid: params.productId,
		cid: params.customerId,
		did: params.developerId,
		features: params.features,
		iat: Date.now(),
		exp: params.expiresAt ?? null,
		mid: params.machineId,
	};
}

/** Parse a signed license string into its components */
export function parseLicense(licenseString: string): SignedLicense | null {
	try {
		const parts = licenseString.split('.');
		if (parts.length !== 3) {
			return null;
		}

		const headerB64 = parts[0];
		const payloadB64 = parts[1];
		const signatureB64 = parts[2];

		if (!headerB64 || !payloadB64 || !signatureB64) {
			return null;
		}

		const headerJson = atob(headerB64.replace(/-/g, '+').replace(/_/g, '/'));
		const payloadJson = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));

		const header = JSON.parse(headerJson) as LicenseHeader;
		const payload = JSON.parse(payloadJson) as LicensePayload;

		return {
			header,
			payload,
			signature: signatureB64,
		};
	} catch {
		return null;
	}
}

/** Get the signature bytes from a license for storage */
export function getLicenseSignatureHex(licenseString: string): string | null {
	try {
		const parts = licenseString.split('.');
		if (parts.length !== 3) {
			return null;
		}
		const signatureB64 = parts[2];
		if (!signatureB64) {
			return null;
		}
		const padded = signatureB64 + '='.repeat((4 - (signatureB64.length % 4)) % 4);
		const binary = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) {
			bytes[i] = binary.charCodeAt(i);
		}
		return bytesToHex(bytes);
	} catch {
		return null;
	}
}

import * as ed from '@noble/ed25519';
import { bytesToHex, hexToBytes } from './utils';

// Use webcrypto for ed25519 in edge environments
// In Cloudflare Workers, crypto is available globally
if (typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined') {
	ed.etc.sha512Async = async (...messages: Uint8Array[]): Promise<Uint8Array> => {
		const combined = new Uint8Array(messages.reduce((acc, m) => acc + m.length, 0));
		let offset = 0;
		for (const m of messages) {
			combined.set(m, offset);
			offset += m.length;
		}
		const hash = await crypto.subtle.digest('SHA-512', combined);
		return new Uint8Array(hash);
	};
}

export interface KeyPair {
	privateKey: string; // hex encoded
	publicKey: string; // hex encoded
}

/** Generate a new Ed25519 keypair */
export async function generateKeyPair(): Promise<KeyPair> {
	const privateKeyBytes = ed.utils.randomPrivateKey();
	const publicKeyBytes = await ed.getPublicKeyAsync(privateKeyBytes);

	return {
		privateKey: bytesToHex(privateKeyBytes),
		publicKey: bytesToHex(publicKeyBytes),
	};
}

/** Get public key from private key */
export async function getPublicKey(privateKeyHex: string): Promise<string> {
	const privateKeyBytes = hexToBytes(privateKeyHex);
	const publicKeyBytes = await ed.getPublicKeyAsync(privateKeyBytes);
	return bytesToHex(publicKeyBytes);
}

/** Validate that a hex string is a valid public key format */
export function isValidPublicKey(publicKeyHex: string): boolean {
	try {
		const bytes = hexToBytes(publicKeyHex);
		return bytes.length === 32;
	} catch {
		return false;
	}
}

/** Validate that a hex string is a valid private key format */
export function isValidPrivateKey(privateKeyHex: string): boolean {
	try {
		const bytes = hexToBytes(privateKeyHex);
		return bytes.length === 32;
	} catch {
		return false;
	}
}

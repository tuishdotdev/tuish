import { bytesToHex } from './utils';

/**
 * Generate a developer API key
 * Format: tuish_sk_{64-hex-chars} (32 bytes = 256 bits of entropy)
 *
 * "tuish" = platform identifier
 * "sk" = secret key
 */
export function generateApiKey(): string {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	return `tuish_sk_${bytesToHex(bytes)}`;
}

/**
 * Hash an API key for storage using SHA-256
 * Returns hex string representation of the hash
 */
export async function hashApiKey(key: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(key);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

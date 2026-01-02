/** Convert a Uint8Array to base64url string */
export function toBase64Url(bytes: Uint8Array): string {
	const base64 = btoa(String.fromCharCode(...bytes));
	return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Convert a base64url string to Uint8Array */
export function fromBase64Url(str: string): Uint8Array {
	// Add back padding if needed
	const padded = str + '='.repeat((4 - (str.length % 4)) % 4);
	const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

/** Convert an object to JSON and then to Uint8Array */
export function jsonToBytes(obj: unknown): Uint8Array {
	const json = JSON.stringify(obj);
	return new TextEncoder().encode(json);
}

/** Convert Uint8Array to JSON object */
export function bytesToJson<T>(bytes: Uint8Array): T {
	const json = new TextDecoder().decode(bytes);
	return JSON.parse(json) as T;
}

/** Convert hex string to Uint8Array */
export function hexToBytes(hex: string): Uint8Array {
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < bytes.length; i++) {
		bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
	}
	return bytes;
}

/** Convert Uint8Array to hex string */
export function bytesToHex(bytes: Uint8Array): string {
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

/** Generate a random ID */
export function generateId(prefix: string): string {
	const bytes = new Uint8Array(16);
	crypto.getRandomValues(bytes);
	return `${prefix}_${bytesToHex(bytes)}`;
}

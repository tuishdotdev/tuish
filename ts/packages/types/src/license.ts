// License types

export interface LicensePayload {
	/** License ID */
	lid: string;
	/** Product ID */
	pid: string;
	/** Customer ID */
	cid: string;
	/** Developer ID */
	did: string;
	/** Feature flags */
	features: string[];
	/** Issued at (Unix timestamp) */
	iat: number;
	/** Expires at (Unix timestamp, null = perpetual) */
	exp: number | null;
	/** Machine ID hash (for binding) */
	mid: string;
}

export interface LicenseHeader {
	/** Algorithm (always 'ed25519') */
	alg: 'ed25519';
	/** Version */
	ver: 1;
}

export interface SignedLicense {
	header: LicenseHeader;
	payload: LicensePayload;
	signature: string;
}

export type LicenseStatus = 'active' | 'expired' | 'revoked' | 'grace';

export interface CachedLicense {
	license: SignedLicense;
	raw: string;
	validatedAt: number;
	expiresAt: number;
}

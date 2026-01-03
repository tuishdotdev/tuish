import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { verifyLicense } from '@tuish/crypto';
import { LicenseStorage, getMachineFingerprintSync } from '../storage';

type LicenseVectors = {
	keys: {
		public_key_spki_base64: string;
		public_key_hex: string;
	};
	cases: Array<{
		name: string;
		license: string;
		machine_id: string;
		expected: {
			valid: boolean;
			reason?: string;
			payload?: {
				lid: string;
				pid: string;
				cid: string;
				did: string;
				features: string[];
				iat: number;
				exp: number | null;
				mid: string | null;
			};
		};
	}>;
};

type FingerprintVectors = {
	cases: Array<{
		name: string;
		components: {
			hostname: string;
			username: string;
			platform: string;
			arch: string;
		};
		expected: string;
	}>;
	platform_map: Array<{ input: string; expected: string }>;
	arch_map: Array<{ input: string; expected: string }>;
};

type CacheVectors = {
	product_id: string;
	expected_filename: string;
	cases: Array<{
		name: string;
		cached_at: number;
		refresh_at: number;
		expected_needs_refresh: boolean;
	}>;
};

type FlowVectors = {
	cases: Array<{
		name: string;
		input: FlowInput;
		expected: {
			final: { valid: boolean; reason: string | null; source: string };
			cache_actions: string[];
		};
	}>;
};

type FlowInput = {
	resolver?: {
		enabled: boolean;
		found?: boolean;
		offline?: { valid: boolean; reason: string | null };
		online?: { valid: boolean; reason: string | null };
	};
	cache?: {
		found: boolean;
		fresh?: boolean;
		offline?: { valid: boolean; reason: string | null };
		online?: { valid: boolean; reason: string | null };
	};
};

function findRepoRoot(startDir: string): string {
	let current = startDir;
	for (let i = 0; i < 10; i += 1) {
		const candidate = path.join(current, 'oss', 'spec', 'tests', 'vectors');
		if (fs.existsSync(candidate)) {
			return current;
		}
		const parent = path.dirname(current);
		if (parent === current) {
			break;
		}
		current = parent;
	}
	throw new Error('Unable to locate repo root for spec vectors');
}

function readJson<T>(filePath: string): T {
	return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
}

function sha256Hex(value: string): string {
	return createHash('sha256').update(value).digest('hex');
}

function mapPlatform(value: string): string {
	switch (value) {
		case 'macos':
			return 'darwin';
		case 'windows':
			return 'win32';
		default:
			return value.toLowerCase();
	}
}

function mapArch(value: string): string {
	switch (value) {
		case 'x86_64':
		case 'amd64':
			return 'x64';
		case 'aarch64':
			return 'arm64';
		case 'x86':
		case 'i386':
		case 'i686':
			return 'ia32';
		default:
			return value.toLowerCase();
	}
}

function evaluateFlow(input: FlowInput): { final: { valid: boolean; reason: string | null; source: string }; cache_actions: string[] } {
	const actions: string[] = [];
	const resolver = input.resolver;
	if (resolver?.enabled && resolver.found) {
		const offline = resolver.offline;
		if (offline?.valid) {
			actions.push('save');
			return { final: { valid: true, reason: null, source: 'offline' }, cache_actions: actions };
		}
		if (offline?.reason === 'expired' || offline?.reason === 'invalid_signature') {
			const online = resolver.online ?? { valid: false, reason: 'network_error' };
			if (online.valid) {
				actions.push('save');
			}
			return {
				final: {
					valid: online.valid,
					reason: online.valid ? null : online.reason,
					source: 'online',
				},
				cache_actions: actions,
			};
		}
	}

	const cache = input.cache;
	if (cache?.found) {
		const offline = cache.offline;
		if (offline?.valid) {
			if (cache.fresh) {
				return { final: { valid: true, reason: null, source: 'offline' }, cache_actions: actions };
			}
			const online = cache.online ?? { valid: false, reason: 'network_error' };
			if (online.valid) {
				actions.push('save');
				return { final: { valid: true, reason: null, source: 'online' }, cache_actions: actions };
			}
			if (online.reason === 'network_error') {
				return { final: { valid: true, reason: null, source: 'offline' }, cache_actions: actions };
			}
			actions.push('remove');
			return { final: { valid: false, reason: online.reason, source: 'online' }, cache_actions: actions };
		}
		if (offline?.reason === 'expired') {
			const online = cache.online ?? { valid: false, reason: 'network_error' };
			if (!online.valid) {
				actions.push('remove');
			}
			return { final: { valid: online.valid, reason: online.valid ? null : online.reason, source: 'online' }, cache_actions: actions };
		}
		if (offline) {
			actions.push('remove');
			return { final: { valid: false, reason: offline.reason, source: 'offline' }, cache_actions: actions };
		}
	}

	return { final: { valid: false, reason: 'not_found', source: 'not_found' }, cache_actions: actions };
}

const repoRoot = findRepoRoot(path.dirname(fileURLToPath(import.meta.url)));
const vectorsDir = path.join(repoRoot, 'oss', 'spec', 'tests', 'vectors');

describe('spec vectors', () => {
	it('verifies license vectors', async () => {
		const vectors = readJson<LicenseVectors>(path.join(vectorsDir, 'license.json'));
		for (const testCase of vectors.cases) {
			const result = await verifyLicense(
				testCase.license,
				vectors.keys.public_key_hex,
				testCase.machine_id,
			);
			expect(result.valid).toBe(testCase.expected.valid);
			if (testCase.expected.reason) {
				expect(result.reason).toBe(testCase.expected.reason);
			}
			if (testCase.expected.payload) {
				expect(result.payload).toEqual(testCase.expected.payload);
			}
		}
	});

	it('matches fingerprint vectors', () => {
		const vectors = readJson<FingerprintVectors>(path.join(vectorsDir, 'fingerprint.json'));
		for (const testCase of vectors.cases) {
			const components = [
				testCase.components.hostname,
				testCase.components.username,
				testCase.components.platform,
				testCase.components.arch,
			].join(':');
			expect(sha256Hex(components)).toBe(testCase.expected);
		}
		for (const entry of vectors.platform_map) {
			expect(mapPlatform(entry.input)).toBe(entry.expected);
		}
		for (const entry of vectors.arch_map) {
			expect(mapArch(entry.input)).toBe(entry.expected);
		}

		const runtimeComponents = [
			os.hostname(),
			os.userInfo().username,
			os.platform(),
			os.arch(),
		].join(':');
		expect(getMachineFingerprintSync()).toBe(sha256Hex(runtimeComponents));
	});

	it('matches cache vectors', () => {
		const vectors = readJson<CacheVectors>(path.join(vectorsDir, 'cache.json'));
		const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tuish-spec-'));
		const storage = new LicenseStorage({ storageDir: tempDir });
		storage.saveLicense(vectors.product_id, 'license-test', 'machine-test');

		const files = fs.readdirSync(tempDir);
		expect(files).toContain(vectors.expected_filename);

		for (const testCase of vectors.cases) {
			const cached = {
				licenseKey: 'license-test',
				cachedAt: testCase.cached_at,
				refreshAt: testCase.refresh_at,
				productId: vectors.product_id,
				machineFingerprint: 'machine-test',
			};
			expect(storage.needsRefresh(cached)).toBe(testCase.expected_needs_refresh);
		}

		fs.rmSync(tempDir, { recursive: true, force: true });
	});

	it('matches flow vectors', () => {
		const vectors = readJson<FlowVectors>(path.join(vectorsDir, 'license_check_flow.json'));
		for (const testCase of vectors.cases) {
			const actual = evaluateFlow(testCase.input);
			expect(actual).toEqual(testCase.expected);
		}
	});
});

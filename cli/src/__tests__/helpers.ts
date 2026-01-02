import { execa, type ExecaError } from 'execa';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_PATH = join(__dirname, '../../dist/index.js');

export interface CliResult {
	stdout: string;
	stderr: string;
	exitCode: number;
	json: unknown;
}

/**
 * Attempt to parse JSON from a string, handling various CLI output scenarios.
 * The CLI outputs success JSON to stdout and error JSON to stderr.
 */
function parseCliJson(stdout: string, stderr: string): unknown {
	// Try stdout first (success cases)
	if (stdout) {
		try {
			return JSON.parse(stdout);
		} catch {
			// Not valid JSON
		}
	}

	// Try stderr (error cases - CLI uses console.error for errors)
	if (stderr) {
		try {
			return JSON.parse(stderr);
		} catch {
			// Not valid JSON
		}
	}

	return null;
}

/**
 * Convert execa output to string (handles various output types).
 */
function toStringOutput(output: unknown): string {
	if (typeof output === 'string') return output;
	if (Array.isArray(output)) return output.join('');
	if (output instanceof Uint8Array) return new TextDecoder().decode(output);
	return '';
}

/**
 * Run the Tuish CLI with the given arguments.
 * Automatically adds --json flag to get JSON output.
 *
 * @param args - CLI arguments (e.g., ['whoami'] or ['products', 'list'])
 * @param env - Optional environment variables to set
 * @returns Promise<CliResult> with stdout, stderr, exitCode, and parsed json
 */
export async function runCli(
	args: string[],
	env?: Record<string, string>,
): Promise<CliResult> {
	try {
		const result = await execa('node', [CLI_PATH, ...args, '--json'], {
			env: { ...process.env, ...env },
			reject: false,
		});

		const stdout = toStringOutput(result.stdout);
		const stderr = toStringOutput(result.stderr);

		return {
			stdout,
			stderr,
			exitCode: result.exitCode ?? 0,
			json: parseCliJson(stdout, stderr),
		};
	} catch (error) {
		const execaError = error as ExecaError;
		const stdout = toStringOutput(execaError.stdout);
		const stderr = toStringOutput(execaError.stderr);
		return {
			stdout,
			stderr,
			exitCode: execaError.exitCode ?? 1,
			json: parseCliJson(stdout, stderr),
		};
	}
}

/**
 * Run the Tuish CLI without the --json flag.
 * Useful for testing interactive or non-JSON output modes.
 */
export async function runCliRaw(
	args: string[],
	env?: Record<string, string>,
): Promise<Omit<CliResult, 'json'>> {
	try {
		const result = await execa('node', [CLI_PATH, ...args], {
			env: { ...process.env, ...env },
			reject: false,
		});

		return {
			stdout: toStringOutput(result.stdout),
			stderr: toStringOutput(result.stderr),
			exitCode: result.exitCode ?? 0,
		};
	} catch (error) {
		const execaError = error as ExecaError;
		return {
			stdout: toStringOutput(execaError.stdout),
			stderr: toStringOutput(execaError.stderr),
			exitCode: execaError.exitCode ?? 1,
		};
	}
}

/**
 * Fluent assertion helper for CLI JSON results.
 * Provides chainable assertions for common CLI output checks.
 *
 * @example
 * ```ts
 * const result = await runCli(['whoami']);
 * expectJson(result)
 *   .toSucceed()
 *   .toHaveProperty('authenticated');
 * ```
 */
export function expectJson(result: CliResult) {
	return {
		toHaveProperty: (key: string) => {
			expect(result.json).toHaveProperty(key);
			return expectJson(result);
		},
		toMatchObject: (obj: object) => {
			expect(result.json).toMatchObject(obj);
			return expectJson(result);
		},
		toEqual: (value: unknown) => {
			expect(result.json).toEqual(value);
			return expectJson(result);
		},
		toSucceed: () => {
			expect(result.exitCode).toBe(0);
			return expectJson(result);
		},
		toFail: () => {
			expect(result.exitCode).not.toBe(0);
			return expectJson(result);
		},
		toFailWithCode: (code: number) => {
			expect(result.exitCode).toBe(code);
			return expectJson(result);
		},
		toHaveError: (errorSubstring?: string) => {
			expect(result.json).toHaveProperty('error');
			if (errorSubstring) {
				const json = result.json as { error: string };
				expect(json.error).toContain(errorSubstring);
			}
			return expectJson(result);
		},
		get json() {
			return result.json;
		},
		get exitCode() {
			return result.exitCode;
		},
	};
}

/**
 * Type guard to check if the result JSON has an error property.
 */
export function isErrorResponse(
	json: unknown,
): json is { error: string | { code: string; message: string } } {
	return (
		typeof json === 'object' &&
		json !== null &&
		'error' in json
	);
}

/**
 * Type guard to check if the result JSON has a data property (list response).
 */
export function isListResponse<T>(
	json: unknown,
): json is { data: T[]; meta?: { cursor?: string; hasMore?: boolean } } {
	return (
		typeof json === 'object' &&
		json !== null &&
		'data' in json &&
		Array.isArray((json as { data: unknown }).data)
	);
}

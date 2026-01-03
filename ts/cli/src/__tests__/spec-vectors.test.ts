import { execa } from 'execa';
import { readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

type CliVectorExpect = {
	exit_code: number;
	stdout?: unknown;
	stderr?: unknown;
};

type CliVectorCase = {
	name: string;
	args: string[];
	expect: CliVectorExpect;
};

type CliVectors = {
	version: number;
	cases: CliVectorCase[];
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_PATH = join(__dirname, '../../dist/index.js');
const VECTORS_PATH = join(__dirname, '../../../../spec/tests/vectors/cli.json');
const vectors = JSON.parse(readFileSync(VECTORS_PATH, 'utf-8')) as CliVectors;

async function runCase(args: string[]) {
	const tempHome = await mkdtemp(join(tmpdir(), 'tuish-cli-'));
	try {
		return await execa('node', [CLI_PATH, ...args, '--json'], {
			env: { ...process.env, HOME: tempHome },
			reject: false,
		});
	} finally {
		await rm(tempHome, { recursive: true, force: true });
	}
}

describe('CLI spec vectors', () => {
	for (const testCase of vectors.cases) {
		it(testCase.name, async () => {
			const result = await runCase(testCase.args);

			expect(result.exitCode).toBe(testCase.expect.exit_code);

			if (testCase.expect.stdout) {
				const parsed = JSON.parse(result.stdout.toString().trim());
				expect(parsed).toEqual(testCase.expect.stdout);
			}

			if (testCase.expect.stderr) {
				const parsed = JSON.parse(result.stderr.toString().trim());
				expect(parsed).toEqual(testCase.expect.stderr);
			}
		});
	}
});

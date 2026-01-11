import { defineConfig } from 'tsup';
import type { Plugin } from 'esbuild';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Stub file path
const fsStubPath = resolve(__dirname, 'src/stubs/fs.ts');

// All Node.js built-in module stub contents
const nodeStubContents: Record<string, string> = {
	fs: `
		export const readFileSync = () => '';
		export const writeFileSync = () => {};
		export const existsSync = () => false;
		export const mkdirSync = () => {};
		export const readdirSync = () => [];
		export const statSync = () => ({ isDirectory: () => false, isFile: () => false });
		export const unlinkSync = () => {};
		export default { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync };
	`,
	os: 'export default {}; export const homedir = () => "/home/user"; export const platform = () => "browser"; export const tmpdir = () => "/tmp";',
	path: 'export default {}; export const join = (...args) => args.join("/"); export const resolve = (...args) => args.join("/"); export const dirname = (p) => p.split("/").slice(0, -1).join("/"); export const basename = (p) => p.split("/").pop(); export const extname = (p) => { const m = p.match(/\\.[^.]+$/); return m ? m[0] : ""; }; export const sep = "/";',
	process: 'export default { env: {}, cwd: () => "/", platform: "browser", stdout: { write: () => {}, isTTY: true }, stderr: { write: () => {}, isTTY: true }, stdin: { isTTY: true } };',
	stream: 'export default {}; export class Readable { pipe() { return this; } on() { return this; } } export class Writable { write() {} end() {} on() { return this; } }',
	util: 'export default {}; export const promisify = (fn) => fn; export const inherits = () => {};',
	events: 'export class EventEmitter { on() { return this; } emit() { return false; } removeListener() { return this; } once() { return this; } addListener() { return this; } off() { return this; } setMaxListeners() { return this; } getMaxListeners() { return 10; } listeners() { return []; } rawListeners() { return []; } listenerCount() { return 0; } prependListener() { return this; } prependOnceListener() { return this; } eventNames() { return []; } }; export default EventEmitter;',
	buffer: 'export const Buffer = { from: (s) => new TextEncoder().encode(s), alloc: (n) => new Uint8Array(n), isBuffer: () => false }; export default { Buffer };',
	child_process: 'export default {}; export const spawn = () => ({ on: () => {}, stdout: { on: () => {} }, stderr: { on: () => {} } }); export const exec = () => {}; export const execSync = () => "";',
	assert: 'export default function assert(v) { if (!v) throw new Error("Assertion failed"); }; export const ok = (v) => { if (!v) throw new Error("Assertion failed"); }; export const strictEqual = (a, b) => { if (a !== b) throw new Error("Assertion failed"); };',
	module: 'export const builtinModules = []; export default { builtinModules: [] }; export const createRequire = () => () => ({});',
	tty: 'export const isatty = () => true; export default { isatty: () => true };',
	url: 'export const fileURLToPath = (u) => u.replace("file://", ""); export const pathToFileURL = (p) => "file://" + p; export default { fileURLToPath, pathToFileURL };',
};

// Plugin to swap useConfig imports to browser version for browser builds
const browserAliasPlugin: Plugin = {
	name: 'browser-alias',
	setup(build) {
		// Handle ALL bare Node.js module imports with a single resolver
		const nodeModules = Object.keys(nodeStubContents);
		const nodeModulesPattern = nodeModules.join('|');
		const bareModuleFilter = new RegExp(`^(node:)?(${nodeModulesPattern})(/promises)?$`);

		build.onResolve({ filter: bareModuleFilter }, (args) => {
			// Extract the base module name (without node: prefix or /promises suffix)
			const match = args.path.match(/^(node:)?(\w+)/);
			if (match) {
				const modName = match[2];
				if (nodeStubContents[modName]) {
					return { path: modName, namespace: 'node-builtin-stub' };
				}
			}
			return null;
		});

		// Load stub content for Node.js built-ins
		build.onLoad({ filter: /.*/, namespace: 'node-builtin-stub' }, (args) => {
			const contents = nodeStubContents[args.path];
			if (contents) {
				return { contents, loader: 'js' };
			}
			return null;
		});

		// Intercept useConfig imports
		build.onResolve({ filter: /useConfig/ }, (args) => {
			if (
				args.path.endsWith('useConfig.js') ||
				args.path.includes('/useConfig')
			) {
				const browserPath = resolve(
					__dirname,
					'src/hooks/useConfig.browser.ts',
				);
				return { path: browserPath };
			}
			return null;
		});

		// Intercept openUrl imports - swap to browser version (avoids 'open' package)
		build.onResolve({ filter: /openUrl/ }, (args) => {
			if (
				args.path.endsWith('openUrl.js') ||
				args.path.includes('/openUrl')
			) {
				const browserPath = resolve(
					__dirname,
					'src/utils/openUrl.browser.ts',
				);
				return { path: browserPath };
			}
			return null;
		});

		// Also stub 'conf' package
		build.onResolve({ filter: /^conf$/ }, () => {
			return { path: 'conf', namespace: 'conf-stub' };
		});

		build.onLoad({ filter: /.*/, namespace: 'conf-stub' }, () => {
			return {
				contents: 'export default class Conf { constructor() {} get() {} set() {} delete() {} }',
				loader: 'js',
			};
		});

		// Stub 'open' package
		build.onResolve({ filter: /^open$/ }, () => {
			return { path: 'open', namespace: 'open-stub' };
		});

		build.onLoad({ filter: /.*/, namespace: 'open-stub' }, () => {
			return {
				contents: 'export default async () => {}; export const openApp = async () => {}; export const apps = {};',
				loader: 'js',
			};
		});

		// Stub react-devtools-core (optional Ink dev dependency)
		build.onResolve({ filter: /^react-devtools-core$/ }, () => {
			return { path: 'react-devtools-core', namespace: 'devtools-stub' };
		});

		build.onLoad({ filter: /.*/, namespace: 'devtools-stub' }, () => {
			return {
				contents: 'export default { connectToDevTools: () => {} };',
				loader: 'js',
			};
		});

		// Stub stack-utils (used by Ink for error display)
		build.onResolve({ filter: /^stack-utils$/ }, () => {
			return { path: 'stack-utils', namespace: 'stack-utils-stub' };
		});

		build.onLoad({ filter: /.*/, namespace: 'stack-utils-stub' }, () => {
			return {
				contents: `
					export default class StackUtils {
						static nodeInternals() { return []; }
						constructor() {}
						clean(stack) { return stack; }
						parseLine() { return null; }
						captureString() { return ''; }
					}
				`,
				loader: 'js',
			};
		});

		// Stub signal-exit (used by Ink for cleanup)
		build.onResolve({ filter: /^signal-exit$/ }, () => {
			return { path: 'signal-exit', namespace: 'signal-exit-stub' };
		});

		build.onLoad({ filter: /.*/, namespace: 'signal-exit-stub' }, () => {
			return {
				contents: 'export function onExit(cb, opts) { return () => {}; } export default onExit;',
				loader: 'js',
			};
		});

		// Stub restore-cursor (used by cli-cursor)
		build.onResolve({ filter: /^restore-cursor$/ }, () => {
			return { path: 'restore-cursor', namespace: 'restore-cursor-stub' };
		});

		build.onLoad({ filter: /.*/, namespace: 'restore-cursor-stub' }, () => {
			return {
				contents: 'export default function restoreCursor() {}',
				loader: 'js',
			};
		});
	},
};

export default defineConfig([
	// Node.js CLI build
	{
		entry: ['src/index.tsx'],
		format: ['esm'],
		dts: true,
		clean: true,
		sourcemap: true,
		target: 'node20',
		splitting: false,
		banner: {
			js: '#!/usr/bin/env node',
		},
		esbuildOptions(options) {
			options.jsx = 'automatic';
		},
	},
	// Browser build - bundle everything with stubs
	{
		entry: { browser: 'src/browser.tsx' },
		format: ['esm'],
		dts: true,
		clean: false,
		sourcemap: true,
		target: 'es2022',
		platform: 'browser',
		splitting: false,
		// Externalize only the adapters - bundle React to ensure reconciler compatibility
		external: ['@tuish/adapters-browser'],
		noExternal: ['ink', '@inkjs/ui', 'chalk', 'ansi-escapes', 'cli-cursor', 'cli-truncate', 'react', 'react-dom', 'react-reconciler', 'scheduler'],
		esbuildPlugins: [browserAliasPlugin],
		esbuildOptions(options) {
			options.jsx = 'automatic';
			// Define browser environment - keep NODE_ENV but let process streams use stubs
			options.define = {
				'process.env.NODE_ENV': '"production"',
			};
		},
		// Post-process to replace Node.js imports with inline stubs
		async onSuccess() {
			const fs = await import('fs');
			const path = await import('path');
			const browserJsPath = path.resolve(__dirname, 'dist/browser.js');

			let content = fs.readFileSync(browserJsPath, 'utf-8');

			// Replace fs imports with inline stub
			const fsStub = `
var fs = {
	readFileSync: () => '',
	writeFileSync: () => {},
	existsSync: () => false,
	mkdirSync: () => {},
	readdirSync: () => [],
	statSync: () => ({ isDirectory: () => false, isFile: () => false }),
	unlinkSync: () => {},
	constants: { F_OK: 0, R_OK: 4, W_OK: 2, X_OK: 1 }
};
`;

			// Replace import statements with stub
			content = content.replace(
				/import \* as fs from "fs";/g,
				fsStub
			);
			content = content.replace(
				/import \* as fs from "node:fs";/g,
				fsStub
			);

			// Replace process imports with stub
			const processStub = `
var cwd = () => "/";
`;
			content = content.replace(
				/import \{ cwd \} from "process";/g,
				processStub
			);
			content = content.replace(
				/import \{ cwd \} from "node:process";/g,
				processStub
			);

			// Replace all process imports with inline stub
			const processStubInline = `
var __stdin_stub = {
  isTTY: true,
  setRawMode: function() { return this; },
  on: function() { return this; },
  off: function() { return this; },
  once: function() { return this; },
  addListener: function() { return this; },
  removeListener: function() { return this; },
  pause: function() { return this; },
  resume: function() { return this; },
  read: function() { return null; },
  setEncoding: function() { return this; },
  unref: function() { return this; },
  ref: function() { return this; }
};
var __process_stub = {
  env: {},
  cwd: function() { return '/'; },
  platform: 'browser',
  stdout: { write: function() {}, isTTY: true },
  stderr: { write: function() {}, isTTY: true },
  stdin: __stdin_stub,
  on: function() { return this; },
  off: function() { return this; },
  once: function() { return this; },
  exit: function() {},
  nextTick: function(cb) { setTimeout(cb, 0); }
};
`;
			// Replace all import processX from "process" with stub usage
			content = content.replace(
				/import (\w+) from "process";/g,
				`var $1 = __process_stub;`
			);
			// Replace import { env } from "process" style imports
			content = content.replace(
				/import \{ (\w+) \} from "process";/g,
				`var $1 = __process_stub.$1;`
			);
			// Add the stub at the top
			content = processStubInline + content;

			// Polyfill console.Console for browser (Node.js feature used by Ink)
			const consolePolyfill = `
// Polyfill console.Console for browser (Node.js feature used by Ink)
if (typeof console !== 'undefined' && !console.Console) {
  console.Console = function ConsolePolyfill(stdout, stderr) {
    return {
      log: console.log.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      info: console.info.bind(console),
      debug: console.debug.bind(console),
      dir: console.dir.bind(console),
      trace: console.trace.bind(console),
      assert: console.assert.bind(console),
      clear: console.clear.bind(console),
      count: console.count ? console.count.bind(console) : function() {},
      countReset: console.countReset ? console.countReset.bind(console) : function() {},
      group: console.group ? console.group.bind(console) : function() {},
      groupCollapsed: console.groupCollapsed ? console.groupCollapsed.bind(console) : function() {},
      groupEnd: console.groupEnd ? console.groupEnd.bind(console) : function() {},
      table: console.table ? console.table.bind(console) : function() {},
      time: console.time ? console.time.bind(console) : function() {},
      timeEnd: console.timeEnd ? console.timeEnd.bind(console) : function() {},
      timeLog: console.timeLog ? console.timeLog.bind(console) : function() {},
    };
  };
}
`;
			content = consolePolyfill + content;

			fs.writeFileSync(browserJsPath, content);
			console.log('[browser-build] Post-processed browser.js - replaced Node.js imports');
		},
	},
]);

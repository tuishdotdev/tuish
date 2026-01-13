// tsup.config.ts
import { defineConfig } from "tsup";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
var __injected_import_meta_url__ = "file:///Users/douglance/Developer/lv/stui/oss/ts/cli/tsup.config.ts";
var __dirname = dirname(fileURLToPath(__injected_import_meta_url__));
var fsStubPath = resolve(__dirname, "src/stubs/fs.ts");
var nodeStubContents = {
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
  stream: "export default {}; export class Readable { pipe() { return this; } on() { return this; } } export class Writable { write() {} end() {} on() { return this; } }",
  util: "export default {}; export const promisify = (fn) => fn; export const inherits = () => {};",
  events: "export class EventEmitter { on() { return this; } emit() { return false; } removeListener() { return this; } once() { return this; } addListener() { return this; } off() { return this; } setMaxListeners() { return this; } getMaxListeners() { return 10; } listeners() { return []; } rawListeners() { return []; } listenerCount() { return 0; } prependListener() { return this; } prependOnceListener() { return this; } eventNames() { return []; } }; export default EventEmitter;",
  buffer: "export const Buffer = { from: (s) => new TextEncoder().encode(s), alloc: (n) => new Uint8Array(n), isBuffer: () => false }; export default { Buffer };",
  child_process: 'export default {}; export const spawn = () => ({ on: () => {}, stdout: { on: () => {} }, stderr: { on: () => {} } }); export const exec = () => {}; export const execSync = () => "";',
  assert: 'export default function assert(v) { if (!v) throw new Error("Assertion failed"); }; export const ok = (v) => { if (!v) throw new Error("Assertion failed"); }; export const strictEqual = (a, b) => { if (a !== b) throw new Error("Assertion failed"); };',
  module: "export const builtinModules = []; export default { builtinModules: [] }; export const createRequire = () => () => ({});",
  tty: "export const isatty = () => true; export default { isatty: () => true };",
  url: 'export const fileURLToPath = (u) => u.replace("file://", ""); export const pathToFileURL = (p) => "file://" + p; export default { fileURLToPath, pathToFileURL };'
};
var browserAliasPlugin = {
  name: "browser-alias",
  setup(build) {
    const nodeModules = Object.keys(nodeStubContents);
    const nodeModulesPattern = nodeModules.join("|");
    const bareModuleFilter = new RegExp(`^(node:)?(${nodeModulesPattern})(/promises)?$`);
    build.onResolve({ filter: bareModuleFilter }, (args) => {
      const match = args.path.match(/^(node:)?(\w+)/);
      if (match) {
        const modName = match[2];
        if (nodeStubContents[modName]) {
          return { path: modName, namespace: "node-builtin-stub" };
        }
      }
      return null;
    });
    build.onLoad({ filter: /.*/, namespace: "node-builtin-stub" }, (args) => {
      const contents = nodeStubContents[args.path];
      if (contents) {
        return { contents, loader: "js" };
      }
      return null;
    });
    build.onResolve({ filter: /useConfig/ }, (args) => {
      if (args.path.endsWith("useConfig.js") || args.path.includes("/useConfig")) {
        const browserPath = resolve(
          __dirname,
          "src/hooks/useConfig.browser.ts"
        );
        return { path: browserPath };
      }
      return null;
    });
    build.onResolve({ filter: /openUrl/ }, (args) => {
      if (args.path.endsWith("openUrl.js") || args.path.includes("/openUrl")) {
        const browserPath = resolve(
          __dirname,
          "src/utils/openUrl.browser.ts"
        );
        return { path: browserPath };
      }
      return null;
    });
    build.onResolve({ filter: /^conf$/ }, () => {
      return { path: "conf", namespace: "conf-stub" };
    });
    build.onLoad({ filter: /.*/, namespace: "conf-stub" }, () => {
      return {
        contents: "export default class Conf { constructor() {} get() {} set() {} delete() {} }",
        loader: "js"
      };
    });
    build.onResolve({ filter: /^open$/ }, () => {
      return { path: "open", namespace: "open-stub" };
    });
    build.onLoad({ filter: /.*/, namespace: "open-stub" }, () => {
      return {
        contents: "export default async () => {}; export const openApp = async () => {}; export const apps = {};",
        loader: "js"
      };
    });
    build.onResolve({ filter: /^react-devtools-core$/ }, () => {
      return { path: "react-devtools-core", namespace: "devtools-stub" };
    });
    build.onLoad({ filter: /.*/, namespace: "devtools-stub" }, () => {
      return {
        contents: "export default { connectToDevTools: () => {} };",
        loader: "js"
      };
    });
    build.onResolve({ filter: /^stack-utils$/ }, () => {
      return { path: "stack-utils", namespace: "stack-utils-stub" };
    });
    build.onLoad({ filter: /.*/, namespace: "stack-utils-stub" }, () => {
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
        loader: "js"
      };
    });
    build.onResolve({ filter: /^signal-exit$/ }, () => {
      return { path: "signal-exit", namespace: "signal-exit-stub" };
    });
    build.onLoad({ filter: /.*/, namespace: "signal-exit-stub" }, () => {
      return {
        contents: "export function onExit(cb, opts) { return () => {}; } export default onExit;",
        loader: "js"
      };
    });
    build.onResolve({ filter: /^restore-cursor$/ }, () => {
      return { path: "restore-cursor", namespace: "restore-cursor-stub" };
    });
    build.onLoad({ filter: /.*/, namespace: "restore-cursor-stub" }, () => {
      return {
        contents: "export default function restoreCursor() {}",
        loader: "js"
      };
    });
  }
};
var tsup_config_default = defineConfig([
  // Node.js CLI build
  {
    entry: ["src/index.tsx"],
    format: ["esm"],
    dts: true,
    clean: true,
    sourcemap: true,
    target: "node20",
    splitting: false,
    banner: {
      js: "#!/usr/bin/env node"
    },
    esbuildOptions(options) {
      options.jsx = "automatic";
    }
  },
  // Browser build - bundle everything with stubs
  {
    entry: { browser: "src/browser.tsx" },
    format: ["esm"],
    dts: true,
    clean: false,
    sourcemap: true,
    target: "es2022",
    platform: "browser",
    splitting: false,
    // Externalize only the adapters - bundle React to ensure reconciler compatibility
    external: ["@tuish/adapters-browser"],
    noExternal: ["ink", "@inkjs/ui", "chalk", "ansi-escapes", "cli-cursor", "cli-truncate", "react", "react-dom", "react-reconciler", "scheduler"],
    esbuildPlugins: [browserAliasPlugin],
    esbuildOptions(options) {
      options.jsx = "automatic";
      options.define = {
        "process.env.NODE_ENV": '"production"'
      };
    },
    // Post-process to replace Node.js imports with inline stubs
    async onSuccess() {
      const fs = await import("fs");
      const path = await import("path");
      const browserJsPath = path.resolve(__dirname, "dist/browser.js");
      let content = fs.readFileSync(browserJsPath, "utf-8");
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
      content = content.replace(
        /import \* as fs from "fs";/g,
        fsStub
      );
      content = content.replace(
        /import \* as fs from "node:fs";/g,
        fsStub
      );
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
      content = content.replace(
        /import (\w+) from "process";/g,
        `var $1 = __process_stub;`
      );
      content = content.replace(
        /import \{ (\w+) \} from "process";/g,
        `var $1 = __process_stub.$1;`
      );
      content = processStubInline + content;
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
      console.log("[browser-build] Post-processed browser.js - replaced Node.js imports");
    }
  }
]);
export {
  tsup_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidHN1cC5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9faW5qZWN0ZWRfZmlsZW5hbWVfXyA9IFwiL1VzZXJzL2RvdWdsYW5jZS9EZXZlbG9wZXIvbHYvc3R1aS9vc3MvdHMvY2xpL3RzdXAuY29uZmlnLnRzXCI7Y29uc3QgX19pbmplY3RlZF9kaXJuYW1lX18gPSBcIi9Vc2Vycy9kb3VnbGFuY2UvRGV2ZWxvcGVyL2x2L3N0dWkvb3NzL3RzL2NsaVwiO2NvbnN0IF9faW5qZWN0ZWRfaW1wb3J0X21ldGFfdXJsX18gPSBcImZpbGU6Ly8vVXNlcnMvZG91Z2xhbmNlL0RldmVsb3Blci9sdi9zdHVpL29zcy90cy9jbGkvdHN1cC5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd0c3VwJztcbmltcG9ydCB0eXBlIHsgUGx1Z2luIH0gZnJvbSAnZXNidWlsZCc7XG5pbXBvcnQgeyByZXNvbHZlLCBkaXJuYW1lIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSAndXJsJztcblxuY29uc3QgX19kaXJuYW1lID0gZGlybmFtZShmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCkpO1xuXG4vLyBTdHViIGZpbGUgcGF0aFxuY29uc3QgZnNTdHViUGF0aCA9IHJlc29sdmUoX19kaXJuYW1lLCAnc3JjL3N0dWJzL2ZzLnRzJyk7XG5cbi8vIEFsbCBOb2RlLmpzIGJ1aWx0LWluIG1vZHVsZSBzdHViIGNvbnRlbnRzXG5jb25zdCBub2RlU3R1YkNvbnRlbnRzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuXHRmczogYFxuXHRcdGV4cG9ydCBjb25zdCByZWFkRmlsZVN5bmMgPSAoKSA9PiAnJztcblx0XHRleHBvcnQgY29uc3Qgd3JpdGVGaWxlU3luYyA9ICgpID0+IHt9O1xuXHRcdGV4cG9ydCBjb25zdCBleGlzdHNTeW5jID0gKCkgPT4gZmFsc2U7XG5cdFx0ZXhwb3J0IGNvbnN0IG1rZGlyU3luYyA9ICgpID0+IHt9O1xuXHRcdGV4cG9ydCBjb25zdCByZWFkZGlyU3luYyA9ICgpID0+IFtdO1xuXHRcdGV4cG9ydCBjb25zdCBzdGF0U3luYyA9ICgpID0+ICh7IGlzRGlyZWN0b3J5OiAoKSA9PiBmYWxzZSwgaXNGaWxlOiAoKSA9PiBmYWxzZSB9KTtcblx0XHRleHBvcnQgY29uc3QgdW5saW5rU3luYyA9ICgpID0+IHt9O1xuXHRcdGV4cG9ydCBkZWZhdWx0IHsgcmVhZEZpbGVTeW5jLCB3cml0ZUZpbGVTeW5jLCBleGlzdHNTeW5jLCBta2RpclN5bmMsIHJlYWRkaXJTeW5jLCBzdGF0U3luYywgdW5saW5rU3luYyB9O1xuXHRgLFxuXHRvczogJ2V4cG9ydCBkZWZhdWx0IHt9OyBleHBvcnQgY29uc3QgaG9tZWRpciA9ICgpID0+IFwiL2hvbWUvdXNlclwiOyBleHBvcnQgY29uc3QgcGxhdGZvcm0gPSAoKSA9PiBcImJyb3dzZXJcIjsgZXhwb3J0IGNvbnN0IHRtcGRpciA9ICgpID0+IFwiL3RtcFwiOycsXG5cdHBhdGg6ICdleHBvcnQgZGVmYXVsdCB7fTsgZXhwb3J0IGNvbnN0IGpvaW4gPSAoLi4uYXJncykgPT4gYXJncy5qb2luKFwiL1wiKTsgZXhwb3J0IGNvbnN0IHJlc29sdmUgPSAoLi4uYXJncykgPT4gYXJncy5qb2luKFwiL1wiKTsgZXhwb3J0IGNvbnN0IGRpcm5hbWUgPSAocCkgPT4gcC5zcGxpdChcIi9cIikuc2xpY2UoMCwgLTEpLmpvaW4oXCIvXCIpOyBleHBvcnQgY29uc3QgYmFzZW5hbWUgPSAocCkgPT4gcC5zcGxpdChcIi9cIikucG9wKCk7IGV4cG9ydCBjb25zdCBleHRuYW1lID0gKHApID0+IHsgY29uc3QgbSA9IHAubWF0Y2goL1xcXFwuW14uXSskLyk7IHJldHVybiBtID8gbVswXSA6IFwiXCI7IH07IGV4cG9ydCBjb25zdCBzZXAgPSBcIi9cIjsnLFxuXHRwcm9jZXNzOiAnZXhwb3J0IGRlZmF1bHQgeyBlbnY6IHt9LCBjd2Q6ICgpID0+IFwiL1wiLCBwbGF0Zm9ybTogXCJicm93c2VyXCIsIHN0ZG91dDogeyB3cml0ZTogKCkgPT4ge30sIGlzVFRZOiB0cnVlIH0sIHN0ZGVycjogeyB3cml0ZTogKCkgPT4ge30sIGlzVFRZOiB0cnVlIH0sIHN0ZGluOiB7IGlzVFRZOiB0cnVlIH0gfTsnLFxuXHRzdHJlYW06ICdleHBvcnQgZGVmYXVsdCB7fTsgZXhwb3J0IGNsYXNzIFJlYWRhYmxlIHsgcGlwZSgpIHsgcmV0dXJuIHRoaXM7IH0gb24oKSB7IHJldHVybiB0aGlzOyB9IH0gZXhwb3J0IGNsYXNzIFdyaXRhYmxlIHsgd3JpdGUoKSB7fSBlbmQoKSB7fSBvbigpIHsgcmV0dXJuIHRoaXM7IH0gfScsXG5cdHV0aWw6ICdleHBvcnQgZGVmYXVsdCB7fTsgZXhwb3J0IGNvbnN0IHByb21pc2lmeSA9IChmbikgPT4gZm47IGV4cG9ydCBjb25zdCBpbmhlcml0cyA9ICgpID0+IHt9OycsXG5cdGV2ZW50czogJ2V4cG9ydCBjbGFzcyBFdmVudEVtaXR0ZXIgeyBvbigpIHsgcmV0dXJuIHRoaXM7IH0gZW1pdCgpIHsgcmV0dXJuIGZhbHNlOyB9IHJlbW92ZUxpc3RlbmVyKCkgeyByZXR1cm4gdGhpczsgfSBvbmNlKCkgeyByZXR1cm4gdGhpczsgfSBhZGRMaXN0ZW5lcigpIHsgcmV0dXJuIHRoaXM7IH0gb2ZmKCkgeyByZXR1cm4gdGhpczsgfSBzZXRNYXhMaXN0ZW5lcnMoKSB7IHJldHVybiB0aGlzOyB9IGdldE1heExpc3RlbmVycygpIHsgcmV0dXJuIDEwOyB9IGxpc3RlbmVycygpIHsgcmV0dXJuIFtdOyB9IHJhd0xpc3RlbmVycygpIHsgcmV0dXJuIFtdOyB9IGxpc3RlbmVyQ291bnQoKSB7IHJldHVybiAwOyB9IHByZXBlbmRMaXN0ZW5lcigpIHsgcmV0dXJuIHRoaXM7IH0gcHJlcGVuZE9uY2VMaXN0ZW5lcigpIHsgcmV0dXJuIHRoaXM7IH0gZXZlbnROYW1lcygpIHsgcmV0dXJuIFtdOyB9IH07IGV4cG9ydCBkZWZhdWx0IEV2ZW50RW1pdHRlcjsnLFxuXHRidWZmZXI6ICdleHBvcnQgY29uc3QgQnVmZmVyID0geyBmcm9tOiAocykgPT4gbmV3IFRleHRFbmNvZGVyKCkuZW5jb2RlKHMpLCBhbGxvYzogKG4pID0+IG5ldyBVaW50OEFycmF5KG4pLCBpc0J1ZmZlcjogKCkgPT4gZmFsc2UgfTsgZXhwb3J0IGRlZmF1bHQgeyBCdWZmZXIgfTsnLFxuXHRjaGlsZF9wcm9jZXNzOiAnZXhwb3J0IGRlZmF1bHQge307IGV4cG9ydCBjb25zdCBzcGF3biA9ICgpID0+ICh7IG9uOiAoKSA9PiB7fSwgc3Rkb3V0OiB7IG9uOiAoKSA9PiB7fSB9LCBzdGRlcnI6IHsgb246ICgpID0+IHt9IH0gfSk7IGV4cG9ydCBjb25zdCBleGVjID0gKCkgPT4ge307IGV4cG9ydCBjb25zdCBleGVjU3luYyA9ICgpID0+IFwiXCI7Jyxcblx0YXNzZXJ0OiAnZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gYXNzZXJ0KHYpIHsgaWYgKCF2KSB0aHJvdyBuZXcgRXJyb3IoXCJBc3NlcnRpb24gZmFpbGVkXCIpOyB9OyBleHBvcnQgY29uc3Qgb2sgPSAodikgPT4geyBpZiAoIXYpIHRocm93IG5ldyBFcnJvcihcIkFzc2VydGlvbiBmYWlsZWRcIik7IH07IGV4cG9ydCBjb25zdCBzdHJpY3RFcXVhbCA9IChhLCBiKSA9PiB7IGlmIChhICE9PSBiKSB0aHJvdyBuZXcgRXJyb3IoXCJBc3NlcnRpb24gZmFpbGVkXCIpOyB9OycsXG5cdG1vZHVsZTogJ2V4cG9ydCBjb25zdCBidWlsdGluTW9kdWxlcyA9IFtdOyBleHBvcnQgZGVmYXVsdCB7IGJ1aWx0aW5Nb2R1bGVzOiBbXSB9OyBleHBvcnQgY29uc3QgY3JlYXRlUmVxdWlyZSA9ICgpID0+ICgpID0+ICh7fSk7Jyxcblx0dHR5OiAnZXhwb3J0IGNvbnN0IGlzYXR0eSA9ICgpID0+IHRydWU7IGV4cG9ydCBkZWZhdWx0IHsgaXNhdHR5OiAoKSA9PiB0cnVlIH07Jyxcblx0dXJsOiAnZXhwb3J0IGNvbnN0IGZpbGVVUkxUb1BhdGggPSAodSkgPT4gdS5yZXBsYWNlKFwiZmlsZTovL1wiLCBcIlwiKTsgZXhwb3J0IGNvbnN0IHBhdGhUb0ZpbGVVUkwgPSAocCkgPT4gXCJmaWxlOi8vXCIgKyBwOyBleHBvcnQgZGVmYXVsdCB7IGZpbGVVUkxUb1BhdGgsIHBhdGhUb0ZpbGVVUkwgfTsnLFxufTtcblxuLy8gUGx1Z2luIHRvIHN3YXAgdXNlQ29uZmlnIGltcG9ydHMgdG8gYnJvd3NlciB2ZXJzaW9uIGZvciBicm93c2VyIGJ1aWxkc1xuY29uc3QgYnJvd3NlckFsaWFzUGx1Z2luOiBQbHVnaW4gPSB7XG5cdG5hbWU6ICdicm93c2VyLWFsaWFzJyxcblx0c2V0dXAoYnVpbGQpIHtcblx0XHQvLyBIYW5kbGUgQUxMIGJhcmUgTm9kZS5qcyBtb2R1bGUgaW1wb3J0cyB3aXRoIGEgc2luZ2xlIHJlc29sdmVyXG5cdFx0Y29uc3Qgbm9kZU1vZHVsZXMgPSBPYmplY3Qua2V5cyhub2RlU3R1YkNvbnRlbnRzKTtcblx0XHRjb25zdCBub2RlTW9kdWxlc1BhdHRlcm4gPSBub2RlTW9kdWxlcy5qb2luKCd8Jyk7XG5cdFx0Y29uc3QgYmFyZU1vZHVsZUZpbHRlciA9IG5ldyBSZWdFeHAoYF4obm9kZTopPygke25vZGVNb2R1bGVzUGF0dGVybn0pKC9wcm9taXNlcyk/JGApO1xuXG5cdFx0YnVpbGQub25SZXNvbHZlKHsgZmlsdGVyOiBiYXJlTW9kdWxlRmlsdGVyIH0sIChhcmdzKSA9PiB7XG5cdFx0XHQvLyBFeHRyYWN0IHRoZSBiYXNlIG1vZHVsZSBuYW1lICh3aXRob3V0IG5vZGU6IHByZWZpeCBvciAvcHJvbWlzZXMgc3VmZml4KVxuXHRcdFx0Y29uc3QgbWF0Y2ggPSBhcmdzLnBhdGgubWF0Y2goL14obm9kZTopPyhcXHcrKS8pO1xuXHRcdFx0aWYgKG1hdGNoKSB7XG5cdFx0XHRcdGNvbnN0IG1vZE5hbWUgPSBtYXRjaFsyXTtcblx0XHRcdFx0aWYgKG5vZGVTdHViQ29udGVudHNbbW9kTmFtZV0pIHtcblx0XHRcdFx0XHRyZXR1cm4geyBwYXRoOiBtb2ROYW1lLCBuYW1lc3BhY2U6ICdub2RlLWJ1aWx0aW4tc3R1YicgfTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0fSk7XG5cblx0XHQvLyBMb2FkIHN0dWIgY29udGVudCBmb3IgTm9kZS5qcyBidWlsdC1pbnNcblx0XHRidWlsZC5vbkxvYWQoeyBmaWx0ZXI6IC8uKi8sIG5hbWVzcGFjZTogJ25vZGUtYnVpbHRpbi1zdHViJyB9LCAoYXJncykgPT4ge1xuXHRcdFx0Y29uc3QgY29udGVudHMgPSBub2RlU3R1YkNvbnRlbnRzW2FyZ3MucGF0aF07XG5cdFx0XHRpZiAoY29udGVudHMpIHtcblx0XHRcdFx0cmV0dXJuIHsgY29udGVudHMsIGxvYWRlcjogJ2pzJyB9O1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0fSk7XG5cblx0XHQvLyBJbnRlcmNlcHQgdXNlQ29uZmlnIGltcG9ydHNcblx0XHRidWlsZC5vblJlc29sdmUoeyBmaWx0ZXI6IC91c2VDb25maWcvIH0sIChhcmdzKSA9PiB7XG5cdFx0XHRpZiAoXG5cdFx0XHRcdGFyZ3MucGF0aC5lbmRzV2l0aCgndXNlQ29uZmlnLmpzJykgfHxcblx0XHRcdFx0YXJncy5wYXRoLmluY2x1ZGVzKCcvdXNlQ29uZmlnJylcblx0XHRcdCkge1xuXHRcdFx0XHRjb25zdCBicm93c2VyUGF0aCA9IHJlc29sdmUoXG5cdFx0XHRcdFx0X19kaXJuYW1lLFxuXHRcdFx0XHRcdCdzcmMvaG9va3MvdXNlQ29uZmlnLmJyb3dzZXIudHMnLFxuXHRcdFx0XHQpO1xuXHRcdFx0XHRyZXR1cm4geyBwYXRoOiBicm93c2VyUGF0aCB9O1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0fSk7XG5cblx0XHQvLyBJbnRlcmNlcHQgb3BlblVybCBpbXBvcnRzIC0gc3dhcCB0byBicm93c2VyIHZlcnNpb24gKGF2b2lkcyAnb3BlbicgcGFja2FnZSlcblx0XHRidWlsZC5vblJlc29sdmUoeyBmaWx0ZXI6IC9vcGVuVXJsLyB9LCAoYXJncykgPT4ge1xuXHRcdFx0aWYgKFxuXHRcdFx0XHRhcmdzLnBhdGguZW5kc1dpdGgoJ29wZW5VcmwuanMnKSB8fFxuXHRcdFx0XHRhcmdzLnBhdGguaW5jbHVkZXMoJy9vcGVuVXJsJylcblx0XHRcdCkge1xuXHRcdFx0XHRjb25zdCBicm93c2VyUGF0aCA9IHJlc29sdmUoXG5cdFx0XHRcdFx0X19kaXJuYW1lLFxuXHRcdFx0XHRcdCdzcmMvdXRpbHMvb3BlblVybC5icm93c2VyLnRzJyxcblx0XHRcdFx0KTtcblx0XHRcdFx0cmV0dXJuIHsgcGF0aDogYnJvd3NlclBhdGggfTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBudWxsO1xuXHRcdH0pO1xuXG5cdFx0Ly8gQWxzbyBzdHViICdjb25mJyBwYWNrYWdlXG5cdFx0YnVpbGQub25SZXNvbHZlKHsgZmlsdGVyOiAvXmNvbmYkLyB9LCAoKSA9PiB7XG5cdFx0XHRyZXR1cm4geyBwYXRoOiAnY29uZicsIG5hbWVzcGFjZTogJ2NvbmYtc3R1YicgfTtcblx0XHR9KTtcblxuXHRcdGJ1aWxkLm9uTG9hZCh7IGZpbHRlcjogLy4qLywgbmFtZXNwYWNlOiAnY29uZi1zdHViJyB9LCAoKSA9PiB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRjb250ZW50czogJ2V4cG9ydCBkZWZhdWx0IGNsYXNzIENvbmYgeyBjb25zdHJ1Y3RvcigpIHt9IGdldCgpIHt9IHNldCgpIHt9IGRlbGV0ZSgpIHt9IH0nLFxuXHRcdFx0XHRsb2FkZXI6ICdqcycsXG5cdFx0XHR9O1xuXHRcdH0pO1xuXG5cdFx0Ly8gU3R1YiAnb3BlbicgcGFja2FnZVxuXHRcdGJ1aWxkLm9uUmVzb2x2ZSh7IGZpbHRlcjogL15vcGVuJC8gfSwgKCkgPT4ge1xuXHRcdFx0cmV0dXJuIHsgcGF0aDogJ29wZW4nLCBuYW1lc3BhY2U6ICdvcGVuLXN0dWInIH07XG5cdFx0fSk7XG5cblx0XHRidWlsZC5vbkxvYWQoeyBmaWx0ZXI6IC8uKi8sIG5hbWVzcGFjZTogJ29wZW4tc3R1YicgfSwgKCkgPT4ge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0Y29udGVudHM6ICdleHBvcnQgZGVmYXVsdCBhc3luYyAoKSA9PiB7fTsgZXhwb3J0IGNvbnN0IG9wZW5BcHAgPSBhc3luYyAoKSA9PiB7fTsgZXhwb3J0IGNvbnN0IGFwcHMgPSB7fTsnLFxuXHRcdFx0XHRsb2FkZXI6ICdqcycsXG5cdFx0XHR9O1xuXHRcdH0pO1xuXG5cdFx0Ly8gU3R1YiByZWFjdC1kZXZ0b29scy1jb3JlIChvcHRpb25hbCBJbmsgZGV2IGRlcGVuZGVuY3kpXG5cdFx0YnVpbGQub25SZXNvbHZlKHsgZmlsdGVyOiAvXnJlYWN0LWRldnRvb2xzLWNvcmUkLyB9LCAoKSA9PiB7XG5cdFx0XHRyZXR1cm4geyBwYXRoOiAncmVhY3QtZGV2dG9vbHMtY29yZScsIG5hbWVzcGFjZTogJ2RldnRvb2xzLXN0dWInIH07XG5cdFx0fSk7XG5cblx0XHRidWlsZC5vbkxvYWQoeyBmaWx0ZXI6IC8uKi8sIG5hbWVzcGFjZTogJ2RldnRvb2xzLXN0dWInIH0sICgpID0+IHtcblx0XHRcdHJldHVybiB7XG5cdFx0XHRcdGNvbnRlbnRzOiAnZXhwb3J0IGRlZmF1bHQgeyBjb25uZWN0VG9EZXZUb29sczogKCkgPT4ge30gfTsnLFxuXHRcdFx0XHRsb2FkZXI6ICdqcycsXG5cdFx0XHR9O1xuXHRcdH0pO1xuXG5cdFx0Ly8gU3R1YiBzdGFjay11dGlscyAodXNlZCBieSBJbmsgZm9yIGVycm9yIGRpc3BsYXkpXG5cdFx0YnVpbGQub25SZXNvbHZlKHsgZmlsdGVyOiAvXnN0YWNrLXV0aWxzJC8gfSwgKCkgPT4ge1xuXHRcdFx0cmV0dXJuIHsgcGF0aDogJ3N0YWNrLXV0aWxzJywgbmFtZXNwYWNlOiAnc3RhY2stdXRpbHMtc3R1YicgfTtcblx0XHR9KTtcblxuXHRcdGJ1aWxkLm9uTG9hZCh7IGZpbHRlcjogLy4qLywgbmFtZXNwYWNlOiAnc3RhY2stdXRpbHMtc3R1YicgfSwgKCkgPT4ge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0Y29udGVudHM6IGBcblx0XHRcdFx0XHRleHBvcnQgZGVmYXVsdCBjbGFzcyBTdGFja1V0aWxzIHtcblx0XHRcdFx0XHRcdHN0YXRpYyBub2RlSW50ZXJuYWxzKCkgeyByZXR1cm4gW107IH1cblx0XHRcdFx0XHRcdGNvbnN0cnVjdG9yKCkge31cblx0XHRcdFx0XHRcdGNsZWFuKHN0YWNrKSB7IHJldHVybiBzdGFjazsgfVxuXHRcdFx0XHRcdFx0cGFyc2VMaW5lKCkgeyByZXR1cm4gbnVsbDsgfVxuXHRcdFx0XHRcdFx0Y2FwdHVyZVN0cmluZygpIHsgcmV0dXJuICcnOyB9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRgLFxuXHRcdFx0XHRsb2FkZXI6ICdqcycsXG5cdFx0XHR9O1xuXHRcdH0pO1xuXG5cdFx0Ly8gU3R1YiBzaWduYWwtZXhpdCAodXNlZCBieSBJbmsgZm9yIGNsZWFudXApXG5cdFx0YnVpbGQub25SZXNvbHZlKHsgZmlsdGVyOiAvXnNpZ25hbC1leGl0JC8gfSwgKCkgPT4ge1xuXHRcdFx0cmV0dXJuIHsgcGF0aDogJ3NpZ25hbC1leGl0JywgbmFtZXNwYWNlOiAnc2lnbmFsLWV4aXQtc3R1YicgfTtcblx0XHR9KTtcblxuXHRcdGJ1aWxkLm9uTG9hZCh7IGZpbHRlcjogLy4qLywgbmFtZXNwYWNlOiAnc2lnbmFsLWV4aXQtc3R1YicgfSwgKCkgPT4ge1xuXHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0Y29udGVudHM6ICdleHBvcnQgZnVuY3Rpb24gb25FeGl0KGNiLCBvcHRzKSB7IHJldHVybiAoKSA9PiB7fTsgfSBleHBvcnQgZGVmYXVsdCBvbkV4aXQ7Jyxcblx0XHRcdFx0bG9hZGVyOiAnanMnLFxuXHRcdFx0fTtcblx0XHR9KTtcblxuXHRcdC8vIFN0dWIgcmVzdG9yZS1jdXJzb3IgKHVzZWQgYnkgY2xpLWN1cnNvcilcblx0XHRidWlsZC5vblJlc29sdmUoeyBmaWx0ZXI6IC9ecmVzdG9yZS1jdXJzb3IkLyB9LCAoKSA9PiB7XG5cdFx0XHRyZXR1cm4geyBwYXRoOiAncmVzdG9yZS1jdXJzb3InLCBuYW1lc3BhY2U6ICdyZXN0b3JlLWN1cnNvci1zdHViJyB9O1xuXHRcdH0pO1xuXG5cdFx0YnVpbGQub25Mb2FkKHsgZmlsdGVyOiAvLiovLCBuYW1lc3BhY2U6ICdyZXN0b3JlLWN1cnNvci1zdHViJyB9LCAoKSA9PiB7XG5cdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRjb250ZW50czogJ2V4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHJlc3RvcmVDdXJzb3IoKSB7fScsXG5cdFx0XHRcdGxvYWRlcjogJ2pzJyxcblx0XHRcdH07XG5cdFx0fSk7XG5cdH0sXG59O1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoW1xuXHQvLyBOb2RlLmpzIENMSSBidWlsZFxuXHR7XG5cdFx0ZW50cnk6IFsnc3JjL2luZGV4LnRzeCddLFxuXHRcdGZvcm1hdDogWydlc20nXSxcblx0XHRkdHM6IHRydWUsXG5cdFx0Y2xlYW46IHRydWUsXG5cdFx0c291cmNlbWFwOiB0cnVlLFxuXHRcdHRhcmdldDogJ25vZGUyMCcsXG5cdFx0c3BsaXR0aW5nOiBmYWxzZSxcblx0XHRiYW5uZXI6IHtcblx0XHRcdGpzOiAnIyEvdXNyL2Jpbi9lbnYgbm9kZScsXG5cdFx0fSxcblx0XHRlc2J1aWxkT3B0aW9ucyhvcHRpb25zKSB7XG5cdFx0XHRvcHRpb25zLmpzeCA9ICdhdXRvbWF0aWMnO1xuXHRcdH0sXG5cdH0sXG5cdC8vIEJyb3dzZXIgYnVpbGQgLSBidW5kbGUgZXZlcnl0aGluZyB3aXRoIHN0dWJzXG5cdHtcblx0XHRlbnRyeTogeyBicm93c2VyOiAnc3JjL2Jyb3dzZXIudHN4JyB9LFxuXHRcdGZvcm1hdDogWydlc20nXSxcblx0XHRkdHM6IHRydWUsXG5cdFx0Y2xlYW46IGZhbHNlLFxuXHRcdHNvdXJjZW1hcDogdHJ1ZSxcblx0XHR0YXJnZXQ6ICdlczIwMjInLFxuXHRcdHBsYXRmb3JtOiAnYnJvd3NlcicsXG5cdFx0c3BsaXR0aW5nOiBmYWxzZSxcblx0XHQvLyBFeHRlcm5hbGl6ZSBvbmx5IHRoZSBhZGFwdGVycyAtIGJ1bmRsZSBSZWFjdCB0byBlbnN1cmUgcmVjb25jaWxlciBjb21wYXRpYmlsaXR5XG5cdFx0ZXh0ZXJuYWw6IFsnQHR1aXNoL2FkYXB0ZXJzLWJyb3dzZXInXSxcblx0XHRub0V4dGVybmFsOiBbJ2luaycsICdAaW5ranMvdWknLCAnY2hhbGsnLCAnYW5zaS1lc2NhcGVzJywgJ2NsaS1jdXJzb3InLCAnY2xpLXRydW5jYXRlJywgJ3JlYWN0JywgJ3JlYWN0LWRvbScsICdyZWFjdC1yZWNvbmNpbGVyJywgJ3NjaGVkdWxlciddLFxuXHRcdGVzYnVpbGRQbHVnaW5zOiBbYnJvd3NlckFsaWFzUGx1Z2luXSxcblx0XHRlc2J1aWxkT3B0aW9ucyhvcHRpb25zKSB7XG5cdFx0XHRvcHRpb25zLmpzeCA9ICdhdXRvbWF0aWMnO1xuXHRcdFx0Ly8gRGVmaW5lIGJyb3dzZXIgZW52aXJvbm1lbnQgLSBrZWVwIE5PREVfRU5WIGJ1dCBsZXQgcHJvY2VzcyBzdHJlYW1zIHVzZSBzdHVic1xuXHRcdFx0b3B0aW9ucy5kZWZpbmUgPSB7XG5cdFx0XHRcdCdwcm9jZXNzLmVudi5OT0RFX0VOVic6ICdcInByb2R1Y3Rpb25cIicsXG5cdFx0XHR9O1xuXHRcdH0sXG5cdFx0Ly8gUG9zdC1wcm9jZXNzIHRvIHJlcGxhY2UgTm9kZS5qcyBpbXBvcnRzIHdpdGggaW5saW5lIHN0dWJzXG5cdFx0YXN5bmMgb25TdWNjZXNzKCkge1xuXHRcdFx0Y29uc3QgZnMgPSBhd2FpdCBpbXBvcnQoJ2ZzJyk7XG5cdFx0XHRjb25zdCBwYXRoID0gYXdhaXQgaW1wb3J0KCdwYXRoJyk7XG5cdFx0XHRjb25zdCBicm93c2VySnNQYXRoID0gcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ2Rpc3QvYnJvd3Nlci5qcycpO1xuXG5cdFx0XHRsZXQgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhicm93c2VySnNQYXRoLCAndXRmLTgnKTtcblxuXHRcdFx0Ly8gUmVwbGFjZSBmcyBpbXBvcnRzIHdpdGggaW5saW5lIHN0dWJcblx0XHRcdGNvbnN0IGZzU3R1YiA9IGBcbnZhciBmcyA9IHtcblx0cmVhZEZpbGVTeW5jOiAoKSA9PiAnJyxcblx0d3JpdGVGaWxlU3luYzogKCkgPT4ge30sXG5cdGV4aXN0c1N5bmM6ICgpID0+IGZhbHNlLFxuXHRta2RpclN5bmM6ICgpID0+IHt9LFxuXHRyZWFkZGlyU3luYzogKCkgPT4gW10sXG5cdHN0YXRTeW5jOiAoKSA9PiAoeyBpc0RpcmVjdG9yeTogKCkgPT4gZmFsc2UsIGlzRmlsZTogKCkgPT4gZmFsc2UgfSksXG5cdHVubGlua1N5bmM6ICgpID0+IHt9LFxuXHRjb25zdGFudHM6IHsgRl9PSzogMCwgUl9PSzogNCwgV19PSzogMiwgWF9PSzogMSB9XG59O1xuYDtcblxuXHRcdFx0Ly8gUmVwbGFjZSBpbXBvcnQgc3RhdGVtZW50cyB3aXRoIHN0dWJcblx0XHRcdGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoXG5cdFx0XHRcdC9pbXBvcnQgXFwqIGFzIGZzIGZyb20gXCJmc1wiOy9nLFxuXHRcdFx0XHRmc1N0dWJcblx0XHRcdCk7XG5cdFx0XHRjb250ZW50ID0gY29udGVudC5yZXBsYWNlKFxuXHRcdFx0XHQvaW1wb3J0IFxcKiBhcyBmcyBmcm9tIFwibm9kZTpmc1wiOy9nLFxuXHRcdFx0XHRmc1N0dWJcblx0XHRcdCk7XG5cblx0XHRcdC8vIFJlcGxhY2UgcHJvY2VzcyBpbXBvcnRzIHdpdGggc3R1YlxuXHRcdFx0Y29uc3QgcHJvY2Vzc1N0dWIgPSBgXG52YXIgY3dkID0gKCkgPT4gXCIvXCI7XG5gO1xuXHRcdFx0Y29udGVudCA9IGNvbnRlbnQucmVwbGFjZShcblx0XHRcdFx0L2ltcG9ydCBcXHsgY3dkIFxcfSBmcm9tIFwicHJvY2Vzc1wiOy9nLFxuXHRcdFx0XHRwcm9jZXNzU3R1YlxuXHRcdFx0KTtcblx0XHRcdGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoXG5cdFx0XHRcdC9pbXBvcnQgXFx7IGN3ZCBcXH0gZnJvbSBcIm5vZGU6cHJvY2Vzc1wiOy9nLFxuXHRcdFx0XHRwcm9jZXNzU3R1YlxuXHRcdFx0KTtcblxuXHRcdFx0Ly8gUmVwbGFjZSBhbGwgcHJvY2VzcyBpbXBvcnRzIHdpdGggaW5saW5lIHN0dWJcblx0XHRcdGNvbnN0IHByb2Nlc3NTdHViSW5saW5lID0gYFxudmFyIF9fc3RkaW5fc3R1YiA9IHtcbiAgaXNUVFk6IHRydWUsXG4gIHNldFJhd01vZGU6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpczsgfSxcbiAgb246IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpczsgfSxcbiAgb2ZmOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXM7IH0sXG4gIG9uY2U6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpczsgfSxcbiAgYWRkTGlzdGVuZXI6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpczsgfSxcbiAgcmVtb3ZlTGlzdGVuZXI6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpczsgfSxcbiAgcGF1c2U6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpczsgfSxcbiAgcmVzdW1lOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXM7IH0sXG4gIHJlYWQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbnVsbDsgfSxcbiAgc2V0RW5jb2Rpbmc6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpczsgfSxcbiAgdW5yZWY6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpczsgfSxcbiAgcmVmOiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXM7IH1cbn07XG52YXIgX19wcm9jZXNzX3N0dWIgPSB7XG4gIGVudjoge30sXG4gIGN3ZDogZnVuY3Rpb24oKSB7IHJldHVybiAnLyc7IH0sXG4gIHBsYXRmb3JtOiAnYnJvd3NlcicsXG4gIHN0ZG91dDogeyB3cml0ZTogZnVuY3Rpb24oKSB7fSwgaXNUVFk6IHRydWUgfSxcbiAgc3RkZXJyOiB7IHdyaXRlOiBmdW5jdGlvbigpIHt9LCBpc1RUWTogdHJ1ZSB9LFxuICBzdGRpbjogX19zdGRpbl9zdHViLFxuICBvbjogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzOyB9LFxuICBvZmY6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpczsgfSxcbiAgb25jZTogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzOyB9LFxuICBleGl0OiBmdW5jdGlvbigpIHt9LFxuICBuZXh0VGljazogZnVuY3Rpb24oY2IpIHsgc2V0VGltZW91dChjYiwgMCk7IH1cbn07XG5gO1xuXHRcdFx0Ly8gUmVwbGFjZSBhbGwgaW1wb3J0IHByb2Nlc3NYIGZyb20gXCJwcm9jZXNzXCIgd2l0aCBzdHViIHVzYWdlXG5cdFx0XHRjb250ZW50ID0gY29udGVudC5yZXBsYWNlKFxuXHRcdFx0XHQvaW1wb3J0IChcXHcrKSBmcm9tIFwicHJvY2Vzc1wiOy9nLFxuXHRcdFx0XHRgdmFyICQxID0gX19wcm9jZXNzX3N0dWI7YFxuXHRcdFx0KTtcblx0XHRcdC8vIFJlcGxhY2UgaW1wb3J0IHsgZW52IH0gZnJvbSBcInByb2Nlc3NcIiBzdHlsZSBpbXBvcnRzXG5cdFx0XHRjb250ZW50ID0gY29udGVudC5yZXBsYWNlKFxuXHRcdFx0XHQvaW1wb3J0IFxceyAoXFx3KykgXFx9IGZyb20gXCJwcm9jZXNzXCI7L2csXG5cdFx0XHRcdGB2YXIgJDEgPSBfX3Byb2Nlc3Nfc3R1Yi4kMTtgXG5cdFx0XHQpO1xuXHRcdFx0Ly8gQWRkIHRoZSBzdHViIGF0IHRoZSB0b3Bcblx0XHRcdGNvbnRlbnQgPSBwcm9jZXNzU3R1YklubGluZSArIGNvbnRlbnQ7XG5cblx0XHRcdC8vIFBvbHlmaWxsIGNvbnNvbGUuQ29uc29sZSBmb3IgYnJvd3NlciAoTm9kZS5qcyBmZWF0dXJlIHVzZWQgYnkgSW5rKVxuXHRcdFx0Y29uc3QgY29uc29sZVBvbHlmaWxsID0gYFxuLy8gUG9seWZpbGwgY29uc29sZS5Db25zb2xlIGZvciBicm93c2VyIChOb2RlLmpzIGZlYXR1cmUgdXNlZCBieSBJbmspXG5pZiAodHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnICYmICFjb25zb2xlLkNvbnNvbGUpIHtcbiAgY29uc29sZS5Db25zb2xlID0gZnVuY3Rpb24gQ29uc29sZVBvbHlmaWxsKHN0ZG91dCwgc3RkZXJyKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGxvZzogY29uc29sZS5sb2cuYmluZChjb25zb2xlKSxcbiAgICAgIHdhcm46IGNvbnNvbGUud2Fybi5iaW5kKGNvbnNvbGUpLFxuICAgICAgZXJyb3I6IGNvbnNvbGUuZXJyb3IuYmluZChjb25zb2xlKSxcbiAgICAgIGluZm86IGNvbnNvbGUuaW5mby5iaW5kKGNvbnNvbGUpLFxuICAgICAgZGVidWc6IGNvbnNvbGUuZGVidWcuYmluZChjb25zb2xlKSxcbiAgICAgIGRpcjogY29uc29sZS5kaXIuYmluZChjb25zb2xlKSxcbiAgICAgIHRyYWNlOiBjb25zb2xlLnRyYWNlLmJpbmQoY29uc29sZSksXG4gICAgICBhc3NlcnQ6IGNvbnNvbGUuYXNzZXJ0LmJpbmQoY29uc29sZSksXG4gICAgICBjbGVhcjogY29uc29sZS5jbGVhci5iaW5kKGNvbnNvbGUpLFxuICAgICAgY291bnQ6IGNvbnNvbGUuY291bnQgPyBjb25zb2xlLmNvdW50LmJpbmQoY29uc29sZSkgOiBmdW5jdGlvbigpIHt9LFxuICAgICAgY291bnRSZXNldDogY29uc29sZS5jb3VudFJlc2V0ID8gY29uc29sZS5jb3VudFJlc2V0LmJpbmQoY29uc29sZSkgOiBmdW5jdGlvbigpIHt9LFxuICAgICAgZ3JvdXA6IGNvbnNvbGUuZ3JvdXAgPyBjb25zb2xlLmdyb3VwLmJpbmQoY29uc29sZSkgOiBmdW5jdGlvbigpIHt9LFxuICAgICAgZ3JvdXBDb2xsYXBzZWQ6IGNvbnNvbGUuZ3JvdXBDb2xsYXBzZWQgPyBjb25zb2xlLmdyb3VwQ29sbGFwc2VkLmJpbmQoY29uc29sZSkgOiBmdW5jdGlvbigpIHt9LFxuICAgICAgZ3JvdXBFbmQ6IGNvbnNvbGUuZ3JvdXBFbmQgPyBjb25zb2xlLmdyb3VwRW5kLmJpbmQoY29uc29sZSkgOiBmdW5jdGlvbigpIHt9LFxuICAgICAgdGFibGU6IGNvbnNvbGUudGFibGUgPyBjb25zb2xlLnRhYmxlLmJpbmQoY29uc29sZSkgOiBmdW5jdGlvbigpIHt9LFxuICAgICAgdGltZTogY29uc29sZS50aW1lID8gY29uc29sZS50aW1lLmJpbmQoY29uc29sZSkgOiBmdW5jdGlvbigpIHt9LFxuICAgICAgdGltZUVuZDogY29uc29sZS50aW1lRW5kID8gY29uc29sZS50aW1lRW5kLmJpbmQoY29uc29sZSkgOiBmdW5jdGlvbigpIHt9LFxuICAgICAgdGltZUxvZzogY29uc29sZS50aW1lTG9nID8gY29uc29sZS50aW1lTG9nLmJpbmQoY29uc29sZSkgOiBmdW5jdGlvbigpIHt9LFxuICAgIH07XG4gIH07XG59XG5gO1xuXHRcdFx0Y29udGVudCA9IGNvbnNvbGVQb2x5ZmlsbCArIGNvbnRlbnQ7XG5cblx0XHRcdGZzLndyaXRlRmlsZVN5bmMoYnJvd3NlckpzUGF0aCwgY29udGVudCk7XG5cdFx0XHRjb25zb2xlLmxvZygnW2Jyb3dzZXItYnVpbGRdIFBvc3QtcHJvY2Vzc2VkIGJyb3dzZXIuanMgLSByZXBsYWNlZCBOb2RlLmpzIGltcG9ydHMnKTtcblx0XHR9LFxuXHR9LFxuXSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXFSLFNBQVMsb0JBQW9CO0FBRWxULFNBQVMsU0FBUyxlQUFlO0FBQ2pDLFNBQVMscUJBQXFCO0FBSDRJLElBQU0sK0JBQStCO0FBSy9NLElBQU0sWUFBWSxRQUFRLGNBQWMsNEJBQWUsQ0FBQztBQUd4RCxJQUFNLGFBQWEsUUFBUSxXQUFXLGlCQUFpQjtBQUd2RCxJQUFNLG1CQUEyQztBQUFBLEVBQ2hELElBQUk7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQVVKLElBQUk7QUFBQSxFQUNKLE1BQU07QUFBQSxFQUNOLFNBQVM7QUFBQSxFQUNULFFBQVE7QUFBQSxFQUNSLE1BQU07QUFBQSxFQUNOLFFBQVE7QUFBQSxFQUNSLFFBQVE7QUFBQSxFQUNSLGVBQWU7QUFBQSxFQUNmLFFBQVE7QUFBQSxFQUNS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

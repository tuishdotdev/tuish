export { createBrowserConfigAdapter } from './config.js';
export { createBrowserStorageAdapter } from './storage.js';
export { createBrowserFingerprintAdapter } from './fingerprint.js';
export {
	createBrowserOutputAdapter,
	createConsoleOutputAdapter,
	type OutputCallback,
} from './output.js';
export { createBrowserContext, type CreateBrowserContextOptions } from './context.js';
export {
	createBrowserLicenseKeyResolver,
	storeBrowserLicenseKey,
	removeBrowserLicenseKey,
} from './license-key.js';
export {
	createXtermInkBridge,
	XtermWriteStream,
	XtermReadStream,
	type XtermInkBridge,
} from './ink-adapter.js';

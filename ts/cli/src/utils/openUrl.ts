/**
 * Platform-aware URL opener
 * In Node.js: uses the 'open' package to launch default browser
 * In browser: uses window.open()
 */
import open from 'open';

export async function openUrl(url: string): Promise<void> {
	await open(url);
}

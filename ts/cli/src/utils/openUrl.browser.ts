/**
 * Browser-safe URL opener
 * Uses window.open() to open URLs in a new tab
 */

declare const window: {
	open(url: string, target?: string): void;
};

export async function openUrl(url: string): Promise<void> {
	window.open(url, '_blank');
}

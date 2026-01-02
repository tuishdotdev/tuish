/**
 * Format cents to a currency string (e.g., 2999 -> "$29.99")
 */
export function formatCurrency(cents: number, currency: string): string {
	const amount = cents / 100;
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: currency.toUpperCase(),
	}).format(amount);
}

/**
 * Format a timestamp to a date string
 */
export function formatDate(timestamp: number): string {
	return new Date(timestamp).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});
}

/**
 * Format a timestamp to a relative time string (e.g., "2 days ago")
 */
export function formatRelativeTime(timestamp: number): string {
	const now = Date.now();
	const diff = now - timestamp;
	const seconds = Math.floor(diff / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);

	if (days > 0) {
		return `${days} day${days === 1 ? '' : 's'} ago`;
	}
	if (hours > 0) {
		return `${hours} hour${hours === 1 ? '' : 's'} ago`;
	}
	if (minutes > 0) {
		return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
	}
	return 'just now';
}

/**
 * Truncate a string to a maximum length with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
	if (str.length <= maxLength) {
		return str;
	}
	return `${str.slice(0, maxLength - 3)}...`;
}

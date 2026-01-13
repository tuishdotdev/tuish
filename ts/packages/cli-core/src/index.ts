// Adapters
export type {
	StorageAdapter,
	ConfigAdapter,
	FingerprintAdapter,
	OutputAdapter,
	PlatformContext,
	LicenseKeyResolver,
	ResolvedLicenseKey,
	LicenseKeySource,
} from './adapters/index.js';

// API Client
export { TuishDeveloperApi, TuishApiError, type ApiOptions } from './api.js';

// Commands
export * from './commands/index.js';

// Types
export type { CommandResult, ErrorCode } from './types.js';
export { ErrorCodes } from './types.js';

// Utilities
export {
	formatCurrency,
	formatDate,
	formatRelativeTime,
	truncate,
} from './format.js';

// Re-export domain types from @tuish/types for convenience
export type {
	Product,
	ProductPublic,
	CreateProductInput,
	UpdateProductInput,
	BillingType,
} from '@tuish/types';

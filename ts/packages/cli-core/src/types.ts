/**
 * Standard result type for all commands.
 * Provides a consistent interface for command outcomes.
 */
export interface CommandResult<T = void> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errorCode?: string;
}

/**
 * Error codes used by commands
 */
export const ErrorCodes = {
  NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',
  INVALID_API_KEY: 'INVALID_API_KEY',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  API_ERROR: 'API_ERROR',
  MISSING_REQUIRED: 'MISSING_REQUIRED',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

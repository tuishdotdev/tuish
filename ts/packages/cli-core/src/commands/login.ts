import { TuishDeveloperApi } from '../api.js';
import type { PlatformContext } from '../adapters/types.js';
import type { CommandResult } from '../types.js';
import { ErrorCodes } from '../types.js';

export interface LoginOptions {
  apiKey?: string;
}

export async function loginCommand(
  ctx: PlatformContext,
  options: LoginOptions,
): Promise<CommandResult> {
  const { config } = ctx;

  if (!options.apiKey) {
    return {
      success: false,
      error: 'API key is required',
      errorCode: ErrorCodes.MISSING_REQUIRED,
    };
  }

  if (!options.apiKey.startsWith('sk_live_') && !options.apiKey.startsWith('sk_test_')) {
    return {
      success: false,
      error: 'Invalid API key format. Keys start with sk_live_ or sk_test_',
      errorCode: ErrorCodes.INVALID_API_KEY,
    };
  }

  const api = new TuishDeveloperApi({
    apiKey: options.apiKey,
    apiBaseUrl: config.getApiBaseUrl(),
  });

  try {
    // Validate the key by making a test request
    await api.listProducts();
    config.setApiKey(options.apiKey);

    return {
      success: true,
      message: 'Logged in successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid API key',
      errorCode: ErrorCodes.VALIDATION_FAILED,
    };
  }
}

import { TuishDeveloperApi, TuishApiError } from '../api.js';
import type { PlatformContext } from '../adapters/types.js';
import type { CommandResult } from '../types.js';
import { ErrorCodes } from '../types.js';

export interface SignupOptions {
  email: string;
  name?: string;
}

export interface SignupResult {
  developer: {
    id: string;
    email: string;
    name: string | null;
    createdAt: number;
  };
  apiKey: string;
}

export async function signupCommand(
  ctx: PlatformContext,
  options: SignupOptions,
): Promise<CommandResult<SignupResult>> {
  const { config } = ctx;

  if (!options.email) {
    return {
      success: false,
      error: 'Email is required',
      errorCode: ErrorCodes.MISSING_REQUIRED,
    };
  }

  const api = new TuishDeveloperApi({
    apiBaseUrl: config.getApiBaseUrl(),
  });

  try {
    const result = await api.signup({
      email: options.email,
      name: options.name,
    });

    // Auto-login after signup
    config.setApiKey(result.apiKey);

    return {
      success: true,
      data: result,
      message: 'Account created successfully',
    };
  } catch (error) {
    if (error instanceof TuishApiError) {
      return {
        success: false,
        error: error.message,
        errorCode: ErrorCodes.API_ERROR,
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Signup failed',
      errorCode: ErrorCodes.API_ERROR,
    };
  }
}

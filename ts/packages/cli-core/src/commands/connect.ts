import { TuishDeveloperApi, TuishApiError } from '../api.js';
import type { PlatformContext } from '../adapters/types.js';
import type { CommandResult } from '../types.js';
import { ErrorCodes } from '../types.js';

export interface ConnectStatusResult {
  connected: boolean;
  accountId: string | null;
}

export interface ConnectStartResult {
  authUrl: string;
}

export async function connectStatusCommand(
  ctx: PlatformContext,
): Promise<CommandResult<ConnectStatusResult>> {
  const apiKey = ctx.config.getApiKey();

  if (!apiKey) {
    return {
      success: false,
      error: 'Not authenticated. Run `tuish login` first.',
      errorCode: ErrorCodes.NOT_AUTHENTICATED,
    };
  }

  const api = new TuishDeveloperApi({
    apiKey,
    apiBaseUrl: ctx.config.getApiBaseUrl(),
  });

  try {
    const result = await api.getConnectStatus();
    return {
      success: true,
      data: result,
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
      error: error instanceof Error ? error.message : 'Failed to get connect status',
      errorCode: ErrorCodes.API_ERROR,
    };
  }
}

export async function connectStartCommand(
  ctx: PlatformContext,
): Promise<CommandResult<ConnectStartResult>> {
  const apiKey = ctx.config.getApiKey();

  if (!apiKey) {
    return {
      success: false,
      error: 'Not authenticated. Run `tuish login` first.',
      errorCode: ErrorCodes.NOT_AUTHENTICATED,
    };
  }

  const api = new TuishDeveloperApi({
    apiKey,
    apiBaseUrl: ctx.config.getApiBaseUrl(),
  });

  try {
    const result = await api.startConnect();
    return {
      success: true,
      data: result,
      message: 'Opening Stripe Connect authorization...',
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
      error: error instanceof Error ? error.message : 'Failed to start connect',
      errorCode: ErrorCodes.API_ERROR,
    };
  }
}

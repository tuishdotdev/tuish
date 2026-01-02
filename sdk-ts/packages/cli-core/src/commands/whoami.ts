import type { PlatformContext } from '../adapters/types.js';
import type { CommandResult } from '../types.js';

export interface WhoamiResult {
  isAuthenticated: boolean;
  apiKeyPreview?: string;
}

export async function whoamiCommand(
  ctx: PlatformContext,
): Promise<CommandResult<WhoamiResult>> {
  const { config } = ctx;

  const apiKey = config.getApiKey();

  if (!apiKey) {
    return {
      success: true,
      data: {
        isAuthenticated: false,
      },
    };
  }

  // Show first 12 and last 4 characters of the key
  const preview = `${apiKey.slice(0, 12)}...${apiKey.slice(-4)}`;

  return {
    success: true,
    data: {
      isAuthenticated: true,
      apiKeyPreview: preview,
    },
  };
}

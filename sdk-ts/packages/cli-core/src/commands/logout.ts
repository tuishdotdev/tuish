import type { PlatformContext } from '../adapters/types.js';
import type { CommandResult } from '../types.js';

export async function logoutCommand(
  ctx: PlatformContext,
): Promise<CommandResult> {
  const { config } = ctx;

  const hadKey = config.getApiKey() !== undefined;
  config.clearApiKey();

  return {
    success: true,
    message: hadKey ? 'Logged out successfully' : 'Already logged out',
  };
}

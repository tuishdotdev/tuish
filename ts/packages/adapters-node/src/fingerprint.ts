import { createHash } from 'node:crypto';
import { hostname, userInfo, platform, arch } from 'node:os';
import type { FingerprintAdapter } from '@tuish/cli-core';

export function createNodeFingerprintAdapter(): FingerprintAdapter {
  let cachedFingerprint: string | null = null;

  return {
    getMachineFingerprint: () => {
      if (!cachedFingerprint) {
        const components = [
          hostname(),
          userInfo().username,
          platform(),
          arch(),
        ];
        cachedFingerprint = createHash('sha256')
          .update(components.join(':'))
          .digest('hex');
      }
      return cachedFingerprint;
    },
  };
}

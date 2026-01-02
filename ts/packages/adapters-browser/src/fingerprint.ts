import type { FingerprintAdapter } from '@tuish/cli-core';

/**
 * Browser fingerprinting for the demo terminal.
 *
 * IMPORTANT: In the browser demo, we use a session-based fingerprint.
 * This is intentional because:
 * 1. The browser terminal is for DEMO purposes only
 * 2. Real license validation happens in the actual CLI
 * 3. We don't want to track users across sessions
 */
export function createBrowserFingerprintAdapter(): FingerprintAdapter {
  // Generate a session-unique fingerprint
  let sessionFingerprint: string | null = null;

  return {
    getMachineFingerprint: () => {
      if (!sessionFingerprint) {
        // Use crypto.randomUUID() with a prefix to indicate it's a demo
        sessionFingerprint = `demo:${crypto.randomUUID()}`;
      }
      return sessionFingerprint;
    },
  };
}

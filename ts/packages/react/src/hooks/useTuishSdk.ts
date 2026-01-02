import type { Tuish } from '@tuish/sdk';
import { useContext } from 'react';
import { TuishSdkContext } from '../context/TuishSdkContext.js';

/**
 * Hook to access the underlying Tuish SDK instance for advanced use cases.
 * Must be used within a LicenseProvider.
 *
 * @example
 * ```tsx
 * const sdk = useTuishSdk();
 * const session = await sdk.purchaseInBrowser();
 * ```
 */
export function useTuishSdk(): Tuish {
  const sdk = useContext(TuishSdkContext);
  if (!sdk) {
    throw new Error('useTuishSdk must be used within a LicenseProvider');
  }
  return sdk;
}

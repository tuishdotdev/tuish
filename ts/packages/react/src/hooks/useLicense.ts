import { useContext } from 'react';
import { LicenseContext } from '../context/LicenseContext.js';
import type { LicenseContextValue } from '../types.js';

/**
 * Hook to access license state and operations.
 * Must be used within a LicenseProvider.
 *
 * @example
 * ```tsx
 * const { license, isValid, hasFeature, refresh } = useLicense();
 *
 * if (hasFeature('pro')) {
 *   // Show pro feature
 * }
 * ```
 */
export function useLicense(): LicenseContextValue {
  const context = useContext(LicenseContext);
  if (!context) {
    throw new Error('useLicense must be used within a LicenseProvider');
  }
  return context;
}

import { Text } from 'ink';
import type { ReactElement } from 'react';
import { useLicense } from '@tuish/react';
import type { LicenseGateProps } from '../types.js';

/**
 * Conditionally renders children based on license status or feature availability.
 *
 * @example
 * ```tsx
 * // Gate by feature
 * <LicenseGate feature="pro" fallback={<UpgradePrompt />}>
 *   <ProFeature />
 * </LicenseGate>
 *
 * // Gate by any valid license
 * <LicenseGate requireLicense fallback={<PurchaseFlow />}>
 *   <PaidContent />
 * </LicenseGate>
 * ```
 */
export function LicenseGate({
  children,
  feature,
  requireLicense = false,
  fallback,
  loading,
}: LicenseGateProps): ReactElement | null {
  const { isValid, isLoading, hasFeature } = useLicense();

  // Show loading state while checking license
  if (isLoading) {
    if (loading) {
      return loading as ReactElement;
    }
    return <Text dimColor>Checking license...</Text>;
  }

  // Determine if access should be granted
  let hasAccess = false;

  if (feature) {
    // Feature-based gating
    hasAccess = hasFeature(feature);
  } else if (requireLicense) {
    // Any valid license required
    hasAccess = isValid;
  } else {
    // No gating specified, allow access
    hasAccess = true;
  }

  // Render based on access
  if (hasAccess) {
    return children as ReactElement;
  }

  // No access - render fallback or nothing
  if (fallback) {
    return fallback as ReactElement;
  }

  return null;
}

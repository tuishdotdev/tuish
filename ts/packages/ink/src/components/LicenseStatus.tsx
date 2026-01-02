import { Box, Text } from 'ink';
import { useLicense } from '@tuish/react';
import type { LicenseStatusProps } from '../types.js';

/**
 * Displays current license status, features, and expiry.
 *
 * @example
 * ```tsx
 * <LicenseStatus />
 * <LicenseStatus compact />
 * <LicenseStatus showFeatures={false} />
 * ```
 */
export function LicenseStatus({
  showFeatures = true,
  showExpiry = true,
  compact = false,
}: LicenseStatusProps) {
  const { license, isValid, isLoading, offlineMode } = useLicense();

  if (isLoading) {
    return <Text dimColor>Checking license...</Text>;
  }

  if (!license) {
    return (
      <Box>
        <Text color="yellow">⚠ No license</Text>
      </Box>
    );
  }

  // Format expiry date
  const formatExpiry = (timestamp: number | null): string => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Compact mode: single line
  if (compact) {
    const status = isValid ? '✓' : '✗';
    const statusColor = isValid ? 'green' : 'red';
    const featureCount = license.features.length;
    const offlineIndicator = offlineMode ? ' (offline)' : '';

    return (
      <Text>
        <Text color={statusColor}>{status}</Text>
        {' '}
        <Text>
          {license.productName ?? 'Licensed'} • {featureCount} feature
          {featureCount !== 1 ? 's' : ''}
          {offlineIndicator}
        </Text>
      </Text>
    );
  }

  // Full mode
  return (
    <Box flexDirection="column" gap={1}>
      {/* Status line */}
      <Box gap={1}>
        <Text color={isValid ? 'green' : 'red'}>
          {isValid ? '✓' : '✗'}
        </Text>
        <Text bold>{license.productName ?? 'License'}</Text>
        {offlineMode && <Text dimColor>(offline)</Text>}
      </Box>

      {/* Status */}
      <Box gap={1}>
        <Text dimColor>Status:</Text>
        <Text color={license.status === 'active' ? 'green' : 'red'}>
          {license.status}
        </Text>
      </Box>

      {/* Features */}
      {showFeatures && license.features.length > 0 && (
        <Box flexDirection="column">
          <Text dimColor>Features:</Text>
          <Box paddingLeft={2} flexDirection="column">
            {license.features.map((feature) => (
              <Text key={feature}>• {feature}</Text>
            ))}
          </Box>
        </Box>
      )}

      {/* Expiry */}
      {showExpiry && (
        <Box gap={1}>
          <Text dimColor>Expires:</Text>
          <Text>{formatExpiry(license.expiresAt)}</Text>
        </Box>
      )}
    </Box>
  );
}

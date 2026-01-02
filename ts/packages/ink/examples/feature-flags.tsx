#!/usr/bin/env npx tsx
/**
 * Example showing feature flag pattern with multiple gates.
 *
 * Run with: npx tsx examples/feature-flags.tsx
 */

import React from 'react';
import { render, Box, Text } from 'ink';
import { LicenseProvider, useFeatureCheck, useLicense } from '@tuish/react';
import { LicenseGate } from '../src/index.js';

function FeatureIndicator({ feature }: { feature: string }) {
  const has = useFeatureCheck(feature);
  return (
    <Text>
      {has ? '*' : 'X'} {feature}: <Text color={has ? 'green' : 'red'}>{has ? 'enabled' : 'disabled'}</Text>
    </Text>
  );
}

function FeatureDashboard() {
  const { license } = useLicense();

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Feature Dashboard</Text>

      <Box flexDirection="column" marginTop={1}>
        <FeatureIndicator feature="core" />
        <FeatureIndicator feature="pro" />
        <FeatureIndicator feature="enterprise" />
        <FeatureIndicator feature="beta" />
        <FeatureIndicator feature="api-access" />
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text bold>Gated Content:</Text>

        <LicenseGate feature="core" fallback={<Text dimColor>  [Core locked]</Text>}>
          <Text color="green">  Core features available</Text>
        </LicenseGate>

        <LicenseGate feature="pro" fallback={<Text dimColor>  [Pro locked]</Text>}>
          <Text color="green">  Pro features available</Text>
        </LicenseGate>

        <LicenseGate feature="enterprise" fallback={<Text dimColor>  [Enterprise locked]</Text>}>
          <Text color="green">  Enterprise features available</Text>
        </LicenseGate>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>
          License features: [{license?.features.join(', ') ?? 'none'}]
        </Text>
      </Box>
    </Box>
  );
}

function App() {
  return (
    <LicenseProvider
      productId="prod_demo_123"
      publicKey="MCowBQYDK2VwAyEADEMO_KEY_FOR_TESTING_ONLY_REPLACE_WITH_REAL"
      debug
    >
      <Box padding={1}>
        <FeatureDashboard />
      </Box>
    </LicenseProvider>
  );
}

render(<App />);

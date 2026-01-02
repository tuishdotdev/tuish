#!/usr/bin/env npx tsx
/**
 * Simple usage example showing the most common pattern.
 *
 * Run with: npx tsx examples/simple.tsx
 */

import React from 'react';
import { render, Box, Text } from 'ink';
import { LicenseProvider } from '@tuish/react';
import { LicenseGate, PurchaseFlow, LicenseStatus } from '../src/index.js';

function ProFeature() {
  return (
    <Box flexDirection="column" gap={1}>
      <Text color="green" bold>Pro Feature Unlocked!</Text>
      <Text>You have access to all pro features.</Text>
      <LicenseStatus compact />
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
      <Box flexDirection="column" padding={1}>
        <Text bold>My CLI App</Text>

        <LicenseGate
          feature="pro"
          fallback={<PurchaseFlow />}
        >
          <ProFeature />
        </LicenseGate>
      </Box>
    </LicenseProvider>
  );
}

render(<App />);

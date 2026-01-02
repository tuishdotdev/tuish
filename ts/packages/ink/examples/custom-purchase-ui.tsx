#!/usr/bin/env npx tsx
/**
 * Example showing custom purchase UI using usePurchaseFlow hook.
 *
 * Run with: npx tsx examples/custom-purchase-ui.tsx
 */

import React from 'react';
import { render, Box, Text, useInput } from 'ink';
import { Spinner } from '@inkjs/ui';
import { LicenseProvider, usePurchaseFlow, useLicense } from '@tuish/react';
import { QrCode } from '../src/index.js';

function CustomPurchaseUI() {
  const { isValid } = useLicense();
  const { state, start, cancel, retry } = usePurchaseFlow({
    onComplete: (license) => {
      console.log('Purchased:', license.id);
    },
  });

  useInput((input, key) => {
    if (input === 'p' && state.step === 'idle') {
      start();
    }
    if (key.escape && state.step === 'waiting') {
      cancel();
    }
    if (input === 'r' && state.step === 'error') {
      retry();
      start();
    }
  });

  if (isValid) {
    return (
      <Box flexDirection="column">
        <Text color="green">* Already licensed!</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>Custom Purchase UI</Text>

      {state.step === 'idle' && (
        <Text>Press <Text color="yellow">p</Text> to purchase</Text>
      )}

      {state.step === 'creating' && (
        <Spinner label="Setting up checkout..." />
      )}

      {state.step === 'waiting' && (
        <Box flexDirection="column" gap={1}>
          <Text bold color="cyan">Scan to purchase:</Text>
          <QrCode value={state.checkoutUrl} />
          <Spinner label="Waiting for payment..." />
          <Text dimColor>Press Esc to cancel</Text>
        </Box>
      )}

      {state.step === 'success' && (
        <Box flexDirection="column">
          <Text color="green" bold>* Purchase complete!</Text>
          <Text>License: {state.license.id}</Text>
        </Box>
      )}

      {state.step === 'error' && (
        <Box flexDirection="column">
          <Text color="red">X {state.error}</Text>
          {state.retryable && (
            <Text>Press <Text color="yellow">r</Text> to retry</Text>
          )}
        </Box>
      )}

      {state.step === 'cancelled' && (
        <Box flexDirection="column">
          <Text color="yellow">Cancelled</Text>
          <Text>Press <Text color="yellow">p</Text> to try again</Text>
        </Box>
      )}
    </Box>
  );
}

function App() {
  return (
    <LicenseProvider
      productId="prod_demo_123"
      publicKey="MCowBQYDK2VwAyEADEMO_KEY_FOR_TESTING_ONLY_REPLACE_WITH_REAL"
      autoCheck={false}
      debug
    >
      <Box padding={1}>
        <CustomPurchaseUI />
      </Box>
    </LicenseProvider>
  );
}

render(<App />);

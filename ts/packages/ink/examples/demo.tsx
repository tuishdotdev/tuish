#!/usr/bin/env npx tsx
/**
 * @tuish/ink Demo - Comprehensive Example
 *
 * Demonstrates ALL components and hooks in various configurations.
 *
 * Run with: npx tsx examples/demo.tsx
 */

import React, { useState } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';
import { Select } from '@inkjs/ui';

// Import React primitives from @tuish/react
import {
  LicenseProvider,
  useLicense,
  useTuishSdk,
  useFeatureCheck,
  usePurchaseFlow,
} from '@tuish/react';

// Import Ink components from @tuish/ink
import {
  LicenseGate,
  LicenseStatus,
  PurchaseFlow,
  TuishLicenseManager,
  QrCode,
  getTerminalWidth,
  canFitQrCode,
} from '../src/index.js';

// Demo configuration - replace with real values to test live
const DEMO_CONFIG = {
  productId: 'prod_demo_123',
  publicKey: 'MCowBQYDK2VwAyEADEMO_KEY_FOR_TESTING_ONLY_REPLACE_WITH_REAL',
  debug: true,
};

type DemoScreen =
  | 'menu'
  | 'license-status-full'
  | 'license-status-compact'
  | 'license-status-minimal'
  | 'license-gate-feature'
  | 'license-gate-any'
  | 'purchase-flow'
  | 'license-manager'
  | 'qr-code'
  | 'hook-use-license'
  | 'hook-use-feature-check'
  | 'hook-use-purchase-flow'
  | 'hook-use-sdk'
  | 'utilities';

// ============================================================
// Individual Demo Components
// ============================================================

function DemoLicenseStatusFull() {
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold underline>LicenseStatus - Full Mode (default)</Text>
      <Text dimColor>Shows all license info: status, features, expiry</Text>
      <Box marginTop={1} borderStyle="round" paddingX={2} paddingY={1}>
        <LicenseStatus />
      </Box>
    </Box>
  );
}

function DemoLicenseStatusCompact() {
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold underline>LicenseStatus - Compact Mode</Text>
      <Text dimColor>Single-line display for headers/status bars</Text>
      <Box marginTop={1}>
        <LicenseStatus compact />
      </Box>
    </Box>
  );
}

function DemoLicenseStatusMinimal() {
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold underline>LicenseStatus - Minimal (no features/expiry)</Text>
      <Text dimColor>Just status, no feature list or expiry date</Text>
      <Box marginTop={1} borderStyle="round" paddingX={2} paddingY={1}>
        <LicenseStatus showFeatures={false} showExpiry={false} />
      </Box>
    </Box>
  );
}

function DemoLicenseGateFeature() {
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold underline>LicenseGate - Feature-based Gating</Text>
      <Text dimColor>Gates content based on specific feature availability</Text>

      <Box marginTop={1} flexDirection="column" gap={1}>
        <Text>Checking feature "pro":</Text>
        <Box borderStyle="round" paddingX={2} paddingY={1}>
          <LicenseGate
            feature="pro"
            fallback={<Text color="yellow">! Pro feature required - Upgrade to access</Text>}
            loading={<Text dimColor>Checking pro access...</Text>}
          >
            <Text color="green">* You have access to Pro features!</Text>
          </LicenseGate>
        </Box>

        <Text>Checking feature "enterprise":</Text>
        <Box borderStyle="round" paddingX={2} paddingY={1}>
          <LicenseGate
            feature="enterprise"
            fallback={<Text color="yellow">! Enterprise feature required</Text>}
          >
            <Text color="green">* Enterprise access granted!</Text>
          </LicenseGate>
        </Box>
      </Box>
    </Box>
  );
}

function DemoLicenseGateAny() {
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold underline>LicenseGate - Any License Required</Text>
      <Text dimColor>Gates content for any valid license (no specific feature)</Text>

      <Box marginTop={1} borderStyle="round" paddingX={2} paddingY={1}>
        <LicenseGate
          requireLicense
          fallback={
            <Box flexDirection="column">
              <Text color="yellow">! License required to continue</Text>
              <Text dimColor>Purchase a license to access this content</Text>
            </Box>
          }
        >
          <Box flexDirection="column">
            <Text color="green">* Licensed User Content</Text>
            <Text>Welcome! You have a valid license.</Text>
          </Box>
        </LicenseGate>
      </Box>
    </Box>
  );
}

function DemoPurchaseFlow() {
  const [started, setStarted] = useState(false);

  if (!started) {
    return (
      <Box flexDirection="column" gap={1}>
        <Text bold underline>PurchaseFlow Component</Text>
        <Text dimColor>Complete checkout flow with QR code and polling</Text>
        <Text dimColor>Press Enter to start the purchase flow demo</Text>
        <Box marginTop={1}>
          <Select
            options={[
              { label: 'Start Purchase Flow', value: 'start' },
              { label: 'Cancel', value: 'cancel' },
            ]}
            onChange={(value) => {
              if (value === 'start') setStarted(true);
            }}
          />
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold underline>PurchaseFlow Component</Text>
      <Box marginTop={1}>
        <PurchaseFlow
          email="demo@example.com"
          showQrCode={true}
          pollInterval={3000}
          timeout={300000}
          onComplete={(license) => {
            console.log('Purchase complete!', license);
          }}
          onCancel={() => {
            setStarted(false);
          }}
        />
      </Box>
    </Box>
  );
}

function DemoLicenseManager() {
  return (
    <Box flexDirection="column" gap={1}>
      <Text bold underline>TuishLicenseManager Component</Text>
      <Text dimColor>Complete self-service license management UI</Text>
      <Box marginTop={1}>
        <TuishLicenseManager
          allowManualEntry={true}
          email="demo@example.com"
          onExit={() => {
            console.log('Exited license manager');
          }}
        />
      </Box>
    </Box>
  );
}

function DemoQrCode() {
  const width = getTerminalWidth();
  const testUrl = 'https://tuish.dev/checkout/demo-session';

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold underline>QrCode Component</Text>
      <Text dimColor>Renders QR codes using Unicode half-blocks</Text>
      <Text dimColor>Terminal width: {width} columns</Text>

      <Box marginTop={1} flexDirection="column" gap={2}>
        <Box flexDirection="column">
          <Text>Normal mode (auto-detects terminal width):</Text>
          <Box marginTop={1}>
            <QrCode value={testUrl} />
          </Box>
        </Box>

        <Box flexDirection="column">
          <Text>URL-only mode (forced):</Text>
          <Box marginTop={1}>
            <QrCode value={testUrl} urlOnly />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function DemoUseLicenseHook() {
  const {
    license,
    isValid,
    isLoading,
    error,
    offlineMode,
    checkoutInProgress,
    lastRefresh,
    hasFeature,
  } = useLicense();

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold underline>useLicense() Hook</Text>
      <Text dimColor>Direct access to license state and operations</Text>

      <Box marginTop={1} flexDirection="column" borderStyle="round" paddingX={2} paddingY={1}>
        <Text>State:</Text>
        <Text>  isValid: <Text color={isValid ? 'green' : 'red'}>{String(isValid)}</Text></Text>
        <Text>  isLoading: {String(isLoading)}</Text>
        <Text>  offlineMode: {String(offlineMode)}</Text>
        <Text>  checkoutInProgress: {String(checkoutInProgress)}</Text>
        <Text>  lastRefresh: {lastRefresh ? new Date(lastRefresh).toLocaleTimeString() : 'never'}</Text>
        <Text>  error: {error ? error.message : 'none'}</Text>
        <Text> </Text>
        <Text>License:</Text>
        {license ? (
          <>
            <Text>  id: {license.id}</Text>
            <Text>  status: {license.status}</Text>
            <Text>  features: [{license.features.join(', ')}]</Text>
          </>
        ) : (
          <Text dimColor>  No license loaded</Text>
        )}
        <Text> </Text>
        <Text>Feature checks:</Text>
        <Text>  hasFeature('core'): {String(hasFeature('core'))}</Text>
        <Text>  hasFeature('pro'): {String(hasFeature('pro'))}</Text>
        <Text>  hasFeature('enterprise'): {String(hasFeature('enterprise'))}</Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Actions: refresh() and clear() available</Text>
      </Box>
    </Box>
  );
}

function DemoUseFeatureCheckHook() {
  const hasCore = useFeatureCheck('core');
  const hasPro = useFeatureCheck('pro');
  const hasEnterprise = useFeatureCheck('enterprise');
  const hasAdvanced = useFeatureCheck('advanced');
  const hasBeta = useFeatureCheck('beta');

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold underline>useFeatureCheck() Hook</Text>
      <Text dimColor>Memoized feature availability checks</Text>

      <Box marginTop={1} flexDirection="column" borderStyle="round" paddingX={2} paddingY={1}>
        <Text>Feature availability:</Text>
        <Text>  core: <Text color={hasCore ? 'green' : 'red'}>{String(hasCore)}</Text></Text>
        <Text>  pro: <Text color={hasPro ? 'green' : 'red'}>{String(hasPro)}</Text></Text>
        <Text>  enterprise: <Text color={hasEnterprise ? 'green' : 'red'}>{String(hasEnterprise)}</Text></Text>
        <Text>  advanced: <Text color={hasAdvanced ? 'green' : 'red'}>{String(hasAdvanced)}</Text></Text>
        <Text>  beta: <Text color={hasBeta ? 'green' : 'red'}>{String(hasBeta)}</Text></Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>Results are memoized - only recalculates when license changes</Text>
      </Box>
    </Box>
  );
}

function DemoUsePurchaseFlowHook() {
  const { state, start, cancel, retry } = usePurchaseFlow({
    email: 'demo@example.com',
    pollInterval: 2000,
    timeout: 300000,
    onComplete: (license) => {
      console.log('Hook: Purchase complete!', license);
    },
    onCancel: () => {
      console.log('Hook: Purchase cancelled');
    },
  });

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold underline>usePurchaseFlow() Hook</Text>
      <Text dimColor>State machine for custom purchase UI</Text>

      <Box marginTop={1} flexDirection="column" borderStyle="round" paddingX={2} paddingY={1}>
        <Text>Current state: <Text bold color="cyan">{state.step}</Text></Text>
        {state.step === 'waiting' && (
          <>
            <Text>  sessionId: {state.sessionId}</Text>
            <Text>  checkoutUrl: {state.checkoutUrl}</Text>
          </>
        )}
        {state.step === 'success' && (
          <Text>  license: {state.license.id}</Text>
        )}
        {state.step === 'error' && (
          <>
            <Text color="red">  error: {state.error}</Text>
            <Text>  retryable: {String(state.retryable)}</Text>
          </>
        )}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>
          Available actions: start(), cancel(), retry()
        </Text>
      </Box>

      <Box marginTop={1}>
        <Select
          options={[
            { label: 'start() - Begin checkout', value: 'start' },
            { label: 'cancel() - Cancel current flow', value: 'cancel' },
            { label: 'retry() - Retry after error', value: 'retry' },
          ]}
          onChange={(value) => {
            if (value === 'start') start();
            if (value === 'cancel') cancel();
            if (value === 'retry') retry();
          }}
        />
      </Box>
    </Box>
  );
}

function DemoUseSdkHook() {
  const sdk = useTuishSdk();

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold underline>useTuishSdk() Hook</Text>
      <Text dimColor>Direct access to Tuish SDK instance for advanced use</Text>

      <Box marginTop={1} flexDirection="column" borderStyle="round" paddingX={2} paddingY={1}>
        <Text>SDK instance available with methods:</Text>
        <Text dimColor>  - checkLicense()</Text>
        <Text dimColor>  - purchaseInBrowser(options)</Text>
        <Text dimColor>  - waitForCheckoutComplete(sessionId, options)</Text>
        <Text dimColor>  - storeLicense(key)</Text>
        <Text dimColor>  - clearLicense()</Text>
        <Text dimColor>  - getCachedLicenseKey()</Text>
        <Text dimColor>  - extractLicenseInfo(key)</Text>
        <Text dimColor>  - getMachineFingerprint()</Text>
      </Box>

      <Box marginTop={1}>
        <Text>Machine fingerprint: <Text dimColor>{sdk.getMachineFingerprint().slice(0, 20)}...</Text></Text>
      </Box>
    </Box>
  );
}

function DemoUtilities() {
  const terminalWidth = getTerminalWidth();
  const canFit21 = canFitQrCode(21); // Version 1 QR
  const canFit25 = canFitQrCode(25); // Version 2 QR
  const canFit29 = canFitQrCode(29); // Version 3 QR

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold underline>Utility Functions</Text>
      <Text dimColor>Helper functions for terminal detection and QR sizing</Text>

      <Box marginTop={1} flexDirection="column" borderStyle="round" paddingX={2} paddingY={1}>
        <Text>getTerminalWidth(): <Text bold>{terminalWidth}</Text> columns</Text>
        <Text> </Text>
        <Text>canFitQrCode(moduleCount):</Text>
        <Text>  21 modules (v1): <Text color={canFit21 ? 'green' : 'red'}>{String(canFit21)}</Text></Text>
        <Text>  25 modules (v2): <Text color={canFit25 ? 'green' : 'red'}>{String(canFit25)}</Text></Text>
        <Text>  29 modules (v3): <Text color={canFit29 ? 'green' : 'red'}>{String(canFit29)}</Text></Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>
          Also available: generateQrMatrix(), renderQrAsUnicode(), getQrModuleCount()
        </Text>
      </Box>
    </Box>
  );
}

// ============================================================
// Main Demo App
// ============================================================

function DemoContent() {
  const { exit } = useApp();
  const [screen, setScreen] = useState<DemoScreen>('menu');

  useInput((input, key) => {
    if (key.escape || input === 'q') {
      if (screen === 'menu') {
        exit();
      } else {
        setScreen('menu');
      }
    }
  });

  if (screen === 'menu') {
    return (
      <Box flexDirection="column" gap={1}>
        <Text bold color="cyan">@tuish/ink Component Demo</Text>
        <Text dimColor>Comprehensive examples of all components and hooks</Text>

        <Box marginTop={1}>
          <Select
            options={[
              { label: '-- Components --', value: 'divider1' },
              { label: '  LicenseStatus (full)', value: 'license-status-full' },
              { label: '  LicenseStatus (compact)', value: 'license-status-compact' },
              { label: '  LicenseStatus (minimal)', value: 'license-status-minimal' },
              { label: '  LicenseGate (feature)', value: 'license-gate-feature' },
              { label: '  LicenseGate (any license)', value: 'license-gate-any' },
              { label: '  PurchaseFlow', value: 'purchase-flow' },
              { label: '  TuishLicenseManager', value: 'license-manager' },
              { label: '  QrCode', value: 'qr-code' },
              { label: '-- Hooks --', value: 'divider2' },
              { label: '  useLicense()', value: 'hook-use-license' },
              { label: '  useFeatureCheck()', value: 'hook-use-feature-check' },
              { label: '  usePurchaseFlow()', value: 'hook-use-purchase-flow' },
              { label: '  useTuishSdk()', value: 'hook-use-sdk' },
              { label: '-- Utilities --', value: 'divider3' },
              { label: '  Terminal & QR utilities', value: 'utilities' },
              { label: '-- Exit --', value: 'exit' },
            ]}
            onChange={(value) => {
              if (value === 'exit') {
                exit();
              } else if (!value.startsWith('divider')) {
                setScreen(value as DemoScreen);
              }
            }}
          />
        </Box>

        <Box marginTop={1}>
          <Text dimColor>Press q to exit</Text>
        </Box>
      </Box>
    );
  }

  const renderScreen = () => {
    switch (screen) {
      case 'license-status-full':
        return <DemoLicenseStatusFull />;
      case 'license-status-compact':
        return <DemoLicenseStatusCompact />;
      case 'license-status-minimal':
        return <DemoLicenseStatusMinimal />;
      case 'license-gate-feature':
        return <DemoLicenseGateFeature />;
      case 'license-gate-any':
        return <DemoLicenseGateAny />;
      case 'purchase-flow':
        return <DemoPurchaseFlow />;
      case 'license-manager':
        return <DemoLicenseManager />;
      case 'qr-code':
        return <DemoQrCode />;
      case 'hook-use-license':
        return <DemoUseLicenseHook />;
      case 'hook-use-feature-check':
        return <DemoUseFeatureCheckHook />;
      case 'hook-use-purchase-flow':
        return <DemoUsePurchaseFlowHook />;
      case 'hook-use-sdk':
        return <DemoUseSdkHook />;
      case 'utilities':
        return <DemoUtilities />;
      default:
        return null;
    }
  };

  return (
    <Box flexDirection="column" gap={1}>
      {renderScreen()}
      <Box marginTop={2}>
        <Text dimColor>Press Esc or q to go back</Text>
      </Box>
    </Box>
  );
}

function App() {
  return (
    <LicenseProvider
      productId={DEMO_CONFIG.productId}
      publicKey={DEMO_CONFIG.publicKey}
      debug={DEMO_CONFIG.debug}
      autoCheck={true}
    >
      <Box flexDirection="column" padding={1}>
        <DemoContent />
      </Box>
    </LicenseProvider>
  );
}

render(<App />);

import { Box, Text, useInput } from 'ink';
import { Select, TextInput } from '@inkjs/ui';
import { useState, useRef } from 'react';
import { useLicense, useTuishSdk } from '@tuish/react';
import { LicenseStatus } from './LicenseStatus.js';
import { PurchaseFlow } from './PurchaseFlow.js';
import type { TuishLicenseManagerProps } from '../types.js';

type ManagerScreen =
  | 'menu'
  | 'status'
  | 'purchase'
  | 'enter-key'
  | 'confirm-clear';

interface MenuItem {
  label: string;
  value: ManagerScreen | 'clear' | 'exit';
}

/**
 * Complete self-service license management UI.
 * Provides menu navigation for status, purchase, manual entry, and clear.
 *
 * @example
 * ```tsx
 * <TuishLicenseManager onExit={() => process.exit(0)} />
 * ```
 */
export function TuishLicenseManager({
  onExit,
  allowManualEntry = true,
  email,
}: TuishLicenseManagerProps) {
  const [screen, setScreen] = useState<ManagerScreen>('menu');
  const manualKeyRef = useRef('');
  const [manualKeyError, setManualKeyError] = useState<string | null>(null);
  const [manualKeySuccess, setManualKeySuccess] = useState(false);
  const [textInputKey, setTextInputKey] = useState(0);

  const { license, isValid, refresh, clear } = useLicense();
  const sdk = useTuishSdk();

  // Handle keyboard shortcuts
  useInput((input, key) => {
    // 'q' to exit from any screen (except text input)
    if (input === 'q' && screen !== 'enter-key') {
      if (screen === 'menu') {
        onExit?.();
      } else {
        setScreen('menu');
      }
    }

    // Escape to go back
    if (key.escape && screen !== 'menu') {
      setScreen('menu');
    }
  });

  // Build menu options based on current state
  const getMenuOptions = (): MenuItem[] => {
    const options: MenuItem[] = [
      { label: '📋 View License Status', value: 'status' },
    ];

    if (!isValid) {
      options.push({ label: '🛒 Purchase License', value: 'purchase' });
    }

    if (allowManualEntry) {
      options.push({ label: '🔑 Enter License Key', value: 'enter-key' });
    }

    if (license) {
      options.push({ label: '🗑️  Clear License', value: 'clear' });
    }

    options.push({ label: '👋 Exit', value: 'exit' });

    return options;
  };

  const handleMenuSelect = (value: string) => {
    if (value === 'exit') {
      onExit?.();
      return;
    }

    if (value === 'clear') {
      setScreen('confirm-clear');
      return;
    }

    setScreen(value as ManagerScreen);
  };

  const handleManualKeyChange = (value: string) => {
    manualKeyRef.current = value;
  };

  const handleManualKeySubmit = async (value: string) => {
    setManualKeyError(null);
    setManualKeySuccess(false);

    const keyValue = value.trim();
    if (!keyValue) {
      setManualKeyError('Please enter a license key');
      return;
    }

    try {
      // Try to extract and validate the license
      const info = sdk.extractLicenseInfo(keyValue);
      if (!info) {
        setManualKeyError('Invalid license key format');
        return;
      }

      // Store the license
      sdk.storeLicense(keyValue);

      // Refresh to verify
      await refresh();

      setManualKeySuccess(true);
      manualKeyRef.current = '';
      setTextInputKey((k) => k + 1); // Reset the TextInput

      // Return to menu after short delay
      setTimeout(() => {
        setScreen('menu');
        setManualKeySuccess(false);
      }, 2000);
    } catch (err) {
      setManualKeyError(err instanceof Error ? err.message : 'Failed to validate license');
    }
  };

  const handleConfirmClear = (confirmed: boolean) => {
    if (confirmed) {
      clear();
    }
    setScreen('menu');
  };

  // Render screens
  switch (screen) {
    case 'menu':
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>License Manager</Text>
          {license && (
            <Box>
              <Text dimColor>
                Current: {isValid ? '✓' : '✗'} {license.productName ?? 'Licensed'}
              </Text>
            </Box>
          )}
          <Box marginTop={1}>
            <Select
              options={getMenuOptions()}
              onChange={handleMenuSelect}
            />
          </Box>
          <Text dimColor>
            Press <Text color="yellow">q</Text> to exit
          </Text>
        </Box>
      );

    case 'status':
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>License Status</Text>
          <Box marginTop={1}>
            <LicenseStatus />
          </Box>
          <Box marginTop={1}>
            <Text dimColor>
              Press <Text color="yellow">Esc</Text> to go back
            </Text>
          </Box>
        </Box>
      );

    case 'purchase':
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>Purchase License</Text>
          <Box marginTop={1}>
            <PurchaseFlow
              email={email}
              onComplete={() => {
                setTimeout(() => setScreen('menu'), 2000);
              }}
              onCancel={() => setScreen('menu')}
            />
          </Box>
        </Box>
      );

    case 'enter-key':
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold>Enter License Key</Text>
          <Text dimColor>Paste your license key below:</Text>

          <Box marginTop={1}>
            <TextInput
              key={textInputKey}
              placeholder="TUISH-XXXX-XXXX-XXXX..."
              onChange={handleManualKeyChange}
              onSubmit={handleManualKeySubmit}
            />
          </Box>

          {manualKeyError && (
            <Text color="red">✗ {manualKeyError}</Text>
          )}

          {manualKeySuccess && (
            <Text color="green">✓ License activated successfully!</Text>
          )}

          <Box marginTop={1}>
            <Text dimColor>
              Press <Text color="yellow">Enter</Text> to submit,{' '}
              <Text color="yellow">Esc</Text> to cancel
            </Text>
          </Box>
        </Box>
      );

    case 'confirm-clear':
      return (
        <Box flexDirection="column" gap={1}>
          <Text bold color="yellow">Clear License?</Text>
          <Text>This will remove your license from this device.</Text>
          <Text dimColor>You can re-enter it later if needed.</Text>

          <Box marginTop={1}>
            <Select
              options={[
                { label: 'No, keep license', value: 'no' },
                { label: 'Yes, clear license', value: 'yes' },
              ]}
              onChange={(value) => handleConfirmClear(value === 'yes')}
            />
          </Box>
        </Box>
      );

    default:
      return null;
  }
}

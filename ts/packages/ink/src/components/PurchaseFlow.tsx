import { Box, Text, useInput } from 'ink';
import { Spinner, ProgressBar } from '@inkjs/ui';
import { useEffect, useState } from 'react';
import { usePurchaseFlow } from '@tuish/react';
import { QrCode } from './QrCode.js';
import type { PurchaseFlowProps } from '../types.js';

/**
 * Complete purchase flow with QR code display and checkout polling.
 *
 * @example
 * ```tsx
 * <PurchaseFlow
 *   onComplete={(license) => console.log('Purchased!', license)}
 *   onCancel={() => console.log('Cancelled')}
 * />
 * ```
 */
export function PurchaseFlow({
  onComplete,
  onCancel,
  showQrCode = true,
  email,
  pollInterval = 2000,
  timeout = 600000,
}: PurchaseFlowProps) {
  const { state, start, cancel, retry } = usePurchaseFlow({
    email,
    pollInterval,
    timeout,
    onComplete,
    onCancel,
  });

  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Auto-start on mount if idle
  useEffect(() => {
    if (state.step === 'idle') {
      start();
    }
  }, [state.step, start]);

  // Timer for waiting state
  useEffect(() => {
    if (state.step === 'waiting') {
      const interval = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setElapsedSeconds(0);
    }
  }, [state.step]);

  // Handle keyboard input
  useInput((input, key) => {
    if (key.escape) {
      if (state.step === 'waiting' || state.step === 'creating') {
        cancel();
      }
    }
    if (input === 'r') {
      if ((state.step === 'error' && state.retryable) || state.step === 'cancelled') {
        retry();
        start();
      }
    }
    if (input === 'q') {
      cancel();
    }
  });

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Render based on state
  switch (state.step) {
    case 'idle':
      return (
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor="blue"
          paddingX={2}
          paddingY={1}
        >
          <Text color="blue">Initializing...</Text>
        </Box>
      );

    case 'creating':
      return (
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor="blue"
          paddingX={2}
          paddingY={1}
        >
          <Box marginBottom={1}>
            <Text bold color="blue">┌─ </Text>
            <Text bold>CHECKOUT</Text>
            <Text bold color="blue"> ─┐</Text>
          </Box>
          <Box gap={1}>
            <Spinner type="dots" />
            <Text>Setting up secure checkout...</Text>
          </Box>
        </Box>
      );

    case 'waiting':
      return (
        <Box flexDirection="column">
          {/* Header */}
          <Box
            borderStyle="double"
            borderColor="cyan"
            paddingX={3}
            paddingY={1}
            flexDirection="column"
          >
            <Box justifyContent="center" marginBottom={1}>
              <Text bold color="cyan">
                {'╔═══════════════════════════════════╗'}
              </Text>
            </Box>
            <Box justifyContent="center">
              <Text bold color="cyan">
                {'║'}
              </Text>
              <Text bold>    💳 COMPLETE YOUR PURCHASE    </Text>
              <Text bold color="cyan">
                {'║'}
              </Text>
            </Box>
            <Box justifyContent="center">
              <Text bold color="cyan">
                {'╚═══════════════════════════════════╝'}
              </Text>
            </Box>
          </Box>

          {/* Instructions */}
          <Box marginY={1} flexDirection="column" gap={1}>
            <Box gap={2}>
              <Text color="yellow" bold>①</Text>
              <Text>Scan the QR code with your phone</Text>
            </Box>
            <Box gap={2}>
              <Text color="yellow" bold>②</Text>
              <Text>Complete payment in your browser</Text>
            </Box>
            <Box gap={2}>
              <Text color="yellow" bold>③</Text>
              <Text>Return here - we'll detect it automatically</Text>
            </Box>
          </Box>

          {/* QR Code Section */}
          <Box
            borderStyle="round"
            borderColor="white"
            paddingX={2}
            paddingY={1}
            flexDirection="column"
            alignItems="center"
          >
            <QrCode value={state.checkoutUrl} urlOnly={!showQrCode} />
          </Box>

          {/* Status Bar */}
          <Box
            marginTop={1}
            borderStyle="single"
            borderColor="gray"
            paddingX={2}
            paddingY={1}
            flexDirection="column"
          >
            <Box gap={2} alignItems="center">
              <Spinner type="dots" />
              <Text>Waiting for payment</Text>
              <Text dimColor>•</Text>
              <Text color="cyan">{formatTime(elapsedSeconds)}</Text>
            </Box>

            {/* Progress indication */}
            <Box marginTop={1}>
              <ProgressBar value={Math.min((elapsedSeconds % 30) / 30, 1)} />
            </Box>
          </Box>

          {/* Controls */}
          <Box marginTop={1} justifyContent="center" gap={3}>
            <Text dimColor>
              <Text color="yellow" bold>[Esc]</Text> Cancel
            </Text>
          </Box>
        </Box>
      );

    case 'success':
      return (
        <Box flexDirection="column">
          <Box
            borderStyle="double"
            borderColor="green"
            paddingX={3}
            paddingY={1}
            flexDirection="column"
          >
            {/* Success Banner */}
            <Box justifyContent="center" marginBottom={1}>
              <Text color="green" bold>
                {'╔═══════════════════════════════════╗'}
              </Text>
            </Box>
            <Box justifyContent="center">
              <Text color="green" bold>
                {'║'}
              </Text>
              <Text bold color="green">    ✓ PURCHASE SUCCESSFUL!     </Text>
              <Text color="green" bold>
                {'║'}
              </Text>
            </Box>
            <Box justifyContent="center">
              <Text color="green" bold>
                {'╚═══════════════════════════════════╝'}
              </Text>
            </Box>
          </Box>

          {/* License Details */}
          <Box
            marginTop={1}
            borderStyle="round"
            borderColor="green"
            paddingX={2}
            paddingY={1}
            flexDirection="column"
          >
            <Box marginBottom={1}>
              <Text bold>License Activated</Text>
            </Box>

            {state.license.productName && (
              <Box gap={1}>
                <Text dimColor>Product:</Text>
                <Text bold color="white">{state.license.productName}</Text>
              </Box>
            )}

            {state.license.features.length > 0 && (
              <Box gap={1} marginTop={1} flexDirection="column">
                <Text dimColor>Features unlocked:</Text>
                <Box flexDirection="column" paddingLeft={2}>
                  {state.license.features.map((feature) => (
                    <Text key={feature} color="green">✓ {feature}</Text>
                  ))}
                </Box>
              </Box>
            )}

            {state.license.expiresAt && (
              <Box gap={1} marginTop={1}>
                <Text dimColor>Valid until:</Text>
                <Text>{new Date(state.license.expiresAt).toLocaleDateString()}</Text>
              </Box>
            )}
          </Box>

          <Box marginTop={1} justifyContent="center">
            <Text color="green">Thank you for your purchase! 🎉</Text>
          </Box>
        </Box>
      );

    case 'error':
      return (
        <Box flexDirection="column">
          <Box
            borderStyle="double"
            borderColor="red"
            paddingX={3}
            paddingY={1}
            flexDirection="column"
          >
            <Box justifyContent="center" marginBottom={1}>
              <Text color="red" bold>
                {'╔═══════════════════════════════════╗'}
              </Text>
            </Box>
            <Box justifyContent="center">
              <Text color="red" bold>
                {'║'}
              </Text>
              <Text bold color="red">      ✗ PURCHASE FAILED        </Text>
              <Text color="red" bold>
                {'║'}
              </Text>
            </Box>
            <Box justifyContent="center">
              <Text color="red" bold>
                {'╚═══════════════════════════════════╝'}
              </Text>
            </Box>
          </Box>

          <Box
            marginTop={1}
            borderStyle="round"
            borderColor="red"
            paddingX={2}
            paddingY={1}
            flexDirection="column"
          >
            <Text color="red" bold>Error Details:</Text>
            <Box marginTop={1}>
              <Text wrap="wrap">{state.error}</Text>
            </Box>
          </Box>

          <Box marginTop={1} justifyContent="center" gap={3}>
            {state.retryable && (
              <Text>
                <Text color="yellow" bold>[R]</Text>
                <Text dimColor> Retry</Text>
              </Text>
            )}
            <Text>
              <Text color="yellow" bold>[Q]</Text>
              <Text dimColor> Exit</Text>
            </Text>
          </Box>
        </Box>
      );

    case 'cancelled':
      return (
        <Box flexDirection="column">
          <Box
            borderStyle="round"
            borderColor="yellow"
            paddingX={3}
            paddingY={1}
            flexDirection="column"
          >
            <Box justifyContent="center">
              <Text color="yellow" bold>⚠ Purchase Cancelled</Text>
            </Box>
          </Box>

          <Box marginTop={1} justifyContent="center" gap={3}>
            <Text>
              <Text color="yellow" bold>[R]</Text>
              <Text dimColor> Try Again</Text>
            </Text>
            <Text>
              <Text color="yellow" bold>[Q]</Text>
              <Text dimColor> Exit</Text>
            </Text>
          </Box>
        </Box>
      );

    default:
      return null;
  }
}

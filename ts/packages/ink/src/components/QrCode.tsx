import { Box, Text } from 'ink';
import { useEffect, useState } from 'react';
import { generateQrMatrix, renderQrAsUnicode, getQrModuleCount } from '../utils/qr.js';
import { canFitQrCode } from '../utils/terminal.js';

interface QrCodeProps {
  /** The text/URL to encode */
  value: string;
  /** Force URL-only mode (no QR) */
  urlOnly?: boolean;
}

/**
 * Renders a QR code in the terminal using Unicode half-block characters.
 * Falls back to URL-only display if terminal is too narrow.
 */
export function QrCode({ value, urlOnly = false }: QrCodeProps) {
  const [qrString, setQrString] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canFit, setCanFit] = useState(true);

  useEffect(() => {
    if (urlOnly) {
      setCanFit(false);
      return;
    }

    async function generate() {
      try {
        // Check if QR will fit
        const moduleCount = await getQrModuleCount(value);
        const fits = canFitQrCode(moduleCount);
        setCanFit(fits);

        if (!fits) {
          return;
        }

        // Generate and render QR
        const matrix = await generateQrMatrix(value);
        const rendered = renderQrAsUnicode(matrix);
        setQrString(rendered);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate QR code');
      }
    }

    generate();
  }, [value, urlOnly]);

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">QR Error: {error}</Text>
        <Text>{value}</Text>
      </Box>
    );
  }

  if (!canFit || !qrString) {
    // URL-only mode
    return (
      <Box flexDirection="column">
        <Text dimColor>Scan or visit:</Text>
        <Text color="cyan" underline>{value}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text>{qrString}</Text>
      <Box marginTop={1}>
        <Text dimColor>Or visit: </Text>
        <Text color="cyan">{value}</Text>
      </Box>
    </Box>
  );
}

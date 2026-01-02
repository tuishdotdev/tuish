/**
 * Get current terminal width in columns.
 */
export function getTerminalWidth(): number {
  return process.stdout.columns ?? 80;
}

/**
 * Check if terminal is wide enough to display a QR code.
 * QR codes need ~2 chars per module plus quiet zone.
 */
export function canFitQrCode(moduleCount: number): boolean {
  // Each QR module needs 2 chars width, plus quiet zone (4 modules each side)
  const requiredWidth = (moduleCount + 8) * 2;
  return getTerminalWidth() >= requiredWidth;
}

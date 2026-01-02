import QRCode from 'qrcode';

/**
 * Generate QR code as a boolean matrix.
 */
export async function generateQrMatrix(text: string): Promise<boolean[][]> {
  const qr = await QRCode.create(text, {
    errorCorrectionLevel: 'M',
  });

  const size = qr.modules.size;
  const matrix: boolean[][] = [];

  for (let y = 0; y < size; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < size; x++) {
      row.push(qr.modules.get(x, y) === 1);
    }
    matrix.push(row);
  }

  return matrix;
}

/**
 * Render QR matrix as Unicode string using half-block characters.
 * This allows 2 rows to be rendered in 1 terminal line.
 *
 * Characters used:
 * - ' ' (space) - both pixels white
 * - '\u2588' (full block) - both pixels black
 * - '\u2580' (upper half) - top black, bottom white
 * - '\u2584' (lower half) - top white, bottom black
 */
export function renderQrAsUnicode(matrix: boolean[][]): string {
  const lines: string[] = [];
  const size = matrix.length;

  // Add quiet zone (border of white)
  const paddedSize = size + 4; // 2 modules on each side
  const paddedMatrix: boolean[][] = [];

  for (let y = 0; y < paddedSize; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < paddedSize; x++) {
      const inBounds = x >= 2 && x < size + 2 && y >= 2 && y < size + 2;
      if (inBounds) {
        row.push(matrix[y - 2]![x - 2]!);
      } else {
        row.push(false); // White quiet zone
      }
    }
    paddedMatrix.push(row);
  }

  // Render 2 rows at a time using half-block characters
  for (let y = 0; y < paddedMatrix.length; y += 2) {
    let line = '';
    for (let x = 0; x < paddedMatrix[0]!.length; x++) {
      const top = paddedMatrix[y]?.[x] ?? false;
      const bottom = paddedMatrix[y + 1]?.[x] ?? false;

      if (top && bottom) {
        line += '\u2588'; // Both black
      } else if (top && !bottom) {
        line += '\u2580'; // Top black, bottom white
      } else if (!top && bottom) {
        line += '\u2584'; // Top white, bottom black
      } else {
        line += ' '; // Both white
      }
    }
    lines.push(line);
  }

  return lines.join('\n');
}

/**
 * Get the module count for a QR code (for size calculation).
 */
export async function getQrModuleCount(text: string): Promise<number> {
  const qr = await QRCode.create(text, {
    errorCorrectionLevel: 'M',
  });
  return qr.modules.size;
}

"""Terminal utilities for Tuish Textual widgets."""

from __future__ import annotations

import shutil
from datetime import datetime
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    pass

# Unicode half-block characters for QR rendering
BLOCK_FULL = "\u2588"  # Full block
BLOCK_UPPER = "\u2580"  # Upper half block
BLOCK_LOWER = "\u2584"  # Lower half block
BLOCK_EMPTY = " "  # Space


def get_terminal_width() -> int:
    """Get current terminal width in columns.

    Returns:
        Terminal width, defaults to 80 if detection fails.
    """
    try:
        size = shutil.get_terminal_size()
        return size.columns
    except Exception:
        return 80


def get_qr_module_count(data: str, error_correction: int = 1) -> int:
    """Calculate QR code module count for given data.

    Args:
        data: Data to encode in QR code.
        error_correction: Error correction level (0-3, default 1 = L).

    Returns:
        Number of modules (cells) per side of QR code.
    """
    import qrcode

    qr = qrcode.QRCode(
        version=None,  # Auto-size
        error_correction=error_correction,
        box_size=1,
        border=0,
    )
    qr.add_data(data)
    qr.make(fit=True)
    return int(qr.modules_count)


def can_fit_qr_code(
    module_count: int,
    terminal_width: int | None = None,
    border: int = 2,
    min_margin: int = 4,
) -> bool:
    """Check if QR code can fit in terminal width.

    QR codes use 2 characters per module (for aspect ratio).
    We need: (module_count + 2*border) * 2 + min_margin <= terminal_width

    Args:
        module_count: QR code module count.
        terminal_width: Terminal width (auto-detected if None).
        border: QR code border in modules.
        min_margin: Minimum margin on sides.

    Returns:
        True if QR code fits, False otherwise.
    """
    if terminal_width is None:
        terminal_width = get_terminal_width()

    qr_width = (module_count + 2 * border) * 2
    return qr_width + min_margin <= terminal_width


def can_fit_qr(data: str, terminal_width: int | None = None) -> bool:
    """Check if QR code for given data can fit in terminal.

    Convenience function that calculates module count and checks fit.

    Args:
        data: Data to encode in QR code.
        terminal_width: Terminal width (auto-detected if None).

    Returns:
        True if QR code would fit, False otherwise.
    """
    module_count = get_qr_module_count(data)
    return can_fit_qr_code(module_count, terminal_width)


def generate_qr_matrix(data: str, border: int = 2) -> list[list[bool]]:
    """Generate QR code as boolean matrix.

    Args:
        data: Data to encode.
        border: Border width in modules.

    Returns:
        2D list where True = dark module, False = light module.
    """
    import qrcode

    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=1,
        border=border,
    )
    qr.add_data(data)
    qr.make(fit=True)

    # Get module matrix
    modules: list[list[bool]] = qr.get_matrix()
    return modules


def render_qr_as_unicode(matrix: list[list[bool]]) -> str:
    """Render QR matrix as Unicode half-block string.

    Uses half-block characters to achieve 2:1 aspect ratio,
    rendering 2 vertical modules per character.

    Args:
        matrix: Boolean matrix from generate_qr_matrix.

    Returns:
        Unicode string representation of QR code.
    """
    lines: list[str] = []
    height = len(matrix)

    # Process two rows at a time
    for y in range(0, height, 2):
        line = ""
        for x in range(len(matrix[0])):
            top = matrix[y][x] if y < height else False
            bottom = matrix[y + 1][x] if y + 1 < height else False

            if top and bottom:
                line += BLOCK_FULL
            elif top and not bottom:
                line += BLOCK_UPPER
            elif not top and bottom:
                line += BLOCK_LOWER
            else:
                line += BLOCK_EMPTY

        lines.append(line)

    return "\n".join(lines)


def format_time_elapsed(seconds: int) -> str:
    """Format elapsed time as MM:SS string.

    Args:
        seconds: Elapsed seconds.

    Returns:
        Formatted string like "2:35".
    """
    minutes = seconds // 60
    secs = seconds % 60
    return f"{minutes}:{secs:02d}"


def format_timestamp(timestamp_ms: int | None) -> str:
    """Format timestamp as human-readable date.

    Args:
        timestamp_ms: Unix timestamp in milliseconds, or None.

    Returns:
        Formatted date string like "Jan 15, 2025" or "N/A".
    """
    if timestamp_ms is None:
        return "N/A"

    dt = datetime.fromtimestamp(timestamp_ms / 1000)
    return dt.strftime("%b %d, %Y")


def format_expiry_date(timestamp_ms: int | None) -> str:
    """Format expiry timestamp as human-readable date.

    Args:
        timestamp_ms: Unix timestamp in milliseconds, or None for perpetual.

    Returns:
        Formatted date string like "Jan 15, 2025" or "Never".
    """
    if timestamp_ms is None:
        return "Never"

    dt = datetime.fromtimestamp(timestamp_ms / 1000)
    return dt.strftime("%b %d, %Y")


def format_features(features: list[str], max_display: int = 5) -> str:
    """Format feature list for display.

    Args:
        features: List of feature flag names.
        max_display: Maximum features to show before truncating.

    Returns:
        Formatted string like "pro, team, api (+2 more)" or "None".
    """
    if not features:
        return "None"

    if len(features) <= max_display:
        return ", ".join(features)

    displayed = features[:max_display]
    remaining = len(features) - max_display
    return f"{', '.join(displayed)} (+{remaining} more)"

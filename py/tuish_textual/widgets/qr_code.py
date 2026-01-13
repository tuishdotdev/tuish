"""QR code widget for terminal display."""

from __future__ import annotations

from textual.app import ComposeResult
from textual.reactive import reactive
from textual.widget import Widget
from textual.widgets import Static

from tuish_textual.utils import (
    can_fit_qr_code,
    generate_qr_matrix,
    get_qr_module_count,
    render_qr_as_unicode,
)


class QrCode(Widget):
    """Renders a QR code in the terminal using Unicode half-block characters.

    Falls back to URL-only display if terminal is too narrow.

    Args:
        value: The text/URL to encode in the QR code.
        url_only: Force URL-only mode, skip QR rendering.
        border: QR code border width in modules (default 2).

    Example:
        ```python
        yield QrCode(value="https://checkout.stripe.com/c/pay/...")
        yield QrCode(value=url, url_only=True)
        ```
    """

    DEFAULT_CSS = """
    QrCode {
        height: auto;
        width: auto;
        padding: 0;
    }

    QrCode > .qr-container {
        height: auto;
        width: auto;
    }

    QrCode > .qr-image {
        color: $text;
        text-style: none;
    }

    QrCode > .qr-url-label {
        color: $text-muted;
        margin-bottom: 1;
    }

    QrCode > .qr-url {
        color: $primary;
        text-style: underline;
    }

    QrCode > .qr-fallback-label {
        color: $text-muted;
    }

    QrCode.-error > .qr-error {
        color: $error;
    }
    """

    value: reactive[str] = reactive("")
    url_only: reactive[bool] = reactive(False)
    border: reactive[int] = reactive(2)

    # Internal state
    _qr_string: reactive[str | None] = reactive(None)
    _can_fit: reactive[bool] = reactive(True)
    _error: reactive[str | None] = reactive(None)

    def __init__(
        self,
        value: str,
        url_only: bool = False,
        border: int = 2,
        *,
        name: str | None = None,
        id: str | None = None,
        classes: str | None = None,
    ) -> None:
        """Initialize QrCode widget.

        Args:
            value: URL or text to encode.
            url_only: Force URL-only display.
            border: QR code border width.
            name: Widget name.
            id: Widget ID.
            classes: CSS classes.
        """
        super().__init__(name=name, id=id, classes=classes)
        self.value = value
        self.url_only = url_only
        self.border = border

    def on_mount(self) -> None:
        """Generate QR code on mount."""
        self._generate_qr()

    def watch_value(self, new_value: str) -> None:
        """Regenerate QR when value changes."""
        self._generate_qr()

    def watch_url_only(self, new_url_only: bool) -> None:
        """Regenerate QR when url_only changes."""
        self._generate_qr()

    def watch_border(self, new_border: int) -> None:
        """Regenerate QR when border changes."""
        self._generate_qr()

    def _generate_qr(self) -> None:
        """Generate QR code string from value."""
        self._qr_string = None
        self._error = None
        self._can_fit = True

        if not self.value:
            return

        if self.url_only:
            self._can_fit = False
            return

        try:
            # Check if QR will fit
            module_count = get_qr_module_count(self.value)
            self._can_fit = can_fit_qr_code(module_count, border=self.border)

            if not self._can_fit:
                return

            # Generate and render QR
            matrix = generate_qr_matrix(self.value, border=self.border)
            self._qr_string = render_qr_as_unicode(matrix)

        except Exception as e:
            self._error = str(e)
            self.add_class("-error")

    def compose(self) -> ComposeResult:
        """Compose widget children based on current state."""
        if self._error:
            yield Static(f"Error generating QR: {self._error}", classes="qr-error")
            return

        if not self.value:
            return

        if self._can_fit and self._qr_string:
            # Render QR code with URL below
            yield Static(self._qr_string, classes="qr-image")
            yield Static("or visit:", classes="qr-url-label")
            yield Static(self.value, classes="qr-url")
        else:
            # Fallback to URL-only
            yield Static("Visit this URL to continue:", classes="qr-fallback-label")
            yield Static(self.value, classes="qr-url")

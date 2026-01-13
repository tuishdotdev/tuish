"""PurchaseFlow widget for complete checkout experience."""

from __future__ import annotations

import asyncio
from typing import TYPE_CHECKING

from textual import work
from textual.binding import Binding
from textual.reactive import reactive
from textual.widget import Widget
from textual.widgets import Button, Static

from tuish_textual.messages import PurchaseCancelled, PurchaseComplete, PurchaseError
from tuish_textual.state import PurchaseState
from tuish_textual.utils import format_time_elapsed
from tuish_textual.widgets.qr_code import QrCode

if TYPE_CHECKING:
    from textual.app import ComposeResult
    from tuish import Tuish
    from tuish.models import CheckoutSessionResult, LicenseCheckResult, LicenseDetails


class PurchaseFlow(Widget):
    """Complete checkout experience with QR code and polling.

    This widget guides users through the purchase flow:
    1. IDLE - Shows "Start Purchase" button
    2. CREATING - Creates checkout session and opens browser
    3. WAITING - Shows QR code, polls for completion
    4. SUCCESS - Shows success message, posts PurchaseComplete
    5. ERROR/CANCELLED/TIMEOUT - Shows error, allows retry

    Example:
        ```python
        from tuish import Tuish
        from tuish_textual import PurchaseFlow, PurchaseComplete

        class MyApp(App):
            def compose(self):
                yield PurchaseFlow(tuish=self.tuish, email="user@example.com")

            def on_purchase_complete(self, event: PurchaseComplete) -> None:
                self.notify(f"Licensed: {event.license.id}")
        ```

    Attributes:
        state: Current purchase flow state.
        checkout_url: URL for checkout page (when waiting).
        session_id: Checkout session ID (when waiting).
        error_message: Error message if purchase failed.
        elapsed_seconds: Seconds elapsed while waiting.
    """

    DEFAULT_CSS = """
    PurchaseFlow {
        width: 100%;
        height: auto;
        padding: 1 2;
        border: round $surface-darken-2;
    }

    PurchaseFlow > .purchase-title {
        text-align: center;
        text-style: bold;
        margin-bottom: 1;
    }

    PurchaseFlow > .purchase-subtitle {
        text-align: center;
        color: $text-muted;
        margin-bottom: 1;
    }

    PurchaseFlow > .purchase-status {
        text-align: center;
        margin: 1 0;
    }

    PurchaseFlow > .purchase-timer {
        text-align: center;
        color: $text-muted;
    }

    PurchaseFlow > .purchase-hint {
        text-align: center;
        color: $text-muted;
        margin-top: 1;
    }

    PurchaseFlow > .purchase-button-container {
        width: 100%;
        height: auto;
        align: center middle;
        margin-top: 1;
    }

    PurchaseFlow > .purchase-button-container > Button {
        margin: 0 1;
    }

    PurchaseFlow.-creating {
        border: round $primary;
    }

    PurchaseFlow.-waiting {
        border: round $primary;
    }

    PurchaseFlow.-success {
        border: round $success;
    }

    PurchaseFlow.-error {
        border: round $error;
    }

    PurchaseFlow.-cancelled {
        border: round $warning;
    }

    PurchaseFlow.-timeout {
        border: round $warning;
    }

    PurchaseFlow > .purchase-success {
        color: $success;
        text-style: bold;
        text-align: center;
    }

    PurchaseFlow > .purchase-error {
        color: $error;
        text-align: center;
    }

    PurchaseFlow > .purchase-cancelled {
        color: $warning;
        text-align: center;
    }
    """

    BINDINGS = [
        Binding("escape", "cancel", "Cancel", show=False),
        Binding("r", "retry", "Retry", show=False),
    ]

    state: reactive[PurchaseState] = reactive(PurchaseState.IDLE, recompose=True)
    """Current purchase flow state."""

    checkout_url: reactive[str | None] = reactive(None)
    """URL for checkout page."""

    session_id: reactive[str | None] = reactive(None)
    """Checkout session ID."""

    error_message: reactive[str | None] = reactive(None)
    """Error message if purchase failed."""

    elapsed_seconds: reactive[int] = reactive(0)
    """Seconds elapsed while waiting for checkout."""

    def __init__(
        self,
        tuish: Tuish,
        *,
        email: str | None = None,
        poll_interval: float = 2.0,
        timeout: float = 600.0,
        show_qr_code: bool = True,
        auto_start: bool = False,
        name: str | None = None,
        id: str | None = None,
        classes: str | None = None,
        disabled: bool = False,
    ) -> None:
        """Initialize PurchaseFlow widget.

        Args:
            tuish: Tuish SDK instance for purchase operations.
            email: Pre-fill customer email in checkout.
            poll_interval: Polling interval in seconds (default 2.0).
            timeout: Purchase timeout in seconds (default 600.0 = 10 min).
            show_qr_code: Whether to show QR code for checkout URL.
            auto_start: Automatically start purchase flow on mount.
            name: Widget name.
            id: Widget ID.
            classes: CSS classes.
            disabled: Whether widget is disabled.
        """
        super().__init__(name=name, id=id, classes=classes, disabled=disabled)
        self._tuish = tuish
        self._email = email
        self._poll_interval = poll_interval
        self._timeout = timeout
        self._show_qr_code = show_qr_code
        self._auto_start = auto_start
        self._polling_cancelled = False
        self._timer_task: asyncio.Task[None] | None = None
        self._license: LicenseDetails | None = None

    def on_mount(self) -> None:
        """Handle widget mount."""
        self._update_css_classes()
        if self._auto_start:
            self.start_purchase()

    def watch_state(self, new_state: PurchaseState) -> None:
        """Update CSS classes when state changes."""
        self._update_css_classes()

    def _update_css_classes(self) -> None:
        """Update CSS modifier classes based on current state."""
        self.remove_class(
            "-idle", "-creating", "-waiting", "-success", "-error", "-cancelled", "-timeout"
        )
        self.add_class(f"-{self.state.value}")

    def compose(self) -> ComposeResult:
        """Compose widget content based on current state."""
        if self.state == PurchaseState.IDLE:
            yield from self._compose_idle()
        elif self.state == PurchaseState.CREATING:
            yield from self._compose_creating()
        elif self.state == PurchaseState.WAITING:
            yield from self._compose_waiting()
        elif self.state == PurchaseState.SUCCESS:
            yield from self._compose_success()
        elif self.state == PurchaseState.ERROR:
            yield from self._compose_error()
        elif self.state == PurchaseState.CANCELLED:
            yield from self._compose_cancelled()
        elif self.state == PurchaseState.TIMEOUT:
            yield from self._compose_timeout()

    def _compose_idle(self) -> ComposeResult:
        """Compose idle state UI."""
        yield Static("Purchase License", classes="purchase-title")
        yield Static(
            "Click the button below to start the checkout process.",
            classes="purchase-subtitle",
        )
        with self.container_widget(classes="purchase-button-container"):
            yield Button("Start Purchase", id="start-purchase", variant="primary")

    def _compose_creating(self) -> ComposeResult:
        """Compose creating session state UI."""
        yield Static("Creating Checkout Session", classes="purchase-title")
        yield Static("Please wait...", classes="purchase-status")

    def _compose_waiting(self) -> ComposeResult:
        """Compose waiting for checkout state UI."""
        yield Static("Complete Purchase", classes="purchase-title")
        yield Static(
            "Scan the QR code or visit the URL below to complete your purchase.",
            classes="purchase-subtitle",
        )

        if self._show_qr_code and self.checkout_url:
            yield QrCode(value=self.checkout_url)
        elif self.checkout_url:
            yield Static(f"Checkout URL: {self.checkout_url}", classes="purchase-status")

        yield Static(
            f"Waiting for payment... {format_time_elapsed(self.elapsed_seconds)}",
            classes="purchase-timer",
            id="purchase-timer",
        )
        yield Static("Press Escape to cancel", classes="purchase-hint")

    def _compose_success(self) -> ComposeResult:
        """Compose success state UI."""
        yield Static("\u2713 Purchase Complete!", classes="purchase-success")
        yield Static(
            "Your license has been activated.",
            classes="purchase-subtitle",
        )
        if self._license and self._license.product_name:
            yield Static(
                f"Product: {self._license.product_name}",
                classes="purchase-status",
            )

    def _compose_error(self) -> ComposeResult:
        """Compose error state UI."""
        yield Static("Purchase Failed", classes="purchase-title")
        yield Static(
            self.error_message or "An error occurred during purchase.",
            classes="purchase-error",
        )
        with self.container_widget(classes="purchase-button-container"):
            yield Button("Retry", id="retry-purchase", variant="primary")
            yield Button("Cancel", id="cancel-purchase", variant="default")

    def _compose_cancelled(self) -> ComposeResult:
        """Compose cancelled state UI."""
        yield Static("Purchase Cancelled", classes="purchase-cancelled")
        yield Static(
            "The purchase was cancelled.",
            classes="purchase-subtitle",
        )
        with self.container_widget(classes="purchase-button-container"):
            yield Button("Try Again", id="retry-purchase", variant="primary")

    def _compose_timeout(self) -> ComposeResult:
        """Compose timeout state UI."""
        yield Static("Purchase Timeout", classes="purchase-title")
        yield Static(
            "The checkout session has expired. Please try again.",
            classes="purchase-cancelled",
        )
        with self.container_widget(classes="purchase-button-container"):
            yield Button("Try Again", id="retry-purchase", variant="primary")
            yield Button("Cancel", id="cancel-purchase", variant="default")

    def container_widget(self, classes: str = "") -> Widget:
        """Create a container widget for button layouts.

        Args:
            classes: CSS classes for the container.

        Returns:
            A container widget (Horizontal from textual).
        """
        from textual.containers import Horizontal

        return Horizontal(classes=classes)

    def on_button_pressed(self, event: Button.Pressed) -> None:
        """Handle button press events."""
        button_id = event.button.id

        if button_id == "start-purchase":
            self.start_purchase()
        elif button_id == "retry-purchase":
            self.start_purchase()
        elif button_id == "cancel-purchase":
            self._handle_cancel()

    def action_cancel(self) -> None:
        """Handle Escape key - cancel purchase."""
        if self.state == PurchaseState.WAITING:
            self._polling_cancelled = True
            self.state = PurchaseState.CANCELLED
            self._stop_timer()
            self.post_message(PurchaseCancelled())

    def action_retry(self) -> None:
        """Handle R key - retry purchase."""
        if self.state in (PurchaseState.ERROR, PurchaseState.CANCELLED, PurchaseState.TIMEOUT):
            self.start_purchase()

    def _handle_cancel(self) -> None:
        """Handle cancel action from any state."""
        self._polling_cancelled = True
        self._stop_timer()
        self.state = PurchaseState.IDLE
        self.post_message(PurchaseCancelled())

    def start_purchase(self) -> None:
        """Start the purchase flow.

        Call this method to initiate a new purchase. This will create a checkout
        session and begin polling for completion.
        """
        self._reset_state()
        self.state = PurchaseState.CREATING
        self._create_checkout_session()

    def _reset_state(self) -> None:
        """Reset all state for a new purchase attempt."""
        self._polling_cancelled = False
        self.checkout_url = None
        self.session_id = None
        self.error_message = None
        self.elapsed_seconds = 0
        self._license = None
        self._stop_timer()

    def _stop_timer(self) -> None:
        """Stop the elapsed time timer."""
        if self._timer_task is not None:
            self._timer_task.cancel()
            self._timer_task = None

    @work(exclusive=True)
    async def _create_checkout_session(self) -> None:
        """Create checkout session in background worker."""
        try:
            result = await self._run_create_session()
            self.checkout_url = result.checkout_url
            self.session_id = result.session_id
            self.state = PurchaseState.WAITING
            self._start_timer()
            self._poll_for_completion()
        except Exception as exc:
            self.error_message = str(exc)
            self.state = PurchaseState.ERROR
            self.post_message(PurchaseError(error=str(exc), retryable=True))

    async def _run_create_session(self) -> CheckoutSessionResult:
        """Run checkout session creation in thread.

        Returns:
            CheckoutSessionResult with session_id and checkout_url.
        """
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(
            None,
            lambda: self._tuish.purchase_in_browser(
                email=self._email,
                open_browser=True,
            ),
        )
        return result

    def _start_timer(self) -> None:
        """Start the elapsed time timer."""
        self._timer_task = asyncio.create_task(self._update_timer())

    async def _update_timer(self) -> None:
        """Update elapsed time every second."""
        try:
            while self.state == PurchaseState.WAITING and not self._polling_cancelled:
                await asyncio.sleep(1)
                self.elapsed_seconds += 1
                # Update timer display without recompose
                timer_widget = self.query_one("#purchase-timer", Static)
                timer_widget.update(
                    f"Waiting for payment... {format_time_elapsed(self.elapsed_seconds)}"
                )
        except asyncio.CancelledError:
            pass
        except Exception:
            # Widget may have been removed
            pass

    @work(exclusive=True, thread=True)
    def _poll_for_completion(self) -> None:
        """Poll for checkout completion in background thread."""
        if self.session_id is None:
            return

        try:
            result = self._tuish.wait_for_checkout_complete(
                session_id=self.session_id,
                poll_interval_ms=int(self._poll_interval * 1000),
                timeout_ms=int(self._timeout * 1000),
                on_poll=self._on_poll_callback,
            )

            # Check if cancelled during polling
            if self._polling_cancelled:
                return

            # Update state based on result
            self.app.call_from_thread(self._handle_poll_result, result)

        except Exception as exc:
            if not self._polling_cancelled:
                self.app.call_from_thread(self._handle_poll_error, str(exc))

    def _on_poll_callback(self, status: str) -> None:
        """Callback for each poll iteration.

        Args:
            status: Current checkout status.
        """
        # Can be used to update UI or check for cancellation
        pass

    def _handle_poll_result(self, result: LicenseCheckResult) -> None:
        """Handle polling result on main thread.

        Args:
            result: License check result from polling.
        """
        self._stop_timer()

        if self._polling_cancelled:
            return

        if result.valid and result.license:
            self._license = result.license
            self.state = PurchaseState.SUCCESS
            self.post_message(PurchaseComplete(license=result.license))
        elif result.reason == "network_error":
            # Timeout case
            self.state = PurchaseState.TIMEOUT
            self.post_message(PurchaseError(error="Checkout session timed out", retryable=True))
        else:
            self.error_message = result.reason or "Purchase failed"
            self.state = PurchaseState.ERROR
            self.post_message(PurchaseError(error=self.error_message, retryable=True))

    def _handle_poll_error(self, error: str) -> None:
        """Handle polling error on main thread.

        Args:
            error: Error message.
        """
        self._stop_timer()

        if self._polling_cancelled:
            return

        self.error_message = error
        self.state = PurchaseState.ERROR
        self.post_message(PurchaseError(error=error, retryable=True))

    @property
    def tuish(self) -> Tuish:
        """Get the Tuish SDK instance."""
        return self._tuish

    @property
    def email(self) -> str | None:
        """Get the pre-filled email address."""
        return self._email

    @email.setter
    def email(self, value: str | None) -> None:
        """Set the pre-filled email address."""
        self._email = value

    @property
    def poll_interval(self) -> float:
        """Get the polling interval in seconds."""
        return self._poll_interval

    @property
    def timeout(self) -> float:
        """Get the purchase timeout in seconds."""
        return self._timeout

    @property
    def show_qr_code(self) -> bool:
        """Whether QR code display is enabled."""
        return self._show_qr_code

    @property
    def purchased_license(self) -> LicenseDetails | None:
        """Get the purchased license details (after success)."""
        return self._license

"""OTP-based login flow widget."""

from __future__ import annotations

from typing import TYPE_CHECKING

from textual.app import ComposeResult
from textual.binding import Binding
from textual.containers import Horizontal
from textual.reactive import reactive
from textual.widget import Widget
from textual.widgets import Button, Input, OptionList, Static
from textual.widgets.option_list import Option

from tuish_textual.messages import LoginComplete
from tuish_textual.state import LoginState

if TYPE_CHECKING:
    from tuish import Tuish
    from tuish.models import LicenseDetails


class LoginFlow(Widget):
    """OTP-based authentication flow for returning customers.

    Flow:
    1. Enter email
    2. OTP sent to phone
    3. Enter OTP
    4. Select license from available licenses
    5. License activated

    Args:
        tuish: Tuish SDK instance.

    Example:
        ```python
        yield LoginFlow(tuish=tuish)

        def on_login_complete(self, event: LoginComplete) -> None:
            self.notify(f"Logged in: {event.license.id}")
        ```
    """

    BINDINGS = [
        Binding("escape", "cancel", "Cancel"),
    ]

    DEFAULT_CSS = """
    LoginFlow {
        height: auto;
        width: 100%;
    }

    LoginFlow > .login-header {
        text-style: bold;
        margin-bottom: 1;
    }

    LoginFlow > .login-label {
        color: $text-muted;
        margin-bottom: 1;
    }

    LoginFlow > .login-input {
        width: 100%;
        margin-bottom: 1;
    }

    LoginFlow > .login-hint {
        color: $text-muted;
    }

    LoginFlow > .login-error {
        color: $error;
        margin-top: 1;
    }

    LoginFlow > .login-success {
        color: $success;
        margin-top: 1;
    }

    LoginFlow > .phone-masked {
        color: $primary;
        text-style: bold;
    }

    LoginFlow > .license-list {
        height: auto;
        max-height: 10;
        margin: 1 0;
    }
    """

    # State
    state: reactive[LoginState] = reactive(LoginState.ENTER_EMAIL)
    email: reactive[str] = reactive("")
    otp_id: reactive[str | None] = reactive(None)
    phone_masked: reactive[str | None] = reactive(None)
    available_licenses: reactive[list[LicenseDetails]] = reactive(list)
    error_message: reactive[str | None] = reactive(None)
    selected_license: reactive[LicenseDetails | None] = reactive(None)

    def __init__(
        self,
        tuish: Tuish,
        *,
        name: str | None = None,
        id: str | None = None,
        classes: str | None = None,
    ) -> None:
        """Initialize LoginFlow widget."""
        super().__init__(name=name, id=id, classes=classes)
        self._tuish = tuish

    def action_cancel(self) -> None:
        """Cancel login and return to initial state."""
        self.state = LoginState.ENTER_EMAIL
        self.error_message = None
        self.refresh(recompose=True)

    def on_button_pressed(self, event: Button.Pressed) -> None:
        """Handle button presses."""
        if event.button.id == "retry":
            self.state = LoginState.ENTER_EMAIL
            self.error_message = None
            self.otp_id = None
            self.phone_masked = None
            self.refresh(recompose=True)

    def on_input_submitted(self, event: Input.Submitted) -> None:
        """Handle input submissions."""
        value = event.value.strip()

        if self.state == LoginState.ENTER_EMAIL:
            self._submit_email(value)
        elif self.state == LoginState.ENTER_OTP:
            self._submit_otp(value)

    def _submit_email(self, email: str) -> None:
        """Submit email for OTP request."""
        if not email or "@" not in email:
            self.error_message = "Please enter a valid email address"
            return

        self.email = email
        self.error_message = None
        self.state = LoginState.SENDING_OTP
        self.refresh(recompose=True)

        self.run_worker(self._request_otp_worker, exclusive=True)  # type: ignore[arg-type]

    async def _request_otp_worker(self) -> None:
        """Request OTP in background."""
        import asyncio

        try:
            loop = asyncio.get_running_loop()
            result = await loop.run_in_executor(
                None,
                lambda: self._tuish.client.request_login_otp(self.email),
            )
            self.otp_id = result.otp_id
            self.phone_masked = result.phone_masked
            self.state = LoginState.ENTER_OTP
        except Exception as e:
            self.error_message = str(e)
            self.state = LoginState.ERROR
        finally:
            self.refresh(recompose=True)

    def _submit_otp(self, otp: str) -> None:
        """Submit OTP for verification."""
        if not otp or len(otp) < 4:
            self.error_message = "Please enter the OTP code"
            return

        self.error_message = None
        self.state = LoginState.VERIFYING
        self.refresh(recompose=True)

        self.run_worker(
            lambda: self._verify_otp_worker(otp),  # type: ignore[arg-type]
            exclusive=True,
        )

    async def _verify_otp_worker(self, otp: str) -> None:
        """Verify OTP in background."""
        import asyncio

        if not self.otp_id:
            self.error_message = "OTP session expired"
            self.state = LoginState.ERROR
            self.refresh(recompose=True)
            return

        try:
            loop = asyncio.get_running_loop()
            fingerprint = self._tuish.get_machine_fingerprint()
            otp_id = self.otp_id  # Already checked above
            assert otp_id is not None
            result = await loop.run_in_executor(
                None,
                lambda: self._tuish.client.verify_login(
                    email=self.email,
                    otp_id=otp_id,
                    otp=otp,
                    device_fingerprint=fingerprint,
                ),
            )

            self.available_licenses = result.licenses

            if len(result.licenses) == 1:
                # Auto-select single license
                self._activate_license(result.licenses[0])
            elif len(result.licenses) > 1:
                self.state = LoginState.SELECT_LICENSE
            else:
                self.error_message = "No licenses found for this account"
                self.state = LoginState.ERROR

        except Exception as e:
            self.error_message = str(e)
            self.state = LoginState.ERROR

        finally:
            self.refresh(recompose=True)

    def on_option_list_option_selected(
        self, event: OptionList.OptionSelected
    ) -> None:
        """Handle license selection."""
        if self.state != LoginState.SELECT_LICENSE:
            return

        index = int(event.option.id or "0")
        if 0 <= index < len(self.available_licenses):
            self._activate_license(self.available_licenses[index])

    def _activate_license(self, license: LicenseDetails) -> None:
        """Activate selected license."""
        self.selected_license = license
        self.state = LoginState.SUCCESS
        self.refresh(recompose=True)
        self.post_message(LoginComplete(license=license))

    def compose(self) -> ComposeResult:
        """Compose login flow UI based on state."""
        if self.state == LoginState.ENTER_EMAIL:
            yield from self._compose_enter_email()
        elif self.state == LoginState.SENDING_OTP:
            yield from self._compose_sending_otp()
        elif self.state == LoginState.ENTER_OTP:
            yield from self._compose_enter_otp()
        elif self.state == LoginState.VERIFYING:
            yield from self._compose_verifying()
        elif self.state == LoginState.SELECT_LICENSE:
            yield from self._compose_select_license()
        elif self.state == LoginState.SUCCESS:
            yield from self._compose_success()
        elif self.state == LoginState.ERROR:
            yield from self._compose_error()

    def _compose_enter_email(self) -> ComposeResult:
        """Compose email entry screen."""
        yield Static("Login with Email", classes="login-header")
        yield Static("Enter your email address:", classes="login-label")
        yield Input(placeholder="you@example.com", classes="login-input")

        if self.error_message:
            yield Static(f"x {self.error_message}", classes="login-error")

        yield Static("Press [Enter] to continue", classes="login-hint")

    def _compose_sending_otp(self) -> ComposeResult:
        """Compose OTP sending screen."""
        yield Static("Login with Email", classes="login-header")
        yield Static("Sending verification code...", classes="login-label")

    def _compose_enter_otp(self) -> ComposeResult:
        """Compose OTP entry screen."""
        yield Static("Enter Verification Code", classes="login-header")

        if self.phone_masked:
            yield Static(f"Code sent to {self.phone_masked}", classes="phone-masked")

        yield Input(placeholder="Enter OTP", classes="login-input")

        if self.error_message:
            yield Static(f"x {self.error_message}", classes="login-error")

        yield Static("Press [Enter] to verify, [Esc] to cancel", classes="login-hint")

    def _compose_verifying(self) -> ComposeResult:
        """Compose verification screen."""
        yield Static("Verifying...", classes="login-header")

    def _compose_select_license(self) -> ComposeResult:
        """Compose license selection screen."""
        yield Static("Select a License", classes="login-header")
        yield Static("Choose which license to activate:", classes="login-label")

        options = [
            Option(
                f"{lic.product_name or 'License'} ({lic.status})",
                id=str(i),
            )
            for i, lic in enumerate(self.available_licenses)
        ]

        yield OptionList(*options, classes="license-list")

    def _compose_success(self) -> ComposeResult:
        """Compose success screen."""
        yield Static("+ Login Successful!", classes="login-success")

        if self.selected_license:
            product = self.selected_license.product_name or "License"
            yield Static(f"Activated: {product}", classes="login-label")

    def _compose_error(self) -> ComposeResult:
        """Compose error screen."""
        yield Static("Login Failed", classes="login-header")

        if self.error_message:
            yield Static(f"x {self.error_message}", classes="login-error")

        with Horizontal():
            yield Button("Try Again", id="retry", variant="primary")

    @property
    def tuish(self) -> Tuish:
        """Get the Tuish SDK instance."""
        return self._tuish

"""Complete self-service license management widget."""

from __future__ import annotations

from typing import TYPE_CHECKING

from textual.app import ComposeResult
from textual.binding import Binding
from textual.containers import Container, Horizontal
from textual.reactive import reactive
from textual.widget import Widget
from textual.widgets import Button, Input, OptionList, Static
from textual.widgets.option_list import Option

from tuish_textual.messages import (
    LicenseChanged,
    LoginComplete,
    ManagerExit,
    PurchaseCancelled,
    PurchaseComplete,
)
from tuish_textual.state import ManagerScreen
from tuish_textual.widgets.license_status import LicenseStatus

if TYPE_CHECKING:
    from tuish import Tuish
    from tuish.models import LicenseDetails


class TuishLicenseManager(Widget):
    """Complete self-service license management UI.

    Provides menu navigation for:
    - View license status
    - Purchase new license
    - Enter license key manually
    - Login with email (OTP)
    - Clear stored license

    Args:
        tuish: Tuish SDK instance.
        allow_manual_entry: Allow manual license key entry. Defaults to True.
        allow_login: Show OTP login option. Defaults to True.
        email: Pre-fill email for purchase flow.

    Example:
        ```python
        yield TuishLicenseManager(
            tuish=tuish,
            allow_manual_entry=True,
        )

        def on_manager_exit(self, event: ManagerExit) -> None:
            self.app.exit()
        ```

    Messages:
        ManagerExit: Posted when user exits the manager.
        LicenseChanged: Posted when license state changes.
    """

    BINDINGS = [
        Binding("escape", "back", "Back", show=False),
        Binding("q", "quit", "Quit", show=True),
        Binding("1", "select_option_1", "Option 1", show=False),
        Binding("2", "select_option_2", "Option 2", show=False),
        Binding("3", "select_option_3", "Option 3", show=False),
        Binding("4", "select_option_4", "Option 4", show=False),
        Binding("5", "select_option_5", "Option 5", show=False),
        Binding("6", "select_option_6", "Option 6", show=False),
    ]

    DEFAULT_CSS = """
    TuishLicenseManager {
        height: auto;
        width: 100%;
        padding: 1 2;
    }

    TuishLicenseManager > .manager-title {
        text-style: bold;
        margin-bottom: 1;
    }

    TuishLicenseManager > .manager-subtitle {
        color: $text-muted;
        margin-bottom: 1;
    }

    TuishLicenseManager > .menu-container {
        margin: 1 0;
    }

    TuishLicenseManager OptionList {
        height: auto;
        max-height: 10;
    }

    TuishLicenseManager > .key-input-container {
        margin: 1 0;
    }

    TuishLicenseManager > .key-input-label {
        color: $text-muted;
        margin-bottom: 1;
    }

    TuishLicenseManager .key-input {
        width: 100%;
    }

    TuishLicenseManager > .key-input-hint {
        color: $text-muted;
        margin-top: 1;
    }

    TuishLicenseManager > .key-error {
        color: $error;
        margin-top: 1;
    }

    TuishLicenseManager > .key-success {
        color: $success;
        margin-top: 1;
    }

    TuishLicenseManager > .confirm-container {
        margin: 1 0;
    }

    TuishLicenseManager > .confirm-warning {
        color: $warning;
        text-style: bold;
    }

    TuishLicenseManager > .confirm-text {
        margin: 1 0;
    }

    TuishLicenseManager > .navigation-hint {
        color: $text-muted;
        margin-top: 1;
    }

    TuishLicenseManager > .placeholder-notice {
        color: $text-muted;
        text-style: italic;
        margin: 1 0;
    }

    TuishLicenseManager .confirm-buttons {
        margin-top: 1;
    }

    TuishLicenseManager .confirm-buttons Button {
        margin-right: 1;
    }
    """

    # Configuration
    allow_manual_entry: reactive[bool] = reactive(True)
    allow_login: reactive[bool] = reactive(True)
    email: reactive[str | None] = reactive(None)

    # State
    current_screen: reactive[ManagerScreen] = reactive(ManagerScreen.MENU)
    license: reactive[LicenseDetails | None] = reactive(None)
    is_valid: reactive[bool] = reactive(False)
    key_error: reactive[str | None] = reactive(None)
    key_success: reactive[bool] = reactive(False)

    def __init__(
        self,
        tuish: Tuish,
        *,
        allow_manual_entry: bool = True,
        allow_login: bool = True,
        email: str | None = None,
        name: str | None = None,
        id: str | None = None,
        classes: str | None = None,
    ) -> None:
        """Initialize TuishLicenseManager widget.

        Args:
            tuish: Tuish SDK instance.
            allow_manual_entry: Allow manual license key entry. Defaults to True.
            allow_login: Show OTP login option. Defaults to True.
            email: Pre-fill email for purchase flow.
            name: Widget name for identification.
            id: Widget DOM id.
            classes: CSS classes to apply.
        """
        super().__init__(name=name, id=id, classes=classes)
        self._tuish = tuish
        self.allow_manual_entry = allow_manual_entry
        self.allow_login = allow_login
        self.email = email
        self._menu_options: list[Option] = []

    def on_mount(self) -> None:
        """Check license on mount."""
        self._check_license()

    def _check_license(self) -> None:
        """Check current license state."""
        try:
            result = self._tuish.check_license()
            self.license = result.license
            self.is_valid = result.valid
            self.post_message(
                LicenseChanged(
                    license=result.license,
                    valid=result.valid,
                    offline_verified=result.offline_verified,
                )
            )
        except Exception:
            self.license = None
            self.is_valid = False

    def action_back(self) -> None:
        """Go back to menu or exit."""
        if self.current_screen == ManagerScreen.MENU:
            self.post_message(ManagerExit())
        else:
            self.current_screen = ManagerScreen.MENU
            self.key_error = None
            self.key_success = False
            self.refresh(recompose=True)

    def action_quit(self) -> None:
        """Exit the manager."""
        self.post_message(ManagerExit())

    def _select_menu_option(self, index: int) -> None:
        """Select a menu option by index (0-based).

        Args:
            index: The 0-based index of the option to select.
        """
        if self.current_screen != ManagerScreen.MENU:
            return

        if index < 0 or index >= len(self._menu_options):
            return

        option = self._menu_options[index]
        self._handle_option_selection(option.id)

    def action_select_option_1(self) -> None:
        """Select menu option 1."""
        self._select_menu_option(0)

    def action_select_option_2(self) -> None:
        """Select menu option 2."""
        self._select_menu_option(1)

    def action_select_option_3(self) -> None:
        """Select menu option 3."""
        self._select_menu_option(2)

    def action_select_option_4(self) -> None:
        """Select menu option 4."""
        self._select_menu_option(3)

    def action_select_option_5(self) -> None:
        """Select menu option 5."""
        self._select_menu_option(4)

    def action_select_option_6(self) -> None:
        """Select menu option 6."""
        self._select_menu_option(5)

    def _get_menu_options(self) -> list[Option]:
        """Build menu options based on current state.

        Returns:
            List of OptionList options for the menu.
        """
        options: list[Option] = [
            Option("[1] View License Status", id="status"),
        ]

        option_num = 2

        if not self.is_valid:
            options.append(Option(f"[{option_num}] Purchase License", id="purchase"))
            option_num += 1

        if self.allow_manual_entry:
            options.append(Option(f"[{option_num}] Enter License Key", id="enter_key"))
            option_num += 1

        if self.allow_login:
            options.append(Option(f"[{option_num}] Login with Email", id="login"))
            option_num += 1

        if self.license:
            options.append(Option(f"[{option_num}] Clear License", id="clear"))
            option_num += 1

        options.append(Option(f"[{option_num}] Exit", id="exit"))

        self._menu_options = options
        return options

    def _handle_option_selection(self, option_id: str | None) -> None:
        """Handle menu option selection by ID.

        Args:
            option_id: The ID of the selected option.
        """
        if option_id == "status":
            self.current_screen = ManagerScreen.STATUS
        elif option_id == "purchase":
            self.current_screen = ManagerScreen.PURCHASE
        elif option_id == "enter_key":
            self.current_screen = ManagerScreen.ENTER_KEY
            self.key_error = None
            self.key_success = False
        elif option_id == "login":
            self.current_screen = ManagerScreen.LOGIN
        elif option_id == "clear":
            self.current_screen = ManagerScreen.CONFIRM_CLEAR
        elif option_id == "exit":
            self.post_message(ManagerExit())
            return

        self.refresh(recompose=True)

    def on_option_list_option_selected(
        self, event: OptionList.OptionSelected
    ) -> None:
        """Handle menu option selection via OptionList."""
        self._handle_option_selection(event.option.id)

    def on_input_submitted(self, event: Input.Submitted) -> None:
        """Handle license key submission."""
        if self.current_screen != ManagerScreen.ENTER_KEY:
            return

        key_value = event.value.strip()
        if not key_value:
            self.key_error = "Please enter a license key"
            self.refresh(recompose=True)
            return

        try:
            # Extract and validate the license key
            info = self._tuish.extract_license_info(key_value)
            if not info:
                self.key_error = "Invalid license key format"
                self.refresh(recompose=True)
                return

            # Store the license
            self._tuish.store_license(key_value)

            # Refresh and verify
            self._check_license()

            self.key_success = True
            self.key_error = None
            self.refresh(recompose=True)

            # Return to menu after delay
            self.set_timer(2.0, self._return_to_menu)

        except Exception as e:
            self.key_error = str(e)
            self.key_success = False
            self.refresh(recompose=True)

    def _return_to_menu(self) -> None:
        """Return to menu screen."""
        self.current_screen = ManagerScreen.MENU
        self.key_success = False
        self.refresh(recompose=True)

    def on_button_pressed(self, event: Button.Pressed) -> None:
        """Handle confirmation buttons."""
        if self.current_screen == ManagerScreen.CONFIRM_CLEAR:
            if event.button.id == "confirm_yes":
                self._tuish.clear_license()
                self._check_license()
            self.current_screen = ManagerScreen.MENU
            self.refresh(recompose=True)

    def on_purchase_complete(self, event: PurchaseComplete) -> None:
        """Handle purchase completion from PurchaseFlow."""
        self.license = event.license
        self.is_valid = True
        self.set_timer(2.0, self._return_to_menu)

    def on_purchase_cancelled(self, event: PurchaseCancelled) -> None:
        """Handle purchase cancellation from PurchaseFlow."""
        self.current_screen = ManagerScreen.MENU
        self.refresh(recompose=True)

    def on_login_complete(self, event: LoginComplete) -> None:
        """Handle login completion from LoginFlow."""
        self.license = event.license
        self.is_valid = True
        self.set_timer(2.0, self._return_to_menu)

    def compose(self) -> ComposeResult:
        """Compose manager UI based on current screen."""
        if self.current_screen == ManagerScreen.MENU:
            yield from self._compose_menu()
        elif self.current_screen == ManagerScreen.STATUS:
            yield from self._compose_status()
        elif self.current_screen == ManagerScreen.PURCHASE:
            yield from self._compose_purchase()
        elif self.current_screen == ManagerScreen.ENTER_KEY:
            yield from self._compose_enter_key()
        elif self.current_screen == ManagerScreen.LOGIN:
            yield from self._compose_login()
        elif self.current_screen == ManagerScreen.CONFIRM_CLEAR:
            yield from self._compose_confirm_clear()

    def _compose_menu(self) -> ComposeResult:
        """Compose main menu screen."""
        yield Static("License Manager", classes="manager-title")

        if self.license:
            status_char = "\u2713" if self.is_valid else "\u2717"
            product = self.license.product_name or "Licensed"
            yield Static(f"Current: {status_char} {product}", classes="manager-subtitle")

        with Container(classes="menu-container"):
            yield OptionList(*self._get_menu_options())

        yield Static("Press [q] to exit, or number key to select", classes="navigation-hint")

    def _compose_status(self) -> ComposeResult:
        """Compose status screen."""
        yield Static("License Status", classes="manager-title")
        yield LicenseStatus(tuish=self._tuish)
        yield Static("Press [Esc] to go back", classes="navigation-hint")

    def _compose_purchase(self) -> ComposeResult:
        """Compose purchase screen."""
        yield Static("Purchase License", classes="manager-title")

        # Try to import PurchaseFlow - show placeholder if not available
        try:
            from tuish_textual.widgets.purchase_flow import PurchaseFlow

            yield PurchaseFlow(tuish=self._tuish, email=self.email)
        except ImportError:
            yield Static(
                "PurchaseFlow widget not yet implemented.",
                classes="placeholder-notice",
            )
            yield Static("Press [Esc] to go back", classes="navigation-hint")

    def _compose_enter_key(self) -> ComposeResult:
        """Compose manual key entry screen."""
        yield Static("Enter License Key", classes="manager-title")
        yield Static("Paste your license key below:", classes="key-input-label")

        with Container(classes="key-input-container"):
            yield Input(
                placeholder="TUISH-XXXX-XXXX-XXXX...",
                classes="key-input",
            )

        if self.key_error:
            yield Static(f"\u2717 {self.key_error}", classes="key-error")

        if self.key_success:
            yield Static("\u2713 License activated successfully!", classes="key-success")

        yield Static(
            "Press [Enter] to submit, [Esc] to cancel",
            classes="key-input-hint",
        )

    def _compose_login(self) -> ComposeResult:
        """Compose login screen."""
        yield Static("Login with Email", classes="manager-title")

        # Try to import LoginFlow - show placeholder if not available
        try:
            from tuish_textual.widgets.login_flow import LoginFlow

            yield LoginFlow(tuish=self._tuish)
        except ImportError:
            yield Static(
                "LoginFlow widget not yet implemented.",
                classes="placeholder-notice",
            )
            yield Static("Press [Esc] to go back", classes="navigation-hint")

    def _compose_confirm_clear(self) -> ComposeResult:
        """Compose clear confirmation screen."""
        yield Static("Clear License?", classes="confirm-warning")
        yield Static(
            "This will remove your license from this device.",
            classes="confirm-text",
        )
        yield Static(
            "You can re-enter it later if needed.",
            classes="manager-subtitle",
        )

        with Horizontal(classes="confirm-buttons"):
            yield Button("No, keep license", id="confirm_no", variant="primary")
            yield Button("Yes, clear license", id="confirm_yes", variant="error")

    @property
    def tuish(self) -> Tuish:
        """Get the Tuish SDK instance."""
        return self._tuish

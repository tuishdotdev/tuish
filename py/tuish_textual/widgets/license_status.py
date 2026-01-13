"""LicenseStatus widget for displaying license information."""

from __future__ import annotations

from typing import TYPE_CHECKING

from rich.text import Text
from textual import work
from textual.reactive import reactive
from textual.widget import Widget

from tuish_textual.messages import LicenseCheckComplete, LicenseCheckStarted
from tuish_textual.utils import format_expiry_date

if TYPE_CHECKING:
    from tuish import Tuish
    from tuish.models import LicenseCheckResult, LicenseDetails


class LicenseStatus(Widget):
    """Displays current license status, features, and expiry.

    This widget shows the license state with appropriate visual indicators.
    It automatically checks the license on mount if `auto_check` is True.

    Args:
        tuish: The Tuish SDK instance.
        compact: Show single-line compact view. Defaults to False.
        show_features: Display feature list. Defaults to True.
        show_expiry: Display expiry date. Defaults to True.
        auto_check: Automatically check license on mount. Defaults to True.
        name: Widget name for identification.
        id: Widget DOM id.
        classes: CSS classes to apply.
        disabled: Whether widget is disabled.

    Example:
        ```python
        from tuish import Tuish
        from tuish_textual import LicenseStatus

        tuish = Tuish(product_id="prod_xxx", public_key="...")

        # In your app's compose():
        yield LicenseStatus(tuish=tuish)
        yield LicenseStatus(tuish=tuish, compact=True)
        yield LicenseStatus(tuish=tuish, show_features=False)
        ```

    Messages:
        LicenseCheckStarted: Posted when license check begins.
        LicenseCheckComplete: Posted when license check finishes.
    """

    DEFAULT_CSS = """
    LicenseStatus {
        padding: 1 2;
        border: round $surface-darken-2;
        width: auto;
        height: auto;
    }

    LicenseStatus.-valid {
        border: round $success;
    }

    LicenseStatus.-expired {
        border: round $error;
    }

    LicenseStatus.-revoked {
        border: round $error;
    }

    LicenseStatus.-loading {
        border: round $primary;
    }

    LicenseStatus.-error {
        border: round $error;
    }

    LicenseStatus.-no-license {
        border: round $warning;
    }

    LicenseStatus.-compact {
        padding: 0 1;
        border: none;
    }
    """

    license: reactive[LicenseDetails | None] = reactive(None)
    """Current license details, or None if no license."""

    is_loading: reactive[bool] = reactive(False)
    """Whether a license check is in progress."""

    error: reactive[str | None] = reactive(None)
    """Error message if the last check failed."""

    is_valid: reactive[bool] = reactive(False)
    """Whether the current license is valid."""

    offline_verified: reactive[bool] = reactive(False)
    """Whether the license was verified offline."""

    def __init__(
        self,
        tuish: Tuish,
        *,
        compact: bool = False,
        show_features: bool = True,
        show_expiry: bool = True,
        auto_check: bool = True,
        name: str | None = None,
        id: str | None = None,
        classes: str | None = None,
        disabled: bool = False,
    ) -> None:
        """Initialize LicenseStatus widget."""
        super().__init__(name=name, id=id, classes=classes, disabled=disabled)
        self._tuish = tuish
        self._compact = compact
        self._show_features = show_features
        self._show_expiry = show_expiry
        self._auto_check = auto_check

    def on_mount(self) -> None:
        """Handle widget mount - trigger auto check if enabled."""
        self._update_css_classes()
        if self._auto_check:
            self.check_license()

    def _watch_license(self, license: LicenseDetails | None) -> None:
        """Update CSS classes when license changes."""
        self._update_css_classes()

    def _watch_is_loading(self, is_loading: bool) -> None:
        """Update CSS classes when loading state changes."""
        self._update_css_classes()

    def _watch_error(self, error: str | None) -> None:
        """Update CSS classes when error state changes."""
        self._update_css_classes()

    def _watch_is_valid(self, is_valid: bool) -> None:
        """Update CSS classes when validity changes."""
        self._update_css_classes()

    def _update_css_classes(self) -> None:
        """Update CSS modifier classes based on current state."""
        self.remove_class(
            "-valid", "-expired", "-revoked", "-loading", "-error", "-no-license", "-compact"
        )

        if self._compact:
            self.add_class("-compact")

        if self.is_loading:
            self.add_class("-loading")
        elif self.error:
            self.add_class("-error")
        elif self.license is None:
            self.add_class("-no-license")
        elif self.license.status == "active" and self.is_valid:
            self.add_class("-valid")
        elif self.license.status == "expired":
            self.add_class("-expired")
        elif self.license.status == "revoked":
            self.add_class("-revoked")
        else:
            self.add_class("-expired")

    @work(exclusive=True)
    async def check_license(self, offline_only: bool = False) -> None:
        """Check license status asynchronously.

        This method runs in a background worker to avoid blocking the UI.

        Args:
            offline_only: Only perform offline verification. Defaults to False.
        """
        self.is_loading = True
        self.error = None
        self.post_message(LicenseCheckStarted(offline_only=offline_only))

        result: LicenseCheckResult | None = None
        try:
            result = await self._run_license_check()
            self._apply_result(result)
        except Exception as exc:
            self.error = str(exc)
            self.is_valid = False
            self.license = None
        finally:
            self.is_loading = False
            if result is not None:
                self.post_message(LicenseCheckComplete(result=result))

    async def _run_license_check(self) -> LicenseCheckResult:
        """Run the synchronous license check in a thread.

        Returns:
            The license check result from the SDK.
        """
        import asyncio

        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self._tuish.check_license)

    def _apply_result(self, result: LicenseCheckResult) -> None:
        """Apply license check result to reactive state.

        Args:
            result: The license check result from SDK.
        """
        self.license = result.license
        self.is_valid = result.valid
        self.offline_verified = result.offline_verified
        if not result.valid and result.reason:
            self.error = result.reason

    def render(self) -> Text:
        """Render the license status display.

        Returns:
            Rich Text object for terminal display.
        """
        if self.is_loading:
            return self._render_loading()
        if self.error and self.license is None:
            return self._render_error()
        if self.license is None:
            return self._render_no_license()
        if self._compact:
            return self._render_compact()
        return self._render_full()

    def _render_loading(self) -> Text:
        """Render loading state."""
        return Text("Checking license...", style="dim")

    def _render_error(self) -> Text:
        """Render error state."""
        text = Text()
        text.append("! ", style="bold red")
        text.append("Error: ", style="red")
        text.append(self.error or "Unknown error", style="red")
        return text

    def _render_no_license(self) -> Text:
        """Render no license state."""
        text = Text()
        text.append("! ", style="bold yellow")
        text.append("No license", style="yellow")
        return text

    def _render_compact(self) -> Text:
        """Render compact single-line view."""
        if self.license is None:
            return self._render_no_license()

        text = Text()

        status_char = "\u2713" if self.is_valid else "\u2717"
        status_style = "green" if self.is_valid else "red"
        text.append(status_char, style=f"bold {status_style}")
        text.append(" ")

        product_name = self.license.product_name or "Licensed"
        text.append(product_name)

        feature_count = len(self.license.features)
        text.append(f" \u2022 {feature_count} feature")
        if feature_count != 1:
            text.append("s")

        if self.offline_verified:
            text.append(" (offline)", style="dim")

        return text

    def _render_full(self) -> Text:
        """Render full multi-line view."""
        if self.license is None:
            return self._render_no_license()

        lines: list[Text] = []

        header = Text()
        status_char = "\u2713" if self.is_valid else "\u2717"
        status_style = "green" if self.is_valid else "red"
        header.append(status_char, style=f"bold {status_style}")
        header.append(" ")
        product_name = self.license.product_name or "License"
        header.append(product_name, style="bold")
        if self.offline_verified:
            header.append(" (offline)", style="dim")
        lines.append(header)

        status_line = Text()
        status_line.append("Status: ", style="dim")
        license_status = self.license.status
        status_color = "green" if license_status == "active" else "red"
        status_line.append(license_status, style=status_color)
        lines.append(status_line)

        if self._show_features and self.license.features:
            features_header = Text("Features:", style="dim")
            lines.append(features_header)
            for feature in self.license.features:
                feature_line = Text()
                feature_line.append("  \u2022 ")
                feature_line.append(feature)
                lines.append(feature_line)

        if self._show_expiry:
            expiry_line = Text()
            expiry_line.append("Expires: ", style="dim")
            expiry_date = format_expiry_date(self.license.expires_at)
            lines.append(expiry_line.append(expiry_date))

        result = Text()
        for i, line in enumerate(lines):
            result.append_text(line)
            if i < len(lines) - 1:
                result.append("\n")

        return result

    @property
    def tuish(self) -> Tuish:
        """Get the Tuish SDK instance."""
        return self._tuish

    @property
    def compact(self) -> bool:
        """Whether compact mode is enabled."""
        return self._compact

    @compact.setter
    def compact(self, value: bool) -> None:
        """Set compact mode."""
        self._compact = value
        self._update_css_classes()
        self.refresh()

    @property
    def show_features(self) -> bool:
        """Whether features are shown."""
        return self._show_features

    @show_features.setter
    def show_features(self, value: bool) -> None:
        """Set whether to show features."""
        self._show_features = value
        self.refresh()

    @property
    def show_expiry(self) -> bool:
        """Whether expiry is shown."""
        return self._show_expiry

    @show_expiry.setter
    def show_expiry(self, value: bool) -> None:
        """Set whether to show expiry."""
        self._show_expiry = value
        self.refresh()

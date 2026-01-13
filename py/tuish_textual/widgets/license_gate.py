"""LicenseGate widget for conditional rendering based on license status."""

from __future__ import annotations

from collections.abc import Sequence
from typing import TYPE_CHECKING

from textual import work
from textual.reactive import reactive
from textual.widget import Widget
from textual.widgets import LoadingIndicator, Static

from tuish_textual.messages import LicenseChanged, LicenseCheckComplete, LicenseCheckStarted

if TYPE_CHECKING:
    from textual.app import ComposeResult
    from tuish import Tuish
    from tuish.models import LicenseCheckResult


class LicenseGate(Widget):
    """Conditionally renders children based on license status or feature availability.

    This widget checks the license on mount and renders different content based
    on the result:
    - While checking: shows loading content
    - When access granted: shows children
    - When access denied: shows fallback content

    Example:
        ```python
        # Gate by feature
        yield LicenseGate(
            tuish=tuish,
            feature="pro",
            fallback=UpgradePrompt(),
            children=[ProFeatureWidget()],
        )

        # Gate by any valid license
        yield LicenseGate(
            tuish=tuish,
            require_license=True,
            fallback=PurchaseFlow(tuish=tuish),
            children=[PaidContent()],
        )
        ```

    Attributes:
        feature: Specific feature flag to check for access. If None, just checks
            for a valid license (when require_license=True).
        require_license: Whether any valid license is required. Only used when
            feature is None. Defaults to True.
        is_loading: Whether a license check is in progress.
        has_access: Whether access has been granted based on license check.
    """

    DEFAULT_CSS = """
    LicenseGate {
        width: 100%;
        height: auto;
    }

    LicenseGate > .license-gate-loading {
        width: 100%;
        height: 3;
        content-align: center middle;
    }

    LicenseGate > .license-gate-message {
        width: 100%;
        text-align: center;
        color: $text-muted;
    }
    """

    is_loading: reactive[bool] = reactive(True, recompose=True)
    """Whether a license check is currently in progress."""

    has_access: reactive[bool] = reactive(False, recompose=True)
    """Whether access has been granted based on the license check."""

    def __init__(
        self,
        tuish: Tuish,
        *,
        feature: str | None = None,
        require_license: bool = True,
        children: Sequence[Widget] | None = None,
        fallback: Widget | Sequence[Widget] | None = None,
        loading: Widget | None = None,
        name: str | None = None,
        id: str | None = None,
        classes: str | None = None,
        disabled: bool = False,
    ) -> None:
        """Initialize the LicenseGate widget.

        Args:
            tuish: Tuish SDK instance for license checking.
            feature: Specific feature flag to check for access. If provided,
                access is granted only if the license includes this feature.
            require_license: Whether any valid license is required when no
                feature is specified. Defaults to True.
            children: Widgets to display when access is granted.
            fallback: Widget(s) to display when access is denied.
            loading: Widget to display while checking license.
            name: The name of the widget.
            id: The ID of the widget in the DOM.
            classes: Space-separated CSS class names.
            disabled: Whether the widget is disabled.
        """
        super().__init__(name=name, id=id, classes=classes, disabled=disabled)
        self._tuish = tuish
        self._feature = feature
        self._require_license = require_license

        # Store content widgets
        self._children: list[Widget] = list(children) if children else []
        self._fallback: list[Widget] = (
            [fallback] if isinstance(fallback, Widget) else list(fallback) if fallback else []
        )
        self._loading_widget = loading

        # Store the last license check result
        self._license_result: LicenseCheckResult | None = None

    @property
    def feature(self) -> str | None:
        """The feature flag to check for access."""
        return self._feature

    @property
    def require_license(self) -> bool:
        """Whether any valid license is required."""
        return self._require_license

    @property
    def license_result(self) -> LicenseCheckResult | None:
        """The result of the last license check."""
        return self._license_result

    def compose(self) -> ComposeResult:
        """Compose the widget content based on current state."""
        if self.is_loading:
            if self._loading_widget is not None:
                yield self._loading_widget
            else:
                yield LoadingIndicator(classes="license-gate-loading")
                yield Static("Checking license...", classes="license-gate-message")
        elif self.has_access:
            yield from self._children
        else:
            if self._fallback:
                yield from self._fallback
            else:
                yield Static("Access denied", classes="license-gate-message")

    def on_mount(self) -> None:
        """Start license check when widget is mounted."""
        self._check_license()

    @work(thread=True)
    def _check_license(self) -> None:
        """Check license in a background thread.

        Posts LicenseCheckStarted before checking and LicenseCheckComplete
        when done. Also posts LicenseChanged to notify parent widgets.
        """
        # Post that we're starting the check
        self.post_message(LicenseCheckStarted())

        # Perform the license check (this can be slow, runs in thread)
        result = self._tuish.check_license()
        self._license_result = result

        # Determine access based on feature or license requirement
        has_access = self._determine_access(result)

        # Update reactive properties (must be done on main thread via call_from_thread)
        self.app.call_from_thread(self._update_state, has_access, result)

    def _update_state(self, has_access: bool, result: LicenseCheckResult) -> None:
        """Update widget state after license check completes.

        Args:
            has_access: Whether access should be granted.
            result: The license check result.
        """
        self.has_access = has_access
        self.is_loading = False

        # Post completion messages
        self.post_message(LicenseCheckComplete(result=result))
        self.post_message(
            LicenseChanged(
                license=result.license,
                valid=result.valid,
                offline_verified=result.offline_verified,
            )
        )

    def _determine_access(self, result: LicenseCheckResult) -> bool:
        """Determine if access should be granted based on the license check result.

        Args:
            result: The license check result.

        Returns:
            True if access should be granted, False otherwise.
        """
        if self._feature is not None:
            # Feature-based gating: check if license has the specific feature
            if not result.valid or result.license is None:
                return False
            return self._feature in result.license.features

        if self._require_license:
            # Any valid license required
            return result.valid

        # No gating specified, allow access
        return True

    def recheck_license(self) -> None:
        """Trigger a re-check of the license.

        Call this method to refresh the license status, for example after
        a purchase is completed.
        """
        self.is_loading = True
        self.has_access = False
        self._check_license()

"""HTTP client for Tuish API."""

from __future__ import annotations

from typing import Any, TypeVar, cast

import httpx
from pydantic import BaseModel

from tuish.exceptions import TuishApiError
from tuish.models import (
    CheckoutSessionResult,
    CheckoutStatus,
    LoginResult,
    OtpRequestResult,
    PurchaseConfirmResult,
    PurchaseInitResult,
    ValidateLicenseResult,
)

DEFAULT_API_URL = "https://tuish-api-production.doug-lance.workers.dev"
DEFAULT_TIMEOUT = 30.0  # seconds

T = TypeVar("T", bound=BaseModel)


def _camel_to_snake(name: str) -> str:
    """Convert camelCase to snake_case."""
    import re
    s1 = re.sub("(.)([A-Z][a-z]+)", r"\1_\2", name)
    return re.sub("([a-z0-9])([A-Z])", r"\1_\2", s1).lower()


def _snake_to_camel(name: str) -> str:
    """Convert snake_case to camelCase."""
    components = name.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


def _convert_keys_to_snake(data: Any) -> Any:
    """Recursively convert dict keys from camelCase to snake_case."""
    if isinstance(data, dict):
        return {_camel_to_snake(k): _convert_keys_to_snake(v) for k, v in data.items()}
    if isinstance(data, list):
        return [_convert_keys_to_snake(item) for item in data]
    return data


def _convert_keys_to_camel(data: Any) -> Any:
    """Recursively convert dict keys from snake_case to camelCase."""
    if isinstance(data, dict):
        return {_snake_to_camel(k): _convert_keys_to_camel(v) for k, v in data.items()}
    if isinstance(data, list):
        return [_convert_keys_to_camel(item) for item in data]
    return data


class TuishClient:
    """HTTP client for Tuish API."""

    def __init__(
        self,
        api_base_url: str | None = None,
        api_key: str | None = None,
        debug: bool = False,
        timeout: float = DEFAULT_TIMEOUT,
    ):
        self._base_url = (api_base_url or DEFAULT_API_URL).rstrip("/")
        self._api_key = api_key
        self._identity_token: str | None = None
        self._debug = debug
        self._timeout = timeout
        self._client = httpx.Client(timeout=timeout)

    def close(self) -> None:
        """Close the HTTP client."""
        self._client.close()

    def __enter__(self) -> TuishClient:
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()

    def set_identity_token(self, token: str) -> None:
        """Set identity token for authenticated requests."""
        self._identity_token = token

    def clear_identity_token(self) -> None:
        """Clear identity token."""
        self._identity_token = None

    def _request(
        self,
        method: str,
        path: str,
        body: dict[str, Any] | None = None,
        use_api_key: bool = False,
        use_identity_token: bool = False,
        response_model: type[T] | None = None,
    ) -> T | dict[str, Any]:
        """Make an HTTP request to the API."""
        url = f"{self._base_url}{path}"

        headers: dict[str, str] = {
            "Content-Type": "application/json",
        }

        if use_api_key and self._api_key:
            headers["X-API-Key"] = self._api_key

        if use_identity_token and self._identity_token:
            headers["Authorization"] = f"Bearer {self._identity_token}"

        if self._debug:
            print(f"[tuish] {method} {url}")

        # Convert snake_case to camelCase for request body
        json_body = _convert_keys_to_camel(body) if body else None

        response = self._client.request(
            method=method,
            url=url,
            json=json_body,
            headers=headers,
        )

        # Parse response
        try:
            data = response.json()
        except Exception as e:
            raise TuishApiError(
                f"Invalid JSON response: {response.text[:100]}",
                status_code=response.status_code,
            ) from e

        # Handle errors
        if not response.is_success:
            error_data = data.get("error", {})
            msg = error_data.get("message", f"Request failed: {response.status_code}")
            raise TuishApiError(
                message=msg,
                status_code=response.status_code,
                code=error_data.get("code"),
            )

        # Convert camelCase to snake_case
        data = _convert_keys_to_snake(data)

        # Parse into model if provided
        if response_model:
            return response_model.model_validate(data)

        return cast(dict[str, Any], data)

    # ============ Checkout API ============

    def create_checkout_session(
        self,
        product_id: str,
        email: str | None = None,
        success_url: str | None = None,
        cancel_url: str | None = None,
    ) -> CheckoutSessionResult:
        """Create a browser checkout session."""
        body: dict[str, Any] = {"product_id": product_id}
        if email:
            body["email"] = email
        if success_url:
            body["success_url"] = success_url
        if cancel_url:
            body["cancel_url"] = cancel_url

        return cast(
            CheckoutSessionResult,
            self._request(
                "POST",
                "/v1/checkout/init",
                body=body,
                use_api_key=True,
                response_model=CheckoutSessionResult,
            ),
        )

    def get_checkout_status(self, session_id: str) -> CheckoutStatus:
        """Check checkout session status."""
        return cast(
            CheckoutStatus,
            self._request(
                "GET",
                f"/v1/checkout/status/{session_id}",
                response_model=CheckoutStatus,
            ),
        )

    # ============ Auth API ============

    def request_login_otp(self, email: str) -> OtpRequestResult:
        """Request OTP for login."""
        return cast(
            OtpRequestResult,
            self._request(
                "POST",
                "/v1/auth/login/init",
                body={"email": email},
                response_model=OtpRequestResult,
            ),
        )

    def verify_login(
        self,
        email: str,
        otp_id: str,
        otp: str,
        device_fingerprint: str,
    ) -> LoginResult:
        """Verify OTP and login."""
        result = cast(
            LoginResult,
            self._request(
                "POST",
                "/v1/auth/login/verify",
                body={
                    "email": email,
                    "otp_id": otp_id,
                    "otp": otp,
                    "device_fingerprint": device_fingerprint,
                },
                response_model=LoginResult,
            ),
        )
        self._identity_token = result.identity_token
        return result

    # ============ Purchase API ============

    def init_purchase(self, product_id: str) -> PurchaseInitResult:
        """Initialize terminal purchase."""
        return cast(
            PurchaseInitResult,
            self._request(
                "POST",
                "/v1/purchase/init",
                body={"product_id": product_id},
                use_identity_token=True,
                response_model=PurchaseInitResult,
            ),
        )

    def request_purchase_otp(self) -> dict[str, Any]:
        """Request OTP for purchase confirmation."""
        result = self._request(
            "POST",
            "/v1/purchase/otp",
            use_identity_token=True,
        )
        return dict(result) if isinstance(result, dict) else {}

    def confirm_purchase(
        self,
        product_id: str,
        card_id: str,
        otp_id: str,
        otp: str,
    ) -> PurchaseConfirmResult:
        """Confirm purchase with OTP."""
        return cast(
            PurchaseConfirmResult,
            self._request(
                "POST",
                "/v1/purchase/confirm",
                body={
                    "product_id": product_id,
                    "card_id": card_id,
                    "otp_id": otp_id,
                    "otp": otp,
                },
                use_identity_token=True,
                response_model=PurchaseConfirmResult,
            ),
        )

    # ============ License API ============

    def validate_license(
        self,
        license_key: str,
        machine_fingerprint: str,
    ) -> ValidateLicenseResult:
        """Validate license online."""
        return cast(
            ValidateLicenseResult,
            self._request(
                "POST",
                "/v1/licenses/validate",
                body={
                    "license_key": license_key,
                    "machine_fingerprint": machine_fingerprint,
                },
                use_api_key=True,
                response_model=ValidateLicenseResult,
            ),
        )

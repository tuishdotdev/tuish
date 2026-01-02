"""Pydantic models for Tuish SDK."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

# ============ License Token Structure ============

class LicenseHeader(BaseModel):
    """License token header (always ed25519, version 1)."""

    alg: Literal["ed25519"] = "ed25519"
    ver: Literal[1] = 1


class LicensePayload(BaseModel):
    """License token payload - decoded from license string."""

    lid: str = Field(..., description="License ID")
    pid: str = Field(..., description="Product ID")
    cid: str = Field(..., description="Customer ID")
    did: str = Field(..., description="Developer ID")
    features: list[str] = Field(default_factory=list, description="Feature flags")
    iat: int = Field(..., description="Issued at (Unix timestamp ms)")
    exp: int | None = Field(None, description="Expires at (Unix timestamp ms, null = perpetual)")
    mid: str = Field(..., description="Machine ID hash (for binding)")


class SignedLicense(BaseModel):
    """Parsed license with all components."""

    header: LicenseHeader
    payload: LicensePayload
    signature: str  # Base64url encoded


# ============ SDK Configuration ============

class TuishConfig(BaseModel):
    """SDK configuration options."""

    product_id: str = Field(..., description="Product ID for this application")
    public_key: str = Field(..., description="Ed25519 public key (SPKI base64 or hex)")
    api_base_url: str = Field(
        default="https://tuish-api-production.doug-lance.workers.dev",
        description="API base URL",
    )
    api_key: str | None = Field(None, description="API key for authenticated requests")
    storage_dir: str | None = Field(None, description="Custom storage directory")
    debug: bool = Field(default=False, description="Enable debug logging")

    @field_validator("public_key")
    @classmethod
    def validate_public_key(cls, v: str) -> str:
        """Validate public key format (SPKI base64 or 64-char hex)."""
        # SPKI base64 format starts with MCow (Ed25519)
        if v.startswith("MCow") or v.startswith("MCoq"):
            return v
        # Hex format: 64 characters (32 bytes)
        if len(v) == 64 and all(c in "0123456789abcdefABCDEF" for c in v):
            return v.lower()
        raise ValueError(
            "Invalid public key format. Expected SPKI base64 (MCow...) or 64-character hex"
        )


# ============ License Check Results ============

LicenseInvalidReason = Literal[
    "not_found",
    "expired",
    "revoked",
    "invalid_format",
    "invalid_signature",
    "machine_mismatch",
    "network_error",
]

LicenseStatus = Literal["active", "expired", "revoked"]


class LicenseDetails(BaseModel):
    """License information."""

    id: str
    product_id: str
    product_name: str | None = None
    features: list[str] = Field(default_factory=list)
    status: LicenseStatus
    issued_at: int  # Unix timestamp ms
    expires_at: int | None = None  # Unix timestamp ms, null = perpetual


class LicenseCheckResult(BaseModel):
    """Result of license verification."""

    valid: bool
    license: LicenseDetails | None = None
    reason: LicenseInvalidReason | None = None
    offline_verified: bool


# ============ Cached License ============

class CachedLicenseData(BaseModel):
    """License data stored on disk."""

    license_key: str
    cached_at: int  # Unix timestamp ms
    refresh_at: int  # Unix timestamp ms
    product_id: str
    machine_fingerprint: str


# ============ API Response Types ============

class CheckoutSessionResult(BaseModel):
    """Browser checkout session."""

    session_id: str
    checkout_url: str


class CheckoutStatus(BaseModel):
    """Checkout polling response."""

    status: Literal["pending", "complete", "expired"]
    license_key: str | None = None
    license: LicenseDetails | None = None


class ValidateLicenseResult(BaseModel):
    """Online license validation response."""

    valid: bool
    license: LicenseDetails | None = None
    reason: str | None = None


class OtpRequestResult(BaseModel):
    """OTP request response."""

    otp_id: str
    phone_masked: str
    expires_in: int  # seconds


class LoginResult(BaseModel):
    """Login verification response."""

    identity_token: str
    licenses: list[LicenseDetails] = Field(default_factory=list)


class SavedCard(BaseModel):
    """Saved payment card."""

    id: str
    brand: str
    last4: str
    expiry_month: int
    expiry_year: int


class PurchaseInitResult(BaseModel):
    """Terminal purchase initialization."""

    cards: list[SavedCard] = Field(default_factory=list)
    amount: int  # cents
    currency: str
    phone_masked: str
    product_name: str


class PurchaseConfirmResult(BaseModel):
    """Terminal purchase confirmation."""

    success: bool
    license: str | None = None  # License key string
    receipt_url: str | None = None
    requires_action: bool = False
    action_url: str | None = None
    error: str | None = None


# ============ API Resources ============

class Product(BaseModel):
    """Product resource from API."""

    id: str
    slug: str
    name: str
    description: str | None = None
    price_cents: int
    currency: str
    billing_type: Literal["one_time", "subscription"]
    features: list[str] = Field(default_factory=list)
    created_at: int
    updated_at: int


class License(BaseModel):
    """License resource from API."""

    id: str
    customer_id: str
    product_id: str
    status: LicenseStatus
    features: list[str] = Field(default_factory=list)
    quota: int | None = None
    quota_used: int | None = None
    issued_at: int
    expires_at: int | None = None
    revoked_at: int | None = None
    license_key: str | None = None
    created_at: int


class ListMeta(BaseModel):
    """Pagination metadata."""

    cursor: str | None = None
    has_more: bool = False
    total: int | None = None


class ListResponse(BaseModel):
    """Generic list response wrapper."""

    data: list[Any]
    meta: ListMeta


# ============ API Error ============

class ApiErrorDetail(BaseModel):
    """API error detail."""

    code: str
    message: str

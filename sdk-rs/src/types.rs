//! Type definitions for the Tuish SDK
//!
//! These types mirror the TypeScript types from `@tuish/types` and `@tuish/sdk`
//! to ensure compatibility between the Node.js and Rust SDKs.

use serde::{Deserialize, Serialize};

// ============================================================================
// License Types
// ============================================================================

/// License header containing algorithm and version information
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct LicenseHeader {
    /// Algorithm used for signing (always "ed25519")
    pub alg: String,
    /// License format version
    pub ver: u8,
}

impl Default for LicenseHeader {
    fn default() -> Self {
        Self {
            alg: "ed25519".to_string(),
            ver: 1,
        }
    }
}

/// License payload containing all license data
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct LicensePayload {
    /// License ID (e.g., "lic_abc123")
    pub lid: String,

    /// Product ID (e.g., "prod_xyz789")
    pub pid: String,

    /// Customer ID (e.g., "cus_def456")
    pub cid: String,

    /// Developer ID (e.g., "dev_ghi012")
    pub did: String,

    /// Feature flags enabled for this license
    pub features: Vec<String>,

    /// Issued at timestamp (milliseconds since Unix epoch)
    pub iat: i64,

    /// Expiration timestamp (milliseconds since Unix epoch, null for perpetual)
    pub exp: Option<i64>,

    /// Machine ID hash for binding (null if not machine-bound)
    pub mid: Option<String>,
}

impl LicensePayload {
    /// Check if this license has expired
    pub fn is_expired(&self) -> bool {
        match self.exp {
            Some(exp) => {
                let now = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .map(|d| d.as_millis() as i64)
                    .unwrap_or(0);
                exp < now
            }
            None => false, // Perpetual license never expires
        }
    }

    /// Get time remaining in milliseconds (None if perpetual, negative if expired)
    pub fn time_remaining(&self) -> Option<i64> {
        self.exp.map(|exp| {
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_millis() as i64)
                .unwrap_or(0);
            exp - now
        })
    }

    /// Check if this license has a specific feature
    pub fn has_feature(&self, feature: &str) -> bool {
        self.features.iter().any(|f| f == feature)
    }
}

/// A parsed signed license containing header, payload, and signature
#[derive(Debug, Clone)]
pub struct SignedLicense {
    /// License header
    pub header: LicenseHeader,
    /// License payload
    pub payload: LicensePayload,
    /// Base64url-encoded signature
    pub signature: String,
}

/// License status from API validation
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LicenseStatus {
    Active,
    Expired,
    Revoked,
    Grace,
}

// ============================================================================
// SDK Configuration
// ============================================================================

/// Configuration for the Tuish SDK
#[derive(Debug, Clone)]
pub struct TuishConfig {
    /// Product ID for this application
    pub product_id: String,

    /// Ed25519 public key for offline license verification (SPKI base64 or hex format)
    pub public_key: String,

    /// API base URL (defaults to production)
    pub api_base_url: String,

    /// API key for authenticated requests (optional)
    pub api_key: Option<String>,

    /// Custom storage directory (defaults to ~/.tuish/licenses/)
    pub storage_dir: Option<String>,

    /// Enable debug logging
    pub debug: bool,
}

impl TuishConfig {
    /// Create a new configuration with required fields
    pub fn new(product_id: impl Into<String>, public_key: impl Into<String>) -> Self {
        Self {
            product_id: product_id.into(),
            public_key: public_key.into(),
            api_base_url: "https://api.tuish.dev".to_string(),
            api_key: None,
            storage_dir: None,
            debug: false,
        }
    }

    /// Set the API base URL
    pub fn with_api_url(mut self, url: impl Into<String>) -> Self {
        self.api_base_url = url.into();
        self
    }

    /// Set the API key
    pub fn with_api_key(mut self, key: impl Into<String>) -> Self {
        self.api_key = Some(key.into());
        self
    }

    /// Set the storage directory
    pub fn with_storage_dir(mut self, dir: impl Into<String>) -> Self {
        self.storage_dir = Some(dir.into());
        self
    }

    /// Enable debug logging
    pub fn with_debug(mut self, debug: bool) -> Self {
        self.debug = debug;
        self
    }
}

// ============================================================================
// License Check Result
// ============================================================================

/// Result of a license check operation
#[derive(Debug, Clone)]
pub struct LicenseCheckResult {
    /// Whether the license is valid
    pub valid: bool,

    /// License details if valid
    pub license: Option<LicenseDetails>,

    /// Reason for invalid license
    pub reason: Option<crate::error::LicenseInvalidReason>,

    /// Whether the license was verified offline (true) or via API (false)
    pub offline_verified: bool,
}

/// Detailed license information
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LicenseDetails {
    /// License ID
    pub id: String,

    /// Product ID
    pub product_id: String,

    /// Product name (if available from API)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub product_name: Option<String>,

    /// Feature flags
    pub features: Vec<String>,

    /// License status
    pub status: LicenseStatus,

    /// Issued at (Unix timestamp ms)
    pub issued_at: i64,

    /// Expires at (Unix timestamp ms, null for perpetual)
    pub expires_at: Option<i64>,
}

impl From<&LicensePayload> for LicenseDetails {
    fn from(payload: &LicensePayload) -> Self {
        let status = if payload.is_expired() {
            LicenseStatus::Expired
        } else {
            LicenseStatus::Active
        };

        Self {
            id: payload.lid.clone(),
            product_id: payload.pid.clone(),
            product_name: None,
            features: payload.features.clone(),
            status,
            issued_at: payload.iat,
            expires_at: payload.exp,
        }
    }
}

// ============================================================================
// Cached License Data
// ============================================================================

/// License data stored on disk for offline verification
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CachedLicenseData {
    /// Raw license key string
    pub license_key: String,

    /// When the license was cached (Unix timestamp ms)
    pub cached_at: i64,

    /// When the cache should be refreshed (Unix timestamp ms)
    pub refresh_at: i64,

    /// Product ID
    pub product_id: String,

    /// Machine fingerprint used for this cache
    pub machine_fingerprint: String,
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/// Generic API error response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiError {
    /// Error code
    pub code: String,
    /// Human-readable error message
    pub message: String,
    /// Additional error details
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<serde_json::Value>,
}

/// Generic API response wrapper
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    /// Whether the request succeeded
    pub success: bool,
    /// Response data if successful
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
    /// Error details if failed
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<ApiError>,
}

// ----------------------------------------------------------------------------
// Checkout
// ----------------------------------------------------------------------------

/// Request to initialize a checkout session
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckoutInitRequest {
    /// Product ID to purchase
    pub product_id: String,
    /// Customer email (optional)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
    /// URL to redirect after successful purchase
    #[serde(skip_serializing_if = "Option::is_none")]
    pub success_url: Option<String>,
    /// URL to redirect after cancelled purchase
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cancel_url: Option<String>,
}

/// Response from checkout initialization
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckoutInitResponse {
    /// Session ID for polling
    pub session_id: String,
    /// URL to open in browser
    pub checkout_url: String,
}

/// Checkout session status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CheckoutStatus {
    Pending,
    Complete,
    Expired,
}

/// Response from checkout status polling
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckoutStatusResponse {
    /// Current status
    pub status: CheckoutStatus,
    /// Identity token if complete
    #[serde(skip_serializing_if = "Option::is_none")]
    pub identity_token: Option<String>,
    /// License key if complete
    #[serde(skip_serializing_if = "Option::is_none")]
    pub license: Option<String>,
}

// ----------------------------------------------------------------------------
// Authentication
// ----------------------------------------------------------------------------

/// Request to initiate login (sends OTP)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginInitRequest {
    /// Customer email
    pub email: String,
}

/// Response from login initiation
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginInitResponse {
    /// OTP ID for verification
    pub otp_id: String,
    /// Masked phone number
    pub phone_masked: String,
    /// Time until OTP expires (seconds)
    pub expires_in: u32,
}

/// Request to verify OTP and complete login
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginVerifyRequest {
    /// Customer email
    pub email: String,
    /// OTP ID from init response
    pub otp_id: String,
    /// OTP code entered by user
    pub otp: String,
    /// Device fingerprint for this machine
    pub device_fingerprint: String,
}

/// Response from successful login
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginVerifyResponse {
    /// Identity token (JWT) for authenticated requests
    pub identity_token: String,
    /// Customer's licenses
    pub licenses: Vec<LicenseInfo>,
}

// ----------------------------------------------------------------------------
// Purchase (for returning customers)
// ----------------------------------------------------------------------------

/// Request to initiate a purchase
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PurchaseInitRequest {
    /// Product ID to purchase
    pub product_id: String,
}

/// Saved payment card
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedCard {
    /// Card ID (for use in purchase confirmation)
    pub id: String,
    /// Card brand (visa, mastercard, etc.)
    pub brand: String,
    /// Last 4 digits
    pub last4: String,
    /// Expiry month
    pub expiry_month: u8,
    /// Expiry year
    pub expiry_year: u16,
}

/// Response from purchase initiation
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PurchaseInitResponse {
    /// Available saved cards
    pub cards: Vec<SavedCard>,
    /// Amount in cents
    pub amount: i64,
    /// Currency code (e.g., "usd")
    pub currency: String,
    /// Masked phone number for OTP
    pub phone_masked: String,
    /// Product name
    pub product_name: String,
}

/// Request to confirm a purchase
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PurchaseConfirmRequest {
    /// Product ID
    pub product_id: String,
    /// Card ID to charge
    pub card_id: String,
    /// OTP ID from verification
    pub otp_id: String,
    /// OTP code
    pub otp: String,
}

/// Response from purchase confirmation
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PurchaseConfirmResponse {
    /// Whether purchase succeeded
    pub success: bool,
    /// License key if successful
    #[serde(skip_serializing_if = "Option::is_none")]
    pub license: Option<String>,
    /// Receipt URL if successful
    #[serde(skip_serializing_if = "Option::is_none")]
    pub receipt_url: Option<String>,
    /// Whether 3DS action is required
    #[serde(skip_serializing_if = "Option::is_none")]
    pub requires_action: Option<bool>,
    /// URL for 3DS action
    #[serde(skip_serializing_if = "Option::is_none")]
    pub action_url: Option<String>,
    /// Error message if failed
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

// ----------------------------------------------------------------------------
// License Validation
// ----------------------------------------------------------------------------

/// Request to validate a license via API
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LicenseValidateRequest {
    /// License key string
    pub license_key: String,
    /// Machine fingerprint for validation
    pub machine_fingerprint: String,
}

/// License information from API
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LicenseInfo {
    /// License ID
    pub id: String,
    /// Product ID
    pub product_id: String,
    /// Product name
    pub product_name: String,
    /// Feature flags
    pub features: Vec<String>,
    /// License status
    pub status: LicenseStatus,
    /// Issued at (Unix timestamp ms)
    pub issued_at: i64,
    /// Expires at (Unix timestamp ms, null for perpetual)
    pub expires_at: Option<i64>,
}

/// API validation reason for invalid license
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ApiValidationReason {
    Expired,
    Revoked,
    Invalid,
    MachineMismatch,
}

/// Response from license validation API
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LicenseValidateResponse {
    /// Whether the license is valid
    pub valid: bool,
    /// License info if valid
    #[serde(skip_serializing_if = "Option::is_none")]
    pub license: Option<LicenseInfo>,
    /// Reason if invalid
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<ApiValidationReason>,
}

// ----------------------------------------------------------------------------
// Usage Tracking
// ----------------------------------------------------------------------------

/// Request to record usage
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageRecordRequest {
    /// Type of usage event
    pub event_type: String,
    /// Quantity of usage
    pub quantity: i64,
    /// Idempotency key to prevent duplicates
    #[serde(skip_serializing_if = "Option::is_none")]
    pub idempotency_key: Option<String>,
}

/// Response from usage recording
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageRecordResponse {
    /// Whether the usage was recorded
    pub recorded: bool,
    /// Event ID for the recorded usage
    pub event_id: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_license_payload_is_expired() {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as i64;

        // Expired license
        let expired = LicensePayload {
            lid: "lic_123".into(),
            pid: "prod_456".into(),
            cid: "cus_789".into(),
            did: "dev_012".into(),
            features: vec![],
            iat: now - 1000,
            exp: Some(now - 500),
            mid: None,
        };
        assert!(expired.is_expired());

        // Valid license
        let valid = LicensePayload {
            lid: "lic_123".into(),
            pid: "prod_456".into(),
            cid: "cus_789".into(),
            did: "dev_012".into(),
            features: vec![],
            iat: now - 1000,
            exp: Some(now + 86400000),
            mid: None,
        };
        assert!(!valid.is_expired());

        // Perpetual license
        let perpetual = LicensePayload {
            lid: "lic_123".into(),
            pid: "prod_456".into(),
            cid: "cus_789".into(),
            did: "dev_012".into(),
            features: vec![],
            iat: now - 1000,
            exp: None,
            mid: None,
        };
        assert!(!perpetual.is_expired());
    }

    #[test]
    fn test_license_payload_has_feature() {
        let payload = LicensePayload {
            lid: "lic_123".into(),
            pid: "prod_456".into(),
            cid: "cus_789".into(),
            did: "dev_012".into(),
            features: vec!["pro".into(), "analytics".into()],
            iat: 0,
            exp: None,
            mid: None,
        };

        assert!(payload.has_feature("pro"));
        assert!(payload.has_feature("analytics"));
        assert!(!payload.has_feature("enterprise"));
    }

    #[test]
    fn test_tuish_config_builder() {
        let config = TuishConfig::new("prod_123", "abc123hex")
            .with_api_url("https://custom.api.com")
            .with_api_key("sk_test_key")
            .with_debug(true);

        assert_eq!(config.product_id, "prod_123");
        assert_eq!(config.public_key, "abc123hex");
        assert_eq!(config.api_base_url, "https://custom.api.com");
        assert_eq!(config.api_key, Some("sk_test_key".to_string()));
        assert!(config.debug);
    }

    #[test]
    fn test_license_status_serialization() {
        assert_eq!(
            serde_json::to_string(&LicenseStatus::Active).unwrap(),
            "\"active\""
        );
        assert_eq!(
            serde_json::to_string(&LicenseStatus::Expired).unwrap(),
            "\"expired\""
        );
        assert_eq!(
            serde_json::to_string(&LicenseStatus::Revoked).unwrap(),
            "\"revoked\""
        );
    }

    #[test]
    fn test_checkout_status_serialization() {
        assert_eq!(
            serde_json::to_string(&CheckoutStatus::Pending).unwrap(),
            "\"pending\""
        );
        assert_eq!(
            serde_json::to_string(&CheckoutStatus::Complete).unwrap(),
            "\"complete\""
        );
    }
}

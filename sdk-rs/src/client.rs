//! HTTP client for the Tuish API
//!
//! This module provides an async HTTP client for interacting with the Tuish API.
//! It handles authentication, request/response serialization, and error handling.
//!
//! # Example
//!
//! ```rust,no_run
//! use tuish::TuishClient;
//!
//! # async fn example() -> Result<(), tuish::TuishError> {
//! let client = TuishClient::new("https://api.tuish.dev", "your-api-key");
//!
//! // Create a checkout session
//! let checkout = client.init_checkout(tuish::CheckoutInitRequest {
//!     product_id: "prod_xxx".to_string(),
//!     email: Some("user@example.com".to_string()),
//!     success_url: None,
//!     cancel_url: None,
//! }).await?;
//!
//! println!("Checkout URL: {}", checkout.checkout_url);
//! # Ok(())
//! # }
//! ```

use reqwest::{header, Client, StatusCode};
use serde::{de::DeserializeOwned, Serialize};
use std::time::Duration;
use tracing::{debug, instrument};

use crate::error::TuishError;
use crate::types::{
    CheckoutInitRequest, CheckoutInitResponse, CheckoutStatusResponse, LicenseValidateRequest,
    LicenseValidateResponse, LoginInitRequest, LoginInitResponse, LoginVerifyRequest,
    LoginVerifyResponse, PurchaseConfirmRequest, PurchaseConfirmResponse, PurchaseInitRequest,
    PurchaseInitResponse,
};

/// Default API base URL
pub const DEFAULT_API_URL: &str = "https://api.tuish.dev";

/// Default request timeout in seconds
const DEFAULT_TIMEOUT_SECS: u64 = 30;

/// Simple OTP response for purchase flow
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OtpResponse {
    /// OTP ID for verification
    pub otp_id: String,
    /// Time until OTP expires (seconds)
    pub expires_in: u32,
}

/// HTTP client for the Tuish API
///
/// This client handles all HTTP communication with the Tuish API,
/// including authentication, serialization, and error handling.
#[derive(Debug, Clone)]
pub struct TuishClient {
    http: Client,
    base_url: String,
    api_key: String,
    identity_token: Option<String>,
    debug: bool,
}

impl TuishClient {
    /// Create a new Tuish client
    ///
    /// # Arguments
    ///
    /// * `base_url` - The API base URL (e.g., "https://api.tuish.dev")
    /// * `api_key` - Your API key for authenticated requests
    ///
    /// # Example
    ///
    /// ```rust
    /// use tuish::TuishClient;
    ///
    /// let client = TuishClient::new("https://api.tuish.dev", "your-api-key");
    /// ```
    pub fn new(base_url: &str, api_key: &str) -> Self {
        let http = Client::builder()
            .timeout(Duration::from_secs(DEFAULT_TIMEOUT_SECS))
            .build()
            .expect("Failed to build HTTP client");

        Self {
            http,
            base_url: base_url.trim_end_matches('/').to_string(),
            api_key: api_key.to_string(),
            identity_token: None,
            debug: false,
        }
    }

    /// Create a new client with custom configuration
    ///
    /// # Arguments
    ///
    /// * `base_url` - The API base URL
    /// * `api_key` - Your API key
    /// * `timeout` - Request timeout duration
    /// * `debug` - Enable debug logging
    pub fn with_config(
        base_url: &str,
        api_key: &str,
        timeout: Duration,
        debug: bool,
    ) -> Result<Self, TuishError> {
        let http = Client::builder()
            .timeout(timeout)
            .build()
            .map_err(|e| TuishError::NetworkError(format!("Failed to build HTTP client: {}", e)))?;

        Ok(Self {
            http,
            base_url: base_url.trim_end_matches('/').to_string(),
            api_key: api_key.to_string(),
            identity_token: None,
            debug,
        })
    }

    /// Create a client with default API URL
    ///
    /// # Arguments
    ///
    /// * `api_key` - Your API key for authenticated requests
    pub fn with_api_key(api_key: &str) -> Self {
        Self::new(DEFAULT_API_URL, api_key)
    }

    /// Set the identity token for authenticated requests
    ///
    /// The identity token is obtained after successful login and is used
    /// for purchase-related endpoints.
    ///
    /// # Arguments
    ///
    /// * `token` - The identity token (JWT), or None to clear it
    pub fn set_identity_token(&mut self, token: Option<String>) {
        self.identity_token = token;
    }

    /// Get the current identity token
    pub fn identity_token(&self) -> Option<&str> {
        self.identity_token.as_deref()
    }

    /// Check if an identity token is set
    pub fn has_identity_token(&self) -> bool {
        self.identity_token.is_some()
    }

    /// Enable or disable debug logging
    pub fn set_debug(&mut self, debug: bool) {
        self.debug = debug;
    }

    // =========================================================================
    // Internal Request Helpers
    // =========================================================================

    /// Make a GET request
    #[instrument(skip(self), fields(url = %url))]
    async fn get<T: DeserializeOwned>(&self, url: &str, auth: AuthMethod) -> Result<T, TuishError> {
        self.request(reqwest::Method::GET, url, Option::<()>::None, auth)
            .await
    }

    /// Make a POST request
    #[instrument(skip(self, body), fields(url = %url))]
    async fn post<T: DeserializeOwned, B: Serialize>(
        &self,
        url: &str,
        body: Option<B>,
        auth: AuthMethod,
    ) -> Result<T, TuishError> {
        self.request(reqwest::Method::POST, url, body, auth).await
    }

    /// Make an HTTP request with the specified method, body, and authentication
    async fn request<T: DeserializeOwned, B: Serialize>(
        &self,
        method: reqwest::Method,
        path: &str,
        body: Option<B>,
        auth: AuthMethod,
    ) -> Result<T, TuishError> {
        let url = format!("{}{}", self.base_url, path);

        if self.debug {
            debug!("[tuish] {} {}", method, url);
        }

        let mut request = self
            .http
            .request(method.clone(), &url)
            .header(header::CONTENT_TYPE, "application/json")
            .header(header::ACCEPT, "application/json");

        // Add authentication headers
        match auth {
            AuthMethod::None => {}
            AuthMethod::ApiKey => {
                request = request.header("X-API-Key", &self.api_key);
            }
            AuthMethod::IdentityToken => {
                if let Some(ref token) = self.identity_token {
                    request = request.header(header::AUTHORIZATION, format!("Bearer {}", token));
                } else {
                    return Err(TuishError::ApiError {
                        status: 401,
                        message: "Identity token required but not set".to_string(),
                    });
                }
            }
        }

        // Add body for POST/PUT/PATCH requests
        if let Some(b) = body {
            request = request.json(&b);
        }

        let response = request.send().await?;
        let status = response.status();
        let response_text = response.text().await?;

        if self.debug {
            debug!("[tuish] Response {}: {}", status, &response_text);
        }

        // Parse the response
        self.parse_response(&response_text, status)
    }

    /// Parse an API response, handling both success and error cases
    fn parse_response<T: DeserializeOwned>(
        &self,
        response_text: &str,
        status: StatusCode,
    ) -> Result<T, TuishError> {
        // Try to parse as JSON
        let json: serde_json::Value = serde_json::from_str(response_text).map_err(|_| {
            TuishError::ParseError(format!(
                "Invalid JSON response: {}",
                &response_text[..response_text.len().min(100)]
            ))
        })?;

        // Check for error response
        if !status.is_success() {
            let error_message = json
                .get("error")
                .and_then(|e| {
                    // Handle both { error: string } and { error: { message: string } }
                    if e.is_string() {
                        e.as_str().map(String::from)
                    } else {
                        e.get("message").and_then(|m| m.as_str()).map(String::from)
                    }
                })
                .or_else(|| json.get("message").and_then(|m| m.as_str()).map(String::from))
                .unwrap_or_else(|| format!("Request failed with status {}", status));

            return Err(TuishError::ApiError {
                status: status.as_u16(),
                message: error_message,
            });
        }

        // Handle wrapped response { success: true, data: T }
        if json.get("success").and_then(|s| s.as_bool()) == Some(true) {
            if let Some(data) = json.get("data") {
                return serde_json::from_value(data.clone()).map_err(|e| {
                    TuishError::ParseError(format!("Failed to parse response data: {}", e))
                });
            }
        }

        // Try to parse the whole response as T
        serde_json::from_value(json)
            .map_err(|e| TuishError::ParseError(format!("Failed to parse response: {}", e)))
    }

    // =========================================================================
    // Checkout Endpoints
    // =========================================================================

    /// Create a checkout session for browser-based purchase
    ///
    /// This initiates a checkout flow where the user completes payment in their browser.
    /// Poll `get_checkout_status` to check when payment is complete.
    ///
    /// # Arguments
    ///
    /// * `req` - Checkout initialization request
    ///
    /// # Example
    ///
    /// ```rust,no_run
    /// use tuish::{TuishClient, CheckoutInitRequest};
    ///
    /// # async fn example() -> Result<(), tuish::TuishError> {
    /// let client = TuishClient::new("https://api.tuish.dev", "your-api-key");
    ///
    /// let checkout = client.init_checkout(CheckoutInitRequest {
    ///     product_id: "prod_xxx".to_string(),
    ///     email: Some("user@example.com".to_string()),
    ///     success_url: None,
    ///     cancel_url: None,
    /// }).await?;
    ///
    /// println!("Open in browser: {}", checkout.checkout_url);
    /// # Ok(())
    /// # }
    /// ```
    #[instrument(skip(self))]
    pub async fn init_checkout(
        &self,
        req: CheckoutInitRequest,
    ) -> Result<CheckoutInitResponse, TuishError> {
        self.post("/v1/checkout/init", Some(req), AuthMethod::ApiKey)
            .await
    }

    /// Get the status of a checkout session
    ///
    /// Poll this endpoint to check if the user has completed payment.
    /// When status is `Complete`, the response includes the license key.
    ///
    /// # Arguments
    ///
    /// * `session_id` - The session ID from `init_checkout`
    ///
    /// # Example
    ///
    /// ```rust,no_run
    /// use tuish::{TuishClient, types::CheckoutStatus};
    ///
    /// # async fn example() -> Result<(), tuish::TuishError> {
    /// let client = TuishClient::new("https://api.tuish.dev", "your-api-key");
    ///
    /// let status = client.get_checkout_status("sess_abc123").await?;
    ///
    /// match status.status {
    ///     CheckoutStatus::Complete => {
    ///         println!("License: {:?}", status.license);
    ///     }
    ///     CheckoutStatus::Pending => println!("Still waiting..."),
    ///     CheckoutStatus::Expired => println!("Session expired"),
    /// }
    /// # Ok(())
    /// # }
    /// ```
    #[instrument(skip(self))]
    pub async fn get_checkout_status(
        &self,
        session_id: &str,
    ) -> Result<CheckoutStatusResponse, TuishError> {
        let path = format!("/v1/checkout/status/{}", session_id);
        self.get(&path, AuthMethod::None).await
    }

    // =========================================================================
    // Auth Endpoints
    // =========================================================================

    /// Request an OTP for login
    ///
    /// Sends a one-time password to the customer's registered phone number.
    /// Use `verify_login` with the returned OTP ID to complete authentication.
    ///
    /// # Arguments
    ///
    /// * `email` - Customer's email address
    ///
    /// # Example
    ///
    /// ```rust,no_run
    /// use tuish::TuishClient;
    ///
    /// # async fn example() -> Result<(), tuish::TuishError> {
    /// let client = TuishClient::new("https://api.tuish.dev", "your-api-key");
    ///
    /// let otp = client.request_login_otp("user@example.com").await?;
    /// println!("OTP sent to {}", otp.phone_masked);
    /// # Ok(())
    /// # }
    /// ```
    #[instrument(skip(self))]
    pub async fn request_login_otp(&self, email: &str) -> Result<LoginInitResponse, TuishError> {
        let req = LoginInitRequest {
            email: email.to_string(),
        };
        self.post("/v1/auth/login/init", Some(req), AuthMethod::None)
            .await
    }

    /// Verify OTP and complete login
    ///
    /// After successful verification, the client automatically stores the identity
    /// token for subsequent authenticated requests.
    ///
    /// # Arguments
    ///
    /// * `req` - Login verification request with email, OTP, and device fingerprint
    ///
    /// # Example
    ///
    /// ```rust,no_run
    /// use tuish::{TuishClient, LoginVerifyRequest};
    ///
    /// # async fn example() -> Result<(), tuish::TuishError> {
    /// let mut client = TuishClient::new("https://api.tuish.dev", "your-api-key");
    ///
    /// let result = client.verify_login(LoginVerifyRequest {
    ///     email: "user@example.com".to_string(),
    ///     otp_id: "otp_xxx".to_string(),
    ///     otp: "123456".to_string(),
    ///     device_fingerprint: "device-hash".to_string(),
    /// }).await?;
    ///
    /// // Client now has identity token set automatically
    /// println!("Logged in, found {} licenses", result.licenses.len());
    /// # Ok(())
    /// # }
    /// ```
    #[instrument(skip(self, req))]
    pub async fn verify_login(
        &mut self,
        req: LoginVerifyRequest,
    ) -> Result<LoginVerifyResponse, TuishError> {
        let response: LoginVerifyResponse = self
            .post("/v1/auth/login/verify", Some(req), AuthMethod::None)
            .await?;

        // Store the identity token for subsequent requests
        self.identity_token = Some(response.identity_token.clone());

        Ok(response)
    }

    // =========================================================================
    // License Endpoints
    // =========================================================================

    /// Validate a license key online
    ///
    /// This performs server-side validation of a license key, checking:
    /// - License exists and is valid
    /// - License is not expired or revoked
    /// - Machine fingerprint matches (if machine-bound)
    ///
    /// # Arguments
    ///
    /// * `req` - License validation request
    ///
    /// # Example
    ///
    /// ```rust,no_run
    /// use tuish::{TuishClient, LicenseValidateRequest};
    ///
    /// # async fn example() -> Result<(), tuish::TuishError> {
    /// let client = TuishClient::new("https://api.tuish.dev", "your-api-key");
    ///
    /// let result = client.validate_license(LicenseValidateRequest {
    ///     license_key: "license-key-here".to_string(),
    ///     machine_fingerprint: "machine-hash".to_string(),
    /// }).await?;
    ///
    /// if result.valid {
    ///     println!("License valid: {:?}", result.license);
    /// } else {
    ///     println!("License invalid: {:?}", result.reason);
    /// }
    /// # Ok(())
    /// # }
    /// ```
    #[instrument(skip(self, req))]
    pub async fn validate_license(
        &self,
        req: LicenseValidateRequest,
    ) -> Result<LicenseValidateResponse, TuishError> {
        self.post("/v1/licenses/validate", Some(req), AuthMethod::ApiKey)
            .await
    }

    // =========================================================================
    // Purchase Endpoints (for returning customers)
    // =========================================================================

    /// Initialize a purchase for returning customers
    ///
    /// Returns saved payment methods and purchase details. Requires identity token
    /// (call `verify_login` first).
    ///
    /// # Arguments
    ///
    /// * `product_id` - Product ID to purchase
    ///
    /// # Example
    ///
    /// ```rust,no_run
    /// use tuish::TuishClient;
    ///
    /// # async fn example() -> Result<(), tuish::TuishError> {
    /// let client = TuishClient::new("https://api.tuish.dev", "your-api-key");
    /// // Assume client has identity token set from login
    ///
    /// let purchase = client.init_purchase("prod_xxx").await?;
    ///
    /// for card in &purchase.cards {
    ///     println!("{} ending in {}", card.brand, card.last4);
    /// }
    /// # Ok(())
    /// # }
    /// ```
    #[instrument(skip(self))]
    pub async fn init_purchase(
        &self,
        product_id: &str,
    ) -> Result<PurchaseInitResponse, TuishError> {
        let req = PurchaseInitRequest {
            product_id: product_id.to_string(),
        };
        self.post("/v1/purchase/init", Some(req), AuthMethod::IdentityToken)
            .await
    }

    /// Request OTP for purchase confirmation
    ///
    /// Sends an OTP to verify the purchase. Requires identity token.
    ///
    /// # Example
    ///
    /// ```rust,no_run
    /// use tuish::TuishClient;
    ///
    /// # async fn example() -> Result<(), tuish::TuishError> {
    /// let client = TuishClient::new("https://api.tuish.dev", "your-api-key");
    /// // Assume client has identity token set from login
    ///
    /// let otp = client.request_purchase_otp().await?;
    /// println!("OTP expires in {} seconds", otp.expires_in);
    /// # Ok(())
    /// # }
    /// ```
    #[instrument(skip(self))]
    pub async fn request_purchase_otp(&self) -> Result<OtpResponse, TuishError> {
        self.post::<OtpResponse, ()>("/v1/purchase/otp", None, AuthMethod::IdentityToken)
            .await
    }

    /// Confirm a purchase with OTP
    ///
    /// Completes the purchase using a saved card and OTP verification.
    /// Returns the license key on success.
    ///
    /// # Arguments
    ///
    /// * `req` - Purchase confirmation request
    ///
    /// # Example
    ///
    /// ```rust,no_run
    /// use tuish::{TuishClient, PurchaseConfirmRequest};
    ///
    /// # async fn example() -> Result<(), tuish::TuishError> {
    /// let client = TuishClient::new("https://api.tuish.dev", "your-api-key");
    /// // Assume client has identity token set from login
    ///
    /// let result = client.confirm_purchase(PurchaseConfirmRequest {
    ///     product_id: "prod_xxx".to_string(),
    ///     card_id: "card_yyy".to_string(),
    ///     otp_id: "otp_zzz".to_string(),
    ///     otp: "123456".to_string(),
    /// }).await?;
    ///
    /// if result.success {
    ///     println!("License: {:?}", result.license);
    /// }
    /// # Ok(())
    /// # }
    /// ```
    #[instrument(skip(self, req))]
    pub async fn confirm_purchase(
        &self,
        req: PurchaseConfirmRequest,
    ) -> Result<PurchaseConfirmResponse, TuishError> {
        self.post("/v1/purchase/confirm", Some(req), AuthMethod::IdentityToken)
            .await
    }
}

/// Authentication method for API requests
#[derive(Debug, Clone, Copy)]
enum AuthMethod {
    /// No authentication required
    None,
    /// Use X-API-Key header
    ApiKey,
    /// Use Authorization: Bearer token
    IdentityToken,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_client_construction() {
        let client = TuishClient::new("https://api.tuish.dev", "test-api-key");
        assert_eq!(client.base_url, "https://api.tuish.dev");
        assert_eq!(client.api_key, "test-api-key");
        assert!(client.identity_token.is_none());
    }

    #[test]
    fn test_client_strips_trailing_slash() {
        let client = TuishClient::new("https://api.tuish.dev/", "test-api-key");
        assert_eq!(client.base_url, "https://api.tuish.dev");
    }

    #[test]
    fn test_identity_token_management() {
        let mut client = TuishClient::new("https://api.tuish.dev", "test-api-key");

        assert!(!client.has_identity_token());
        assert!(client.identity_token().is_none());

        client.set_identity_token(Some("test-token".to_string()));

        assert!(client.has_identity_token());
        assert_eq!(client.identity_token(), Some("test-token"));

        client.set_identity_token(None);

        assert!(!client.has_identity_token());
    }

    #[test]
    fn test_with_api_key_constructor() {
        let client = TuishClient::with_api_key("test-key");
        assert_eq!(client.base_url, DEFAULT_API_URL);
        assert_eq!(client.api_key, "test-key");
    }

    #[test]
    fn test_parse_success_response() {
        let client = TuishClient::new("https://api.tuish.dev", "test-key");

        // Test direct response
        let json = r#"{"sessionId":"sess_123","checkoutUrl":"https://checkout.example.com"}"#;
        let result: CheckoutInitResponse = client
            .parse_response(json, StatusCode::OK)
            .expect("Failed to parse");
        assert_eq!(result.session_id, "sess_123");

        // Test wrapped response
        let json = r#"{"success":true,"data":{"sessionId":"sess_456","checkoutUrl":"https://checkout.example.com"}}"#;
        let result: CheckoutInitResponse = client
            .parse_response(json, StatusCode::OK)
            .expect("Failed to parse");
        assert_eq!(result.session_id, "sess_456");
    }

    #[test]
    fn test_parse_error_response() {
        let client = TuishClient::new("https://api.tuish.dev", "test-key");

        // Test simple error
        let json = r#"{"error":"Not found"}"#;
        let result: Result<CheckoutInitResponse, _> =
            client.parse_response(json, StatusCode::NOT_FOUND);
        match result {
            Err(TuishError::ApiError { status, message }) => {
                assert_eq!(status, 404);
                assert_eq!(message, "Not found");
            }
            _ => panic!("Expected ApiError"),
        }

        // Test structured error
        let json = r#"{"error":{"code":"invalid_request","message":"Invalid product ID"}}"#;
        let result: Result<CheckoutInitResponse, _> =
            client.parse_response(json, StatusCode::BAD_REQUEST);
        match result {
            Err(TuishError::ApiError { status, message }) => {
                assert_eq!(status, 400);
                assert_eq!(message, "Invalid product ID");
            }
            _ => panic!("Expected ApiError"),
        }
    }

    #[test]
    fn test_parse_invalid_json() {
        let client = TuishClient::new("https://api.tuish.dev", "test-key");

        let json = "not valid json";
        let result: Result<CheckoutInitResponse, _> = client.parse_response(json, StatusCode::OK);
        match result {
            Err(TuishError::ParseError(msg)) => {
                assert!(msg.contains("Invalid JSON"));
            }
            _ => panic!("Expected ParseError"),
        }
    }

    #[test]
    fn test_otp_response_deserialization() {
        let json = r#"{"otpId":"otp_123","expiresIn":300}"#;
        let response: OtpResponse = serde_json::from_str(json).expect("Failed to parse");
        assert_eq!(response.otp_id, "otp_123");
        assert_eq!(response.expires_in, 300);
    }
}

//! Tuish SDK for Rust
//!
//! This crate provides tools for integrating Tuish license verification
//! into Rust CLI and TUI applications.
//!
//! # Features
//!
//! - `http` - Enable HTTP client for online license validation (enabled by default)
//! - `storage` - Enable filesystem storage for license caching (enabled by default)
//! - `browser` - Enable browser opening for checkout flows (enabled by default)
//!
//! # Quick Start
//!
//! ```rust,no_run
//! use tuish::Tuish;
//!
//! # async fn example() -> Result<(), tuish::TuishError> {
//! // Create a Tuish instance
//! let mut tuish = Tuish::builder()
//!     .product_id("prod_xxx")
//!     .public_key("MCowBQYDK2VwAyEA...")
//!     .build()?;
//!
//! // Check if user has a valid license
//! let result = tuish.check_license();
//!
//! if !result.valid {
//!     // Start browser checkout flow
//!     let session = tuish.open_checkout(None).await?;
//!     println!("Opening checkout: {}", session.checkout_url);
//!
//!     // Wait for checkout to complete
//!     let license = tuish.wait_for_checkout(&session.session_id).await?;
//!     println!("License acquired!");
//! }
//! # Ok(())
//! # }
//! ```
//!
//! # Example: Offline Verification
//!
//! ```rust,no_run
//! use tuish::{verify_license, TuishConfig};
//!
//! # fn example() -> Result<(), tuish::TuishError> {
//! let config = TuishConfig::new("prod_xxx", "your-public-key-hex");
//!
//! // Verify a license offline
//! let payload = verify_license(
//!     "eyJhbGciOiJlZDI1NTE5IiwidmVyIjoxfQ.eyJsaWQiOiJsaWNfMTIzIn0.signature",
//!     &config.public_key,
//!     None,
//! )?;
//!
//! println!("License valid for product: {}", payload.pid);
//! # Ok(())
//! # }
//! ```
//!
//! # Example: Online Validation (requires `http` feature)
//!
//! ```rust,no_run
//! # #[cfg(feature = "http")]
//! use tuish::{TuishClient, LicenseValidateRequest};
//!
//! # #[cfg(feature = "http")]
//! # async fn example() -> Result<(), tuish::TuishError> {
//! let client = TuishClient::new("https://api.tuish.dev", "your-api-key");
//!
//! let result = client.validate_license(LicenseValidateRequest {
//!     license_key: "license-key-here".to_string(),
//!     machine_fingerprint: "machine-hash".to_string(),
//! }).await?;
//!
//! if result.valid {
//!     println!("License valid!");
//! }
//! # Ok(())
//! # }
//! ```

// Core modules (always available)
pub mod crypto;
pub mod error;
pub mod fingerprint;
pub mod types;

// Feature-gated modules
#[cfg(feature = "storage")]
pub mod storage;

pub mod license;

#[cfg(feature = "http")]
pub mod client;

#[cfg(feature = "browser")]
pub mod browser;

// Re-exports for convenient access
pub use crypto::{
    extract_license_payload, get_license_time_remaining, is_license_expired,
    is_valid_license_format, parse_license, verify_license,
};
pub use error::{LicenseInvalidReason, TuishError};
pub use fingerprint::{get_machine_fingerprint, get_machine_fingerprint_cached, get_machine_fingerprint_sync};
pub use license::LicenseManager;
pub use types::{
    CachedLicenseData, CheckoutInitRequest, CheckoutInitResponse, CheckoutStatus,
    CheckoutStatusResponse, LicenseCheckResult, LicenseDetails, LicenseHeader, LicenseInfo,
    LicensePayload, LicenseStatus, LicenseValidateRequest, LicenseValidateResponse,
    LoginInitRequest, LoginInitResponse, LoginVerifyRequest, LoginVerifyResponse,
    PurchaseConfirmRequest, PurchaseConfirmResponse, PurchaseInitRequest, PurchaseInitResponse,
    SavedCard, SignedLicense, TuishConfig,
};

#[cfg(feature = "storage")]
pub use storage::LicenseStorage;

#[cfg(feature = "http")]
pub use client::{OtpResponse, TuishClient, DEFAULT_API_URL};

// ============================================================================
// Main Tuish SDK Entry Point
// ============================================================================

use std::time::Duration;
use tracing::{debug, info, warn};

/// Checkout session information
///
/// Returned when creating a checkout session, contains the URL to open
/// in the browser and the session ID for polling status.
#[derive(Debug, Clone)]
pub struct CheckoutSession {
    /// Unique session identifier for polling status
    pub session_id: String,
    /// URL to open in the user's browser for checkout
    pub checkout_url: String,
}

/// Main SDK entry point for Tuish license management
///
/// This struct coordinates all license operations including:
/// - Offline license verification
/// - Online license validation (with `http` feature)
/// - Browser checkout flow (with `http` + `browser` features)
/// - Terminal purchase flow for returning customers
///
/// # Example
///
/// ```rust,no_run
/// use tuish::Tuish;
///
/// # fn example() -> Result<(), tuish::TuishError> {
/// let mut tuish = Tuish::builder()
///     .product_id("prod_xxx")
///     .public_key("MCowBQYDK2VwAyEA...")
///     .build()?;
///
/// let result = tuish.check_license();
/// if result.valid {
///     println!("Welcome, licensed user!");
/// }
/// # Ok(())
/// # }
/// ```
#[derive(Debug)]
pub struct Tuish {
    config: TuishConfig,
    license_manager: LicenseManager,
    #[cfg(feature = "http")]
    client: TuishClient,
}

impl Tuish {
    /// Create a new Tuish instance with the given configuration
    ///
    /// # Arguments
    ///
    /// * `config` - SDK configuration including product ID and public key
    ///
    /// # Returns
    ///
    /// A configured Tuish instance ready for license operations.
    ///
    /// # Errors
    ///
    /// Returns an error if the configuration is invalid or if required
    /// resources cannot be initialized.
    pub fn new(config: TuishConfig) -> Result<Self, TuishError> {
        #[cfg(feature = "http")]
        let client = {
            let api_key = config.api_key.as_deref().unwrap_or("");
            TuishClient::with_config(
                &config.api_base_url,
                api_key,
                Duration::from_secs(30),
                config.debug,
            )?
        };

        #[cfg(feature = "http")]
        let license_manager = LicenseManager::with_client(config.clone(), client.clone())?;

        #[cfg(not(feature = "http"))]
        let license_manager = LicenseManager::new(config.clone())?;

        info!(product_id = %config.product_id, "Tuish SDK initialized");

        Ok(Self {
            config,
            license_manager,
            #[cfg(feature = "http")]
            client,
        })
    }

    /// Create a new builder for configuring a Tuish instance
    ///
    /// # Example
    ///
    /// ```rust,no_run
    /// use tuish::Tuish;
    ///
    /// # fn example() -> Result<(), tuish::TuishError> {
    /// let mut tuish = Tuish::builder()
    ///     .product_id("prod_xxx")
    ///     .public_key("MCowBQYDK2VwAyEA...")
    ///     .api_key("your-api-key")
    ///     .build()?;
    /// # Ok(())
    /// # }
    /// ```
    pub fn builder() -> TuishBuilder {
        TuishBuilder::new()
    }

    // =========================================================================
    // License Checking
    // =========================================================================

    /// Check if the user has a valid license
    ///
    /// This performs offline-first verification:
    /// 1. Load cached license from disk
    /// 2. Verify signature offline using the public key
    /// 3. Check expiration and machine binding
    ///
    /// If the cache is stale and the `http` feature is enabled, a background
    /// refresh will be triggered.
    ///
    /// # Returns
    ///
    /// A `LicenseCheckResult` indicating whether the license is valid.
    ///
    /// # Example
    ///
    /// ```rust,no_run
    /// use tuish::Tuish;
    ///
    /// # fn example() -> Result<(), tuish::TuishError> {
    /// let mut tuish = Tuish::builder()
    ///     .product_id("prod_xxx")
    ///     .public_key("key...")
    ///     .build()?;
    ///
    /// let result = tuish.check_license();
    /// if result.valid {
    ///     if let Some(license) = &result.license {
    ///         println!("Licensed until: {:?}", license.expires_at);
    ///     }
    /// } else {
    ///     println!("No valid license: {:?}", result.reason);
    /// }
    /// # Ok(())
    /// # }
    /// ```
    pub fn check_license(&mut self) -> LicenseCheckResult {
        self.license_manager.check_license_sync()
    }

    /// Force online license validation
    ///
    /// This bypasses the cache and validates the license directly with
    /// the Tuish API. Requires the `http` feature.
    ///
    /// # Arguments
    ///
    /// * `license_key` - Optional license key to validate. If not provided,
    ///   the cached license key will be used.
    ///
    /// # Errors
    ///
    /// Returns an error if no license key is available or if the network
    /// request fails.
    #[cfg(feature = "http")]
    pub async fn validate_online(
        &self,
        license_key: Option<&str>,
    ) -> Result<LicenseCheckResult, TuishError> {
        let key = match license_key {
            Some(k) => k.to_string(),
            None => self
                .license_manager
                .get_cached_license_key()
                .ok_or_else(|| TuishError::InvalidLicense("no license key available".to_string()))?,
        };

        self.license_manager.validate_online(&key).await
    }

    /// Save a license key manually
    ///
    /// Use this when you receive a license key through a custom flow
    /// (e.g., from a license file or email).
    ///
    /// # Arguments
    ///
    /// * `license_key` - The license key string to save
    ///
    /// # Returns
    ///
    /// The result of verifying the saved license.
    pub fn save_license(&mut self, license_key: &str) -> Result<LicenseCheckResult, TuishError> {
        self.license_manager.save_license_sync(license_key)
    }

    /// Clear the stored license
    ///
    /// Removes the cached license from disk. After calling this,
    /// `check_license()` will return invalid until a new license is saved.
    pub fn clear_license(&mut self) -> Result<(), TuishError> {
        self.license_manager.clear_license_sync()
    }

    /// Get the cached license key
    ///
    /// Returns the raw license key string if one is cached.
    pub fn get_cached_license_key(&self) -> Option<String> {
        self.license_manager.get_cached_license_key()
    }

    // =========================================================================
    // Browser Purchase Flow
    // =========================================================================

    /// Start a browser checkout session
    ///
    /// Creates a checkout session on the server and returns the session
    /// information. The caller is responsible for opening the checkout URL.
    ///
    /// # Arguments
    ///
    /// * `email` - Optional customer email to pre-fill the checkout form
    ///
    /// # Returns
    ///
    /// A `CheckoutSession` containing the session ID and checkout URL.
    #[cfg(feature = "http")]
    pub async fn purchase_in_browser(
        &self,
        email: Option<&str>,
    ) -> Result<CheckoutSession, TuishError> {
        debug!(email = ?email, "Creating checkout session");

        let request = CheckoutInitRequest {
            product_id: self.config.product_id.clone(),
            email: email.map(String::from),
            success_url: None,
            cancel_url: None,
        };

        let response = self.client.init_checkout(request).await?;

        info!(session_id = %response.session_id, "Checkout session created");

        Ok(CheckoutSession {
            session_id: response.session_id,
            checkout_url: response.checkout_url,
        })
    }

    /// Open checkout in the default browser
    ///
    /// Creates a checkout session and automatically opens it in the user's
    /// default web browser. Requires both `http` and `browser` features.
    ///
    /// # Arguments
    ///
    /// * `email` - Optional customer email to pre-fill the checkout form
    ///
    /// # Returns
    ///
    /// A `CheckoutSession` containing the session ID for polling.
    ///
    /// # Example
    ///
    /// ```rust,no_run
    /// use tuish::Tuish;
    ///
    /// # async fn example() -> Result<(), tuish::TuishError> {
    /// let mut tuish = Tuish::builder()
    ///     .product_id("prod_xxx")
    ///     .public_key("key...")
    ///     .build()?;
    ///
    /// // Opens browser automatically
    /// let session = tuish.open_checkout(Some("user@example.com")).await?;
    ///
    /// // Wait for user to complete purchase
    /// let result = tuish.wait_for_checkout(&session.session_id).await?;
    /// if result.valid {
    ///     println!("Purchase complete!");
    /// }
    /// # Ok(())
    /// # }
    /// ```
    #[cfg(all(feature = "http", feature = "browser"))]
    pub async fn open_checkout(&self, email: Option<&str>) -> Result<CheckoutSession, TuishError> {
        let session = self.purchase_in_browser(email).await?;

        // Open the checkout URL in the browser
        browser::open_url_detached(&session.checkout_url)?;

        Ok(session)
    }

    /// Wait for checkout to complete
    ///
    /// Polls the checkout status until the user completes payment or
    /// the session expires. Default timeout is 10 minutes with 2-second
    /// polling interval.
    ///
    /// # Arguments
    ///
    /// * `session_id` - The session ID from `purchase_in_browser` or `open_checkout`
    ///
    /// # Returns
    ///
    /// A `LicenseCheckResult` with the new license if successful.
    #[cfg(feature = "http")]
    pub async fn wait_for_checkout(
        &mut self,
        session_id: &str,
    ) -> Result<LicenseCheckResult, TuishError> {
        self.wait_for_checkout_with_options(session_id, Duration::from_secs(2), Duration::from_secs(600))
            .await
    }

    /// Wait for checkout to complete with custom options
    ///
    /// # Arguments
    ///
    /// * `session_id` - The session ID to poll
    /// * `poll_interval` - How often to check the status
    /// * `timeout` - Maximum time to wait before timing out
    #[cfg(feature = "http")]
    pub async fn wait_for_checkout_with_options(
        &mut self,
        session_id: &str,
        poll_interval: Duration,
        timeout: Duration,
    ) -> Result<LicenseCheckResult, TuishError> {
        debug!(
            session_id = %session_id,
            poll_interval = ?poll_interval,
            timeout = ?timeout,
            "Waiting for checkout to complete"
        );

        let start = std::time::Instant::now();

        loop {
            // Check timeout
            if start.elapsed() > timeout {
                warn!(session_id = %session_id, "Checkout timed out");
                return Ok(LicenseCheckResult {
                    valid: false,
                    license: None,
                    reason: Some(LicenseInvalidReason::NetworkError),
                    offline_verified: false,
                });
            }

            // Poll status
            let status = self.client.get_checkout_status(session_id).await?;

            match status.status {
                CheckoutStatus::Complete => {
                    if let Some(license_key) = status.license {
                        info!(session_id = %session_id, "Checkout completed");

                        // Save and verify the license (sync operation, no await needed)
                        return self.license_manager.save_license(&license_key);
                    } else {
                        warn!(session_id = %session_id, "Checkout complete but no license key");
                        return Ok(LicenseCheckResult {
                            valid: false,
                            license: None,
                            reason: Some(LicenseInvalidReason::NotFound),
                            offline_verified: false,
                        });
                    }
                }
                CheckoutStatus::Expired => {
                    debug!(session_id = %session_id, "Checkout session expired");
                    return Ok(LicenseCheckResult {
                        valid: false,
                        license: None,
                        reason: Some(LicenseInvalidReason::Expired),
                        offline_verified: false,
                    });
                }
                CheckoutStatus::Pending => {
                    // Still waiting
                    debug!(session_id = %session_id, "Checkout still pending");
                }
            }

            // Wait before next poll
            tokio::time::sleep(poll_interval).await;
        }
    }

    // =========================================================================
    // Terminal Purchase Flow (for returning customers)
    // =========================================================================

    /// Full terminal purchase flow for returning customers
    ///
    /// This handles the complete purchase flow for customers who have
    /// previously purchased and have saved payment methods:
    ///
    /// 1. Request login OTP
    /// 2. Call `get_login_otp` callback for user input
    /// 3. Verify login and get identity token
    /// 4. Initialize purchase to get saved cards
    /// 5. Call `select_card` callback for user selection
    /// 6. Request purchase OTP
    /// 7. Call `get_purchase_otp` callback for user input
    /// 8. Confirm purchase and save license
    ///
    /// # Arguments
    ///
    /// * `email` - Customer's email address
    /// * `get_login_otp` - Async callback to get login OTP from user
    /// * `select_card` - Async callback to select a payment card
    /// * `get_purchase_otp` - Async callback to get purchase OTP from user
    ///
    /// # Returns
    ///
    /// The license check result after successful purchase.
    #[cfg(feature = "http")]
    pub async fn purchase_in_terminal<F1, F2, F3, Fut1, Fut2, Fut3>(
        &mut self,
        email: &str,
        get_login_otp: F1,
        select_card: F2,
        get_purchase_otp: F3,
    ) -> Result<LicenseCheckResult, TuishError>
    where
        F1: FnOnce(String) -> Fut1,
        Fut1: std::future::Future<Output = String>,
        F2: FnOnce(Vec<SavedCard>, i64, String) -> Fut2,
        Fut2: std::future::Future<Output = Option<String>>,
        F3: FnOnce(String) -> Fut3,
        Fut3: std::future::Future<Output = String>,
    {
        info!(email = %email, "Starting terminal purchase flow");

        // Step 1: Request login OTP
        let login_init = self.client.request_login_otp(email).await?;
        debug!(phone_masked = %login_init.phone_masked, "Login OTP requested");

        // Step 2: Get login OTP from user
        let login_otp = get_login_otp(login_init.phone_masked.clone()).await;

        // Step 3: Verify login
        let machine_fingerprint = get_machine_fingerprint();
        let login_result = self
            .client
            .verify_login(LoginVerifyRequest {
                email: email.to_string(),
                otp_id: login_init.otp_id,
                otp: login_otp,
                device_fingerprint: machine_fingerprint,
            })
            .await?;
        debug!("Login verified, got {} licenses", login_result.licenses.len());

        // Check if user already has license for this product
        for license_info in &login_result.licenses {
            if license_info.product_id == self.config.product_id
                && license_info.status == LicenseStatus::Active
            {
                info!("User already has active license for this product");
                // Note: We'd need the actual license key here, which the login flow doesn't return
                // For now, continue with purchase flow
            }
        }

        // Step 4: Initialize purchase
        let purchase_init = self.client.init_purchase(&self.config.product_id).await?;
        debug!(
            cards = purchase_init.cards.len(),
            amount = purchase_init.amount,
            "Purchase initialized"
        );

        // Step 5: User selects card
        let card_id = select_card(
            purchase_init.cards,
            purchase_init.amount,
            purchase_init.currency.clone(),
        )
        .await
        .ok_or_else(|| TuishError::ApiError {
            status: 400,
            message: "No card selected".to_string(),
        })?;

        // Step 6: Request purchase OTP
        let purchase_otp_response = self.client.request_purchase_otp().await?;
        debug!("Purchase OTP requested");

        // Step 7: Get purchase OTP from user
        let purchase_otp = get_purchase_otp(purchase_init.phone_masked).await;

        // Step 8: Confirm purchase
        let confirm_result = self
            .client
            .confirm_purchase(PurchaseConfirmRequest {
                product_id: self.config.product_id.clone(),
                card_id,
                otp_id: purchase_otp_response.otp_id,
                otp: purchase_otp,
            })
            .await?;

        if !confirm_result.success {
            return Err(TuishError::ApiError {
                status: 400,
                message: confirm_result.error.unwrap_or_else(|| "Purchase failed".to_string()),
            });
        }

        // Save and verify license
        if let Some(license_key) = confirm_result.license {
            info!("Purchase complete, saving license");
            self.license_manager.save_license(&license_key)
        } else {
            Err(TuishError::ApiError {
                status: 500,
                message: "Purchase succeeded but no license returned".to_string(),
            })
        }
    }

    // =========================================================================
    // Getters
    // =========================================================================

    /// Get the SDK configuration
    pub fn config(&self) -> &TuishConfig {
        &self.config
    }

    /// Get the product ID
    pub fn product_id(&self) -> &str {
        &self.config.product_id
    }

    /// Get the current machine fingerprint
    pub fn machine_fingerprint(&self) -> String {
        get_machine_fingerprint()
    }

    /// Get the underlying HTTP client (requires `http` feature)
    #[cfg(feature = "http")]
    pub fn client(&self) -> &TuishClient {
        &self.client
    }

    /// Get the license manager
    pub fn license_manager(&self) -> &LicenseManager {
        &self.license_manager
    }
}

// ============================================================================
// Builder
// ============================================================================

/// Builder for creating a `Tuish` instance with custom configuration
///
/// # Example
///
/// ```rust,no_run
/// use tuish::Tuish;
///
/// # fn example() -> Result<(), tuish::TuishError> {
/// let mut tuish = Tuish::builder()
///     .product_id("prod_xxx")
///     .public_key("MCowBQYDK2VwAyEA...")
///     .api_key("your-api-key")
///     .api_url("https://custom.api.tuish.dev")
///     .debug(true)
///     .build()?;
/// # Ok(())
/// # }
/// ```
#[derive(Debug, Default)]
pub struct TuishBuilder {
    product_id: Option<String>,
    public_key: Option<String>,
    api_key: Option<String>,
    api_url: Option<String>,
    storage_dir: Option<String>,
    debug: bool,
}

impl TuishBuilder {
    /// Create a new builder with default settings
    pub fn new() -> Self {
        Self::default()
    }

    /// Set the product ID (required)
    ///
    /// This is the ID of your product in the Tuish dashboard.
    pub fn product_id(mut self, id: impl Into<String>) -> Self {
        self.product_id = Some(id.into());
        self
    }

    /// Set the Ed25519 public key (required)
    ///
    /// This key is used for offline license verification.
    /// Accepts SPKI base64 format (e.g., "MCowBQYDK2VwAyEA...")
    /// or raw 64-character hex format.
    pub fn public_key(mut self, key: impl Into<String>) -> Self {
        self.public_key = Some(key.into());
        self
    }

    /// Set the API key for authenticated requests (optional)
    ///
    /// Required for online license validation and checkout flows.
    pub fn api_key(mut self, key: impl Into<String>) -> Self {
        self.api_key = Some(key.into());
        self
    }

    /// Set a custom API URL (optional)
    ///
    /// Defaults to the production Tuish API.
    pub fn api_url(mut self, url: impl Into<String>) -> Self {
        self.api_url = Some(url.into());
        self
    }

    /// Set a custom storage directory (optional)
    ///
    /// By default, licenses are stored in `~/.tuish/licenses/`.
    pub fn storage_dir(mut self, dir: impl Into<String>) -> Self {
        self.storage_dir = Some(dir.into());
        self
    }

    /// Enable debug logging (optional)
    pub fn debug(mut self, debug: bool) -> Self {
        self.debug = debug;
        self
    }

    /// Build the Tuish instance
    ///
    /// # Errors
    ///
    /// Returns an error if required fields (product_id, public_key) are not set.
    pub fn build(self) -> Result<Tuish, TuishError> {
        let product_id = self.product_id.ok_or_else(|| {
            TuishError::InvalidLicense("product_id is required".to_string())
        })?;

        let public_key = self.public_key.ok_or_else(|| {
            TuishError::InvalidPublicKey("public_key is required".to_string())
        })?;

        let config = TuishConfig {
            product_id,
            public_key,
            api_base_url: self
                .api_url
                .unwrap_or_else(|| "https://api.tuish.dev".to_string()),
            api_key: self.api_key,
            storage_dir: self.storage_dir,
            debug: self.debug,
        };

        Tuish::new(config)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_builder_missing_product_id() {
        let result = Tuish::builder()
            .public_key("test-key")
            .build();

        assert!(result.is_err());
    }

    #[test]
    fn test_builder_missing_public_key() {
        let result = Tuish::builder()
            .product_id("prod_test")
            .build();

        assert!(result.is_err());
    }

    #[test]
    fn test_checkout_session_fields() {
        let session = CheckoutSession {
            session_id: "sess_123".to_string(),
            checkout_url: "https://checkout.tuish.dev/sess_123".to_string(),
        };

        assert_eq!(session.session_id, "sess_123");
        assert!(session.checkout_url.contains("sess_123"));
    }
}

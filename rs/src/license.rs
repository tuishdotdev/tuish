//! License management for offline-first verification
//!
//! This module provides the `LicenseManager` which orchestrates:
//! - Offline license verification using Ed25519 signatures
//! - Caching licenses to disk for offline use
//! - Online validation when cache is stale (if http feature enabled)
//!
//! The verification flow matches the TypeScript SDK:
//! 1. Load cached license from disk
//! 2. If no cache, return { valid: false, reason: "not_found" }
//! 3. Verify offline (signature, expiration, machine ID)
//! 4. If invalid, return failure with reason
//! 5. If valid and cache fresh (< 24h), return success
//! 6. If cache stale, mark needs_refresh: true

use base64::Engine;
use tracing::{debug, info, warn};

use crate::crypto::{extract_license_payload, verify_license};
use crate::error::{LicenseInvalidReason, TuishError};
use crate::fingerprint::get_machine_fingerprint;
use crate::storage::LicenseStorage;
use crate::types::{
    CachedLicenseData, LicenseCheckResult, LicenseDetails, LicensePayload, LicenseStatus,
    TuishConfig,
};

#[cfg(feature = "http")]
use crate::client::TuishClient;

/// Ed25519 SPKI header in base64 (for detecting SPKI format)
const ED25519_SPKI_HEADER: &str = "MCowBQYDK2VwAyEA";

/// License manager handles verification and caching.
///
/// Provides offline-first license verification with automatic caching
/// and machine fingerprint validation. The API matches the TypeScript SDK.
///
/// # Example
///
/// ```rust,no_run
/// use tuish::{LicenseManager, TuishConfig};
///
/// # fn example() -> Result<(), tuish::TuishError> {
/// let config = TuishConfig::new("prod_123", "your-public-key-here");
/// let mut manager = LicenseManager::new(config)?;
///
/// let result = manager.check_license();
/// if result.valid {
///     println!("License is valid!");
/// } else {
///     println!("License invalid: {:?}", result.reason);
/// }
/// # Ok(())
/// # }
/// ```
#[derive(Debug)]
pub struct LicenseManager {
    /// Configuration for this manager
    config: TuishConfig,
    /// Parsed public key in hex format (for crypto operations)
    public_key_hex: String,
    /// License storage for caching
    storage: LicenseStorage,
    /// HTTP client for online validation
    #[cfg(feature = "http")]
    client: Option<TuishClient>,
    /// Cached machine fingerprint
    machine_fingerprint: Option<String>,
}

impl LicenseManager {
    /// Create a new LicenseManager with the given configuration.
    ///
    /// # Arguments
    ///
    /// * `config` - Configuration including product ID and public key.
    ///
    /// # Errors
    ///
    /// Returns an error if the storage directory cannot be created or
    /// the public key format is invalid.
    pub fn new(config: TuishConfig) -> Result<Self, TuishError> {
        let storage = if let Some(ref dir) = config.storage_dir {
            LicenseStorage::with_base_dir(dir.into()).with_debug(config.debug)
        } else {
            LicenseStorage::new()?.with_debug(config.debug)
        };

        let public_key_hex = parse_public_key(&config.public_key)?;

        if config.debug {
            debug!(
                product_id = %config.product_id,
                public_key_prefix = %public_key_hex.chars().take(16).collect::<String>(),
                "Initialized LicenseManager"
            );
        }

        Ok(Self {
            config,
            public_key_hex,
            storage,
            #[cfg(feature = "http")]
            client: None,
            machine_fingerprint: None,
        })
    }

    /// Create a LicenseManager with an HTTP client for online validation.
    #[cfg(feature = "http")]
    pub fn with_client(config: TuishConfig, client: TuishClient) -> Result<Self, TuishError> {
        let mut manager = Self::new(config)?;
        manager.client = Some(client);
        Ok(manager)
    }

    /// Get the machine fingerprint, caching it for subsequent calls.
    pub fn get_machine_fingerprint(&mut self) -> &str {
        if self.machine_fingerprint.is_none() {
            self.machine_fingerprint = Some(get_machine_fingerprint());
        }
        self.machine_fingerprint.as_ref().unwrap()
    }

    /// Check if the user has a valid license (async version).
    ///
    /// This is the main entry point for async license verification. It follows
    /// the TypeScript SDK flow:
    /// 1. Loads any cached license from disk
    /// 2. If no cache, returns { valid: false, reason: "not_found" }
    /// 3. Verifies the license offline (signature, expiration, machine ID)
    /// 4. If invalid, returns failure with reason
    /// 5. If valid and cache fresh (< 24h), returns success
    /// 6. If cache stale, the caller should refresh online
    ///
    /// # Returns
    ///
    /// Returns a `LicenseCheckResult` indicating:
    /// - `valid`: Whether the license is currently valid
    /// - `license`: License details if valid or partially valid
    /// - `reason`: Reason for invalid license
    /// - `offline_verified`: Always true for this method
    pub async fn check_license_async(&mut self) -> Result<LicenseCheckResult, TuishError> {
        let machine_fingerprint = self.get_machine_fingerprint().to_string();

        // Try to load cached license
        let cached = self.storage.load_license(&self.config.product_id).await?;

        match cached {
            Some(cached_data) => {
                if self.config.debug {
                    debug!("Found cached license, verifying offline");
                }

                // Verify offline
                let result = self.verify_offline(&cached_data.license_key, &machine_fingerprint);

                match &result {
                    Ok(check_result) if check_result.valid => {
                        // Check if cache needs refresh
                        let needs_refresh = self.storage.needs_refresh(&cached_data);
                        if needs_refresh && self.config.debug {
                            debug!("Cache is stale, recommend online refresh");
                        }

                        info!(
                            license_id = check_result.license.as_ref().map(|l| l.id.as_str()).unwrap_or("unknown"),
                            needs_refresh = needs_refresh,
                            "License verified successfully"
                        );

                        Ok(check_result.clone())
                    }
                    Ok(check_result) => {
                        // Offline verification failed
                        if self.config.debug {
                            debug!(
                                reason = ?check_result.reason,
                                "Offline verification failed"
                            );
                        }

                        // Remove invalid cached license
                        if let Err(e) = self.storage.delete_license(&self.config.product_id).await {
                            warn!(error = %e, "Failed to remove invalid cached license");
                        }

                        Ok(check_result.clone())
                    }
                    Err(e) => Err(e.clone()),
                }
            }
            None => {
                if self.config.debug {
                    debug!("No cached license found");
                }

                Ok(LicenseCheckResult {
                    valid: false,
                    license: None,
                    reason: Some(LicenseInvalidReason::NotFound),
                    offline_verified: false,
                })
            }
        }
    }

    /// Verify a license offline using the public key.
    ///
    /// Performs cryptographic verification of the license signature,
    /// checks expiration, and validates machine binding.
    ///
    /// # Arguments
    ///
    /// * `license_key` - The license key string to verify.
    /// * `machine_fingerprint` - The machine fingerprint to validate against.
    ///
    /// # Returns
    ///
    /// Returns a `LicenseCheckResult` with:
    /// - `valid`: Whether the license passed all checks
    /// - `license`: License details (even if expired or invalid)
    /// - `reason`: Specific reason for invalid license
    /// - `offline_verified`: Always true
    pub fn verify_offline(
        &self,
        license_key: &str,
        machine_fingerprint: &str,
    ) -> Result<LicenseCheckResult, TuishError> {
        match verify_license(license_key, &self.public_key_hex, Some(machine_fingerprint)) {
            Ok(payload) => {
                // Check if license is for this product
                if payload.pid != self.config.product_id {
                    if self.config.debug {
                        debug!(
                            expected = %self.config.product_id,
                            actual = %payload.pid,
                            "License is for different product"
                        );
                    }
                    return Ok(LicenseCheckResult {
                        valid: false,
                        license: None,
                        reason: Some(LicenseInvalidReason::InvalidFormat),
                        offline_verified: true,
                    });
                }

                let license = payload_to_details(&payload, LicenseStatus::Active);
                Ok(LicenseCheckResult {
                    valid: true,
                    license: Some(license),
                    reason: None,
                    offline_verified: true,
                })
            }
            Err(TuishError::ExpiredLicense) => {
                // Extract payload for display even though expired
                let license = extract_license_payload(license_key)
                    .map(|p| payload_to_details(&p, LicenseStatus::Expired));

                Ok(LicenseCheckResult {
                    valid: false,
                    license,
                    reason: Some(LicenseInvalidReason::Expired),
                    offline_verified: true,
                })
            }
            Err(TuishError::InvalidSignature) => Ok(LicenseCheckResult {
                valid: false,
                license: None,
                reason: Some(LicenseInvalidReason::InvalidSignature),
                offline_verified: true,
            }),
            Err(TuishError::InvalidMachineId) => {
                let license = extract_license_payload(license_key)
                    .map(|p| payload_to_details(&p, LicenseStatus::Revoked));

                Ok(LicenseCheckResult {
                    valid: false,
                    license,
                    reason: Some(LicenseInvalidReason::MachineMismatch),
                    offline_verified: true,
                })
            }
            Err(TuishError::InvalidLicense(_)) => Ok(LicenseCheckResult {
                valid: false,
                license: None,
                reason: Some(LicenseInvalidReason::InvalidFormat),
                offline_verified: true,
            }),
            Err(e) => Err(e),
        }
    }

    /// Save a new license key to the cache (async version).
    ///
    /// # Arguments
    ///
    /// * `license_key` - The license key to save.
    ///
    /// # Returns
    ///
    /// Returns the verification result for the saved license.
    pub async fn save_license_async(
        &mut self,
        license_key: &str,
    ) -> Result<LicenseCheckResult, TuishError> {
        let machine_fingerprint = self.get_machine_fingerprint().to_string();

        // Verify the license first
        let result = self.verify_offline(license_key, &machine_fingerprint)?;

        if result.valid {
            // Save to cache
            self.storage
                .save_license_key(&self.config.product_id, license_key, &machine_fingerprint)
                .await?;

            if self.config.debug {
                debug!("Saved license to cache");
            }
        }

        Ok(result)
    }

    /// Clear the cached license (async version).
    pub async fn clear_license_async(&mut self) -> Result<(), TuishError> {
        self.storage.delete_license(&self.config.product_id).await?;

        if self.config.debug {
            debug!("Cleared cached license");
        }

        Ok(())
    }

    /// Get the cached license data without verification.
    ///
    /// This returns the raw cached data for inspection without
    /// performing cryptographic verification.
    pub async fn get_cached_license(&self) -> Result<Option<CachedLicenseData>, TuishError> {
        self.storage.load_license(&self.config.product_id).await
    }

    /// Extract license info from a key without verification.
    ///
    /// **Warning**: This does not verify the signature! Only use for
    /// display purposes.
    ///
    /// # Arguments
    ///
    /// * `license_key` - The license key to extract info from.
    ///
    /// # Returns
    ///
    /// Returns license details if the format is valid, `None` otherwise.
    pub fn extract_license_info(&self, license_key: &str) -> Option<LicenseDetails> {
        extract_license_payload(license_key).map(|payload| {
            let status = if payload.is_expired() {
                LicenseStatus::Expired
            } else {
                LicenseStatus::Active
            };
            payload_to_details(&payload, status)
        })
    }

    /// Check if a cached license needs online refresh.
    ///
    /// # Returns
    ///
    /// Returns `true` if:
    /// - A cached license exists AND
    /// - The cache is older than 24 hours
    ///
    /// Returns `false` if no cache exists or the cache is fresh.
    pub async fn needs_online_refresh(&self) -> Result<bool, TuishError> {
        match self.storage.load_license(&self.config.product_id).await? {
            Some(cached) => Ok(self.storage.needs_refresh(&cached)),
            None => Ok(false),
        }
    }

    /// Get the product ID for this manager.
    pub fn product_id(&self) -> &str {
        &self.config.product_id
    }

    /// Get the configuration for this manager.
    pub fn config(&self) -> &TuishConfig {
        &self.config
    }

    // =========================================================================
    // Online Validation (requires http feature)
    // =========================================================================

    /// Validate license online via API.
    #[cfg(feature = "http")]
    pub async fn validate_online(&self, license_key: &str) -> Result<LicenseCheckResult, TuishError> {
        let client = self.client.as_ref().ok_or_else(|| {
            TuishError::FeatureNotAvailable("HTTP client not configured".to_string())
        })?;

        let machine_fingerprint = get_machine_fingerprint();
        let req = crate::types::LicenseValidateRequest {
            license_key: license_key.to_string(),
            machine_fingerprint: machine_fingerprint.clone(),
        };

        let response = client.validate_license(req).await?;

        if response.valid {
            // Save the validated license
            self.storage
                .save_license_key(&self.config.product_id, license_key, &machine_fingerprint)
                .await?;

            let details = response.license.map(|info| LicenseDetails {
                id: info.id,
                product_id: info.product_id,
                product_name: Some(info.product_name),
                features: info.features,
                status: info.status,
                issued_at: info.issued_at,
                expires_at: info.expires_at,
            });

            Ok(LicenseCheckResult {
                valid: true,
                license: details,
                reason: None,
                offline_verified: false,
            })
        } else {
            let reason = match response.reason {
                Some(crate::types::ApiValidationReason::Expired) => LicenseInvalidReason::Expired,
                Some(crate::types::ApiValidationReason::Revoked) => LicenseInvalidReason::Revoked,
                Some(crate::types::ApiValidationReason::MachineMismatch) => {
                    LicenseInvalidReason::MachineMismatch
                }
                _ => LicenseInvalidReason::NotFound,
            };

            Ok(LicenseCheckResult {
                valid: false,
                license: None,
                reason: Some(reason),
                offline_verified: false,
            })
        }
    }

    // =========================================================================
    // Synchronous API (for non-async contexts)
    // =========================================================================

    /// Check if the user has a valid license.
    ///
    /// This is the primary sync API for license verification.
    pub fn check_license(&mut self) -> LicenseCheckResult {
        let machine_fingerprint = self.get_machine_fingerprint().to_string();

        // Try to load cached license
        let cached = match self.storage.load_license_sync(&self.config.product_id) {
            Ok(c) => c,
            Err(e) => {
                warn!(error = %e, "Failed to load cached license");
                return LicenseCheckResult {
                    valid: false,
                    license: None,
                    reason: Some(LicenseInvalidReason::NotFound),
                    offline_verified: false,
                };
            }
        };

        match cached {
            Some(cached_data) => {
                if self.config.debug {
                    debug!("Found cached license, verifying offline");
                }

                match self.verify_offline(&cached_data.license_key, &machine_fingerprint) {
                    Ok(result) if result.valid => result,
                    Ok(result) => {
                        // Remove invalid cached license
                        if let Err(e) = self.storage.delete_license_sync(&self.config.product_id) {
                            warn!(error = %e, "Failed to remove invalid cached license");
                        }
                        result
                    }
                    Err(e) => {
                        warn!(error = %e, "License verification error");
                        LicenseCheckResult {
                            valid: false,
                            license: None,
                            reason: Some(LicenseInvalidReason::InvalidFormat),
                            offline_verified: true,
                        }
                    }
                }
            }
            None => {
                if self.config.debug {
                    debug!("No cached license found");
                }

                LicenseCheckResult {
                    valid: false,
                    license: None,
                    reason: Some(LicenseInvalidReason::NotFound),
                    offline_verified: false,
                }
            }
        }
    }

    /// Save a license key.
    pub fn save_license(&mut self, license_key: &str) -> Result<LicenseCheckResult, TuishError> {
        let machine_fingerprint = self.get_machine_fingerprint().to_string();
        let result = self.verify_offline(license_key, &machine_fingerprint)?;

        if result.valid {
            let now = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_millis() as i64)
                .unwrap_or(0);

            let data = CachedLicenseData {
                license_key: license_key.to_string(),
                cached_at: now,
                refresh_at: now + 24 * 60 * 60 * 1000, // 24 hours
                product_id: self.config.product_id.clone(),
                machine_fingerprint,
            };

            self.storage.save_license_sync(&self.config.product_id, &data)?;
        }

        Ok(result)
    }

    /// Clear the cached license.
    pub fn clear_license(&mut self) -> Result<(), TuishError> {
        self.storage.delete_license_sync(&self.config.product_id)
    }

    /// Alias for `check_license` (for backward compatibility).
    #[inline]
    pub fn check_license_sync(&mut self) -> LicenseCheckResult {
        self.check_license()
    }

    /// Alias for `save_license` (for backward compatibility).
    #[inline]
    pub fn save_license_sync(&mut self, license_key: &str) -> Result<LicenseCheckResult, TuishError> {
        self.save_license(license_key)
    }

    /// Alias for `clear_license` (for backward compatibility).
    #[inline]
    pub fn clear_license_sync(&mut self) -> Result<(), TuishError> {
        self.clear_license()
    }

    /// Get the cached license key (synchronous version).
    pub fn get_cached_license_key(&self) -> Option<String> {
        self.storage.get_license_key_sync(&self.config.product_id)
    }

    /// Check if cache needs refresh (synchronous version).
    pub fn needs_refresh_sync(&self) -> bool {
        self.storage
            .load_license_sync(&self.config.product_id)
            .ok()
            .flatten()
            .map(|cached| self.storage.needs_refresh(&cached))
            .unwrap_or(false)
    }

    /// Verify a license key and return the check result (synchronous).
    ///
    /// This is the main verification method used by the Tuish high-level API.
    pub fn verify_license_key(&self, license_key: &str) -> LicenseCheckResult {
        let machine_fingerprint = get_machine_fingerprint();

        match self.verify_offline(license_key, &machine_fingerprint) {
            Ok(result) if result.valid => {
                // Check if license is for this product
                if let Some(ref license) = result.license {
                    if license.product_id != self.config.product_id {
                        return LicenseCheckResult {
                            valid: false,
                            license: None,
                            reason: Some(LicenseInvalidReason::InvalidFormat),
                            offline_verified: true,
                        };
                    }
                }
                result
            }
            Ok(result) => result,
            Err(e) => {
                warn!(error = %e, "License verification error");
                LicenseCheckResult {
                    valid: false,
                    license: None,
                    reason: Some(LicenseInvalidReason::InvalidFormat),
                    offline_verified: true,
                }
            }
        }
    }
}

/// Convert a license payload to license details.
fn payload_to_details(payload: &LicensePayload, status: LicenseStatus) -> LicenseDetails {
    LicenseDetails {
        id: payload.lid.clone(),
        product_id: payload.pid.clone(),
        product_name: None,
        features: payload.features.clone(),
        status,
        issued_at: payload.iat,
        expires_at: payload.exp,
    }
}

/// Parse a public key from SPKI base64 or hex format.
///
/// Returns the raw 32-byte key as a hex string.
fn parse_public_key(public_key: &str) -> Result<String, TuishError> {
    // Check if it's SPKI base64 format
    if public_key.starts_with(ED25519_SPKI_HEADER) || public_key.starts_with("MCoq") {
        let decoded = base64::engine::general_purpose::STANDARD
            .decode(public_key)
            .map_err(|e| TuishError::InvalidPublicKey(format!("invalid SPKI base64: {}", e)))?;

        // SPKI format: 12 byte header + 32 byte key
        if decoded.len() != 44 {
            return Err(TuishError::InvalidPublicKey(format!(
                "expected 44 bytes for SPKI key, got {}",
                decoded.len()
            )));
        }

        // Extract the raw key (last 32 bytes)
        let raw_key = &decoded[12..];
        return Ok(raw_key.iter().map(|b| format!("{:02x}", b)).collect());
    }

    // Check if it's already hex format (64 characters = 32 bytes)
    if public_key.len() == 64 && public_key.chars().all(|c| c.is_ascii_hexdigit()) {
        return Ok(public_key.to_lowercase());
    }

    Err(TuishError::InvalidPublicKey(
        "expected SPKI base64 (MCow...) or 64-character hex string".to_string(),
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::crypto::to_base64url;
    use tempfile::TempDir;

    // Test public key (same as in crypto.rs tests)
    const TEST_PUBLIC_KEY_HEX: &str =
        "cf71e737c27c3be902373e21d47a0a2cb406a4c67d3eeef11fb73b37828d40de";
    const TEST_PUBLIC_KEY_SPKI: &str = "MCowBQYDK2VwAyEAz3HnN8J8O+kCNz4h1HoKLLQGpMZ9Pu7xH7c7N4KNQN4=";

    fn create_test_config(temp_dir: &TempDir) -> TuishConfig {
        TuishConfig::new("prod_test", TEST_PUBLIC_KEY_HEX)
            .with_storage_dir(temp_dir.path().to_string_lossy().to_string())
            .with_debug(true)
    }

    fn create_test_license(expired: bool, machine_id: Option<&str>) -> String {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as i64;

        let exp = if expired {
            now - 10000 // 10 seconds ago
        } else {
            now + 86400000 // 24 hours from now
        };

        let header = to_base64url(br#"{"alg":"ed25519","ver":1}"#);
        let payload = format!(
            r#"{{"lid":"lic_123","pid":"prod_test","cid":"cus_456","did":"dev_789","features":["pro"],"iat":{},"exp":{},"mid":{}}}"#,
            now - 1000,
            exp,
            match machine_id {
                Some(mid) => format!("\"{}\"", mid),
                None => "null".to_string(),
            }
        );
        let payload_b64 = to_base64url(payload.as_bytes());
        let sig = to_base64url(&[0u8; 64]); // Fake signature (won't verify)

        format!("{}.{}.{}", header, payload_b64, sig)
    }

    #[test]
    fn test_parse_public_key_hex() {
        let result = parse_public_key(TEST_PUBLIC_KEY_HEX);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), TEST_PUBLIC_KEY_HEX);
    }

    #[test]
    fn test_parse_public_key_spki() {
        let result = parse_public_key(TEST_PUBLIC_KEY_SPKI);
        assert!(result.is_ok());
        // Should extract the raw key as hex
        let hex = result.unwrap();
        assert_eq!(hex.len(), 64);
        assert!(hex.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn test_parse_public_key_invalid() {
        // Too short
        assert!(parse_public_key("abc123").is_err());

        // Invalid characters
        assert!(parse_public_key(
            "gg71e737c27c3be902373e21d47a0a2cb406a4c67d3eeef11fb73b37828d40de"
        )
        .is_err());
    }

    #[tokio::test]
    async fn test_license_manager_new() {
        let temp_dir = TempDir::new().unwrap();
        let config = create_test_config(&temp_dir);

        let manager = LicenseManager::new(config);
        assert!(manager.is_ok());

        let manager = manager.unwrap();
        assert_eq!(manager.product_id(), "prod_test");
    }

    #[test]
    fn test_license_manager_no_cached_license() {
        let temp_dir = TempDir::new().unwrap();
        let config = create_test_config(&temp_dir);
        let mut manager = LicenseManager::new(config).unwrap();

        let result = manager.check_license();
        assert!(!result.valid);
        assert_eq!(result.reason, Some(LicenseInvalidReason::NotFound));
    }

    #[tokio::test]
    async fn test_extract_license_info() {
        let temp_dir = TempDir::new().unwrap();
        let config = create_test_config(&temp_dir);
        let manager = LicenseManager::new(config).unwrap();

        let license = create_test_license(false, None);
        let info = manager.extract_license_info(&license);

        assert!(info.is_some());
        let info = info.unwrap();
        assert_eq!(info.id, "lic_123");
        assert_eq!(info.product_id, "prod_test");
        assert!(info.features.contains(&"pro".to_string()));
        assert_eq!(info.status, LicenseStatus::Active);
    }

    #[tokio::test]
    async fn test_extract_license_info_expired() {
        let temp_dir = TempDir::new().unwrap();
        let config = create_test_config(&temp_dir);
        let manager = LicenseManager::new(config).unwrap();

        let license = create_test_license(true, None);
        let info = manager.extract_license_info(&license);

        assert!(info.is_some());
        let info = info.unwrap();
        assert_eq!(info.status, LicenseStatus::Expired);
    }

    #[tokio::test]
    async fn test_get_machine_fingerprint() {
        let temp_dir = TempDir::new().unwrap();
        let config = create_test_config(&temp_dir);
        let mut manager = LicenseManager::new(config).unwrap();

        let fp1 = manager.get_machine_fingerprint().to_string();
        let fp2 = manager.get_machine_fingerprint().to_string();

        // Should be consistent
        assert_eq!(fp1, fp2);

        // Should be valid hex
        assert_eq!(fp1.len(), 64);
        assert!(fp1.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn test_clear_license() {
        let temp_dir = TempDir::new().unwrap();
        let config = create_test_config(&temp_dir);
        let mut manager = LicenseManager::new(config).unwrap();

        // Clear should work even when no license exists
        let result = manager.clear_license();
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_get_cached_license_none() {
        let temp_dir = TempDir::new().unwrap();
        let config = create_test_config(&temp_dir);
        let manager = LicenseManager::new(config).unwrap();

        let result = manager.get_cached_license().await;
        assert!(result.is_ok());
        assert!(result.unwrap().is_none());
    }

    #[tokio::test]
    async fn test_needs_online_refresh_no_cache() {
        let temp_dir = TempDir::new().unwrap();
        let config = create_test_config(&temp_dir);
        let manager = LicenseManager::new(config).unwrap();

        let result = manager.needs_online_refresh().await;
        assert!(result.is_ok());
        assert!(!result.unwrap()); // No cache means no refresh needed
    }

    #[tokio::test]
    async fn test_payload_to_details() {
        let payload = LicensePayload {
            lid: "lic_test".to_string(),
            pid: "prod_test".to_string(),
            cid: "cus_test".to_string(),
            did: "dev_test".to_string(),
            features: vec!["pro".to_string(), "analytics".to_string()],
            iat: 1000,
            exp: Some(2000),
            mid: None,
        };

        let details = payload_to_details(&payload, LicenseStatus::Active);

        assert_eq!(details.id, "lic_test");
        assert_eq!(details.product_id, "prod_test");
        assert_eq!(details.features.len(), 2);
        assert_eq!(details.status, LicenseStatus::Active);
        assert_eq!(details.issued_at, 1000);
        assert_eq!(details.expires_at, Some(2000));
        assert!(details.product_name.is_none());
    }

    #[test]
    fn test_verify_offline_invalid_format() {
        let temp_dir = TempDir::new().unwrap();
        let config = create_test_config(&temp_dir);
        let manager = LicenseManager::new(config).unwrap();

        let result = manager.verify_offline("invalid-license", "machine-id");
        assert!(result.is_ok());

        let result = result.unwrap();
        assert!(!result.valid);
        assert_eq!(result.reason, Some(LicenseInvalidReason::InvalidFormat));
    }

    #[test]
    fn test_sync_api() {
        let temp_dir = TempDir::new().unwrap();
        let config = create_test_config(&temp_dir);
        let mut manager = LicenseManager::new(config).unwrap();

        // Check with no license
        let result = manager.check_license_sync();
        assert!(!result.valid);
        assert_eq!(result.reason, Some(LicenseInvalidReason::NotFound));

        // Clear should work
        assert!(manager.clear_license_sync().is_ok());

        // Needs refresh should be false
        assert!(!manager.needs_refresh_sync());
    }
}

//! License file storage for offline caching
//!
//! This module provides file-based storage for caching licenses locally.
//! Licenses are stored in `~/.tuish/licenses/` with filenames based on
//! a SHA256 hash of the product ID.
//!
//! The storage format and behavior matches the TypeScript SDK exactly:
//! - Cache directory: `~/.tuish/licenses/`
//! - File naming: First 16 hex chars of SHA256(product_id) + `.json`
//! - Cache refresh: 24 hours

use sha2::{Digest, Sha256};
use std::path::PathBuf;
use tokio::fs;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tracing::{debug, trace, warn};

use crate::error::TuishError;
use crate::types::CachedLicenseData;

/// Default storage directory: ~/.tuish/licenses/
const DEFAULT_STORAGE_SUBDIR: &str = ".tuish/licenses";

/// Cache refresh interval in hours (matches TypeScript SDK)
const CACHE_REFRESH_HOURS: i64 = 24;

/// Cache refresh interval in milliseconds
const CACHE_REFRESH_MS: i64 = CACHE_REFRESH_HOURS * 60 * 60 * 1000;

/// File-based license storage for caching licenses locally.
///
/// Licenses are stored as JSON files in the storage directory, with
/// filenames based on a truncated SHA256 hash of the product ID.
///
/// # Example
///
/// ```rust,no_run
/// use tuish::storage::LicenseStorage;
/// use tuish::types::CachedLicenseData;
///
/// # async fn example() -> Result<(), tuish::TuishError> {
/// let storage = LicenseStorage::new()?;
///
/// // Load a cached license
/// if let Some(cached) = storage.load_license("prod_123").await? {
///     println!("Found cached license: {}", cached.license_key);
/// }
/// # Ok(())
/// # }
/// ```
#[derive(Debug, Clone)]
pub struct LicenseStorage {
    /// Base directory for license storage
    base_dir: PathBuf,
    /// Enable debug logging
    debug: bool,
}

impl LicenseStorage {
    /// Create a new LicenseStorage with the default directory (~/.tuish/licenses/).
    ///
    /// # Errors
    ///
    /// Returns an error if the home directory cannot be determined.
    #[cfg(feature = "storage")]
    pub fn new() -> Result<Self, TuishError> {
        let home_dir = dirs::home_dir().ok_or_else(|| {
            TuishError::StorageError("could not determine home directory".to_string())
        })?;

        let base_dir = home_dir.join(DEFAULT_STORAGE_SUBDIR);

        Ok(Self {
            base_dir,
            debug: false,
        })
    }

    #[cfg(not(feature = "storage"))]
    pub fn new() -> Result<Self, TuishError> {
        Err(TuishError::FeatureNotAvailable(
            "storage feature not enabled".to_string(),
        ))
    }

    /// Create a new LicenseStorage with a custom base directory.
    ///
    /// # Arguments
    ///
    /// * `dir` - The directory to store license files in.
    pub fn with_base_dir(dir: PathBuf) -> Self {
        Self {
            base_dir: dir,
            debug: false,
        }
    }

    /// Enable or disable debug logging.
    pub fn with_debug(mut self, debug: bool) -> Self {
        self.debug = debug;
        self
    }

    /// Get the storage directory path.
    pub fn base_dir(&self) -> &PathBuf {
        &self.base_dir
    }

    /// Get the file path for a product's license cache.
    ///
    /// The filename is the first 16 hex characters of SHA256(product_id).json
    /// This matches the TypeScript SDK behavior.
    fn get_license_path(&self, product_id: &str) -> PathBuf {
        let hash = self.hash_product_id(product_id);
        self.base_dir.join(format!("{}.json", hash))
    }

    /// Hash a product ID to create a safe filename.
    ///
    /// Returns the first 16 hex characters of SHA256(product_id).
    /// This matches the TypeScript SDK: `sha256(productId).slice(0, 16)`
    fn hash_product_id(&self, product_id: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(product_id.as_bytes());
        let result = hasher.finalize();

        // Take first 8 bytes (16 hex chars) - matches TypeScript SDK
        result
            .iter()
            .take(8)
            .map(|b| format!("{:02x}", b))
            .collect()
    }

    /// Ensure the storage directory exists.
    async fn ensure_storage_dir(&self) -> Result<(), TuishError> {
        if !self.base_dir.exists() {
            fs::create_dir_all(&self.base_dir).await.map_err(|e| {
                TuishError::StorageError(format!(
                    "failed to create storage directory {:?}: {}",
                    self.base_dir, e
                ))
            })?;

            if self.debug {
                debug!(path = ?self.base_dir, "Created storage directory");
            }
        }
        Ok(())
    }

    /// Load a cached license from disk.
    ///
    /// # Arguments
    ///
    /// * `product_id` - The product ID to load the license for.
    ///
    /// # Returns
    ///
    /// Returns `Ok(Some(data))` if a cached license exists and is valid,
    /// `Ok(None)` if no cache exists, or an error if reading fails.
    pub async fn load_license(
        &self,
        product_id: &str,
    ) -> Result<Option<CachedLicenseData>, TuishError> {
        let path = self.get_license_path(product_id);

        if !path.exists() {
            trace!(product_id = product_id, "No cached license found");
            return Ok(None);
        }

        let mut file = match fs::File::open(&path).await {
            Ok(f) => f,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(None),
            Err(e) => {
                return Err(TuishError::StorageError(format!(
                    "failed to open cache file: {}",
                    e
                )));
            }
        };

        let mut contents = String::new();
        file.read_to_string(&mut contents).await.map_err(|e| {
            TuishError::StorageError(format!("failed to read cache file: {}", e))
        })?;

        let data: CachedLicenseData = serde_json::from_str(&contents).map_err(|e| {
            TuishError::StorageError(format!("failed to parse cache file: {}", e))
        })?;

        if self.debug {
            debug!(product_id = product_id, path = ?path, "Loaded cached license");
        }

        Ok(Some(data))
    }

    /// Save a license to disk.
    ///
    /// # Arguments
    ///
    /// * `product_id` - The product ID to save the license for.
    /// * `data` - The license data to cache.
    ///
    /// # Errors
    ///
    /// Returns an error if writing fails, but this should not break the app.
    pub async fn save_license(
        &self,
        product_id: &str,
        data: &CachedLicenseData,
    ) -> Result<(), TuishError> {
        self.ensure_storage_dir().await?;

        let path = self.get_license_path(product_id);
        let json =
            serde_json::to_string_pretty(data).map_err(|e| {
                TuishError::StorageError(format!("failed to serialize license: {}", e))
            })?;

        let mut file = fs::File::create(&path).await.map_err(|e| {
            TuishError::StorageError(format!("failed to create cache file: {}", e))
        })?;

        file.write_all(json.as_bytes()).await.map_err(|e| {
            TuishError::StorageError(format!("failed to write cache file: {}", e))
        })?;

        if self.debug {
            debug!(product_id = product_id, path = ?path, "Saved license to cache");
        }

        Ok(())
    }

    /// Save a license with automatic timestamp management.
    ///
    /// Creates a `CachedLicenseData` with current timestamps and saves it.
    /// This matches the TypeScript SDK behavior.
    ///
    /// # Arguments
    ///
    /// * `product_id` - The product ID.
    /// * `license_key` - The raw license key string.
    /// * `machine_fingerprint` - The machine fingerprint used for this license.
    pub async fn save_license_key(
        &self,
        product_id: &str,
        license_key: &str,
        machine_fingerprint: &str,
    ) -> Result<(), TuishError> {
        let now = current_time_millis();
        let data = CachedLicenseData {
            license_key: license_key.to_string(),
            cached_at: now,
            refresh_at: now + CACHE_REFRESH_MS,
            product_id: product_id.to_string(),
            machine_fingerprint: machine_fingerprint.to_string(),
        };

        self.save_license(product_id, &data).await
    }

    /// Delete a cached license.
    ///
    /// # Arguments
    ///
    /// * `product_id` - The product ID to delete the cache for.
    ///
    /// # Errors
    ///
    /// Returns an error if deletion fails for reasons other than the file not existing.
    pub async fn delete_license(&self, product_id: &str) -> Result<(), TuishError> {
        let path = self.get_license_path(product_id);

        if path.exists() {
            fs::remove_file(&path).await.map_err(|e| {
                TuishError::StorageError(format!("failed to delete cache file: {}", e))
            })?;

            if self.debug {
                debug!(product_id = product_id, path = ?path, "Deleted cached license");
            }
        }

        Ok(())
    }

    /// Check if a cached license needs to be refreshed online.
    ///
    /// Returns `true` if the current time is past the `refresh_at` timestamp.
    /// This matches the TypeScript SDK behavior (24-hour refresh interval).
    ///
    /// # Arguments
    ///
    /// * `cached` - The cached license data to check.
    pub fn needs_refresh(&self, cached: &CachedLicenseData) -> bool {
        let now = current_time_millis();
        now >= cached.refresh_at
    }

    /// Clear all cached licenses.
    ///
    /// Removes all `.json` files from the storage directory.
    pub async fn clear_all(&self) -> Result<(), TuishError> {
        if !self.base_dir.exists() {
            return Ok(());
        }

        let mut entries = fs::read_dir(&self.base_dir).await.map_err(|e| {
            TuishError::StorageError(format!("failed to read storage directory: {}", e))
        })?;

        while let Some(entry) = entries.next_entry().await.map_err(|e| {
            TuishError::StorageError(format!("failed to read directory entry: {}", e))
        })? {
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("json") {
                if let Err(e) = fs::remove_file(&path).await {
                    warn!(path = ?path, error = %e, "Failed to remove cache file");
                }
            }
        }

        if self.debug {
            debug!(path = ?self.base_dir, "Cleared all cached licenses");
        }

        Ok(())
    }

    // =========================================================================
    // Synchronous API (for non-async contexts)
    // =========================================================================

    /// Load a cached license from disk (synchronous version).
    pub fn load_license_sync(&self, product_id: &str) -> Result<Option<CachedLicenseData>, TuishError> {
        let path = self.get_license_path(product_id);

        if !path.exists() {
            return Ok(None);
        }

        let contents = std::fs::read_to_string(&path).map_err(|e| {
            if e.kind() == std::io::ErrorKind::NotFound {
                return TuishError::StorageError("file not found".to_string());
            }
            TuishError::StorageError(format!("failed to read cache file: {}", e))
        })?;

        let data: CachedLicenseData = serde_json::from_str(&contents).map_err(|e| {
            TuishError::StorageError(format!("failed to parse cache file: {}", e))
        })?;

        Ok(Some(data))
    }

    /// Save a license to disk (synchronous version).
    pub fn save_license_sync(
        &self,
        product_id: &str,
        data: &CachedLicenseData,
    ) -> Result<(), TuishError> {
        // Ensure directory exists
        if !self.base_dir.exists() {
            std::fs::create_dir_all(&self.base_dir).map_err(|e| {
                TuishError::StorageError(format!(
                    "failed to create storage directory: {}",
                    e
                ))
            })?;
        }

        let path = self.get_license_path(product_id);
        let json = serde_json::to_string_pretty(data)?;

        std::fs::write(&path, json).map_err(|e| {
            TuishError::StorageError(format!("failed to write cache file: {}", e))
        })?;

        Ok(())
    }

    /// Delete a cached license (synchronous version).
    pub fn delete_license_sync(&self, product_id: &str) -> Result<(), TuishError> {
        let path = self.get_license_path(product_id);

        if path.exists() {
            std::fs::remove_file(&path).map_err(|e| {
                TuishError::StorageError(format!("failed to delete cache file: {}", e))
            })?;
        }

        Ok(())
    }

    /// Check if a cached license exists.
    pub fn exists(&self, product_id: &str) -> bool {
        self.get_license_path(product_id).exists()
    }

    /// Get the cached license key if it exists.
    pub fn get_license_key_sync(&self, product_id: &str) -> Option<String> {
        self.load_license_sync(product_id)
            .ok()
            .flatten()
            .map(|data| data.license_key)
    }
}

/// Get the current time in milliseconds since Unix epoch.
fn current_time_millis() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs as std_fs;
    use tempfile::TempDir;

    async fn create_test_storage() -> (LicenseStorage, TempDir) {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let storage = LicenseStorage::with_base_dir(temp_dir.path().to_path_buf()).with_debug(true);
        (storage, temp_dir)
    }

    fn create_test_cached_data(product_id: &str) -> CachedLicenseData {
        let now = current_time_millis();
        CachedLicenseData {
            license_key: "test-license-key".to_string(),
            cached_at: now,
            refresh_at: now + CACHE_REFRESH_MS,
            product_id: product_id.to_string(),
            machine_fingerprint: "test-fingerprint".to_string(),
        }
    }

    #[cfg(feature = "storage")]
    #[tokio::test]
    async fn test_storage_new() {
        let storage = LicenseStorage::new();
        assert!(storage.is_ok());

        let storage = storage.unwrap();
        assert!(storage.base_dir().ends_with(".tuish/licenses"));
    }

    #[tokio::test]
    async fn test_storage_with_base_dir() {
        let custom_path = PathBuf::from("/tmp/custom-licenses");
        let storage = LicenseStorage::with_base_dir(custom_path.clone());
        assert_eq!(storage.base_dir(), &custom_path);
    }

    #[tokio::test]
    async fn test_hash_product_id() {
        let storage = LicenseStorage::with_base_dir(PathBuf::from("/tmp"));

        let hash1 = storage.hash_product_id("prod_123");
        let hash2 = storage.hash_product_id("prod_123");
        let hash3 = storage.hash_product_id("prod_456");

        // Same input should produce same output
        assert_eq!(hash1, hash2);

        // Different input should produce different output
        assert_ne!(hash1, hash3);

        // Hash should be 16 hex characters
        assert_eq!(hash1.len(), 16);
        assert!(hash1.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[tokio::test]
    async fn test_get_license_path() {
        let storage = LicenseStorage::with_base_dir(PathBuf::from("/tmp/licenses"));
        let path = storage.get_license_path("prod_123");

        assert!(path.starts_with("/tmp/licenses"));
        assert!(path.extension().and_then(|s| s.to_str()) == Some("json"));
    }

    #[tokio::test]
    async fn test_save_and_load_license() {
        let (storage, _temp) = create_test_storage().await;
        let product_id = "prod_test";
        let data = create_test_cached_data(product_id);

        // Save the license
        let result = storage.save_license(product_id, &data).await;
        assert!(result.is_ok());

        // Load the license
        let loaded = storage.load_license(product_id).await;
        assert!(loaded.is_ok());
        let loaded = loaded.unwrap();
        assert!(loaded.is_some());

        let loaded = loaded.unwrap();
        assert_eq!(loaded.license_key, data.license_key);
        assert_eq!(loaded.product_id, data.product_id);
        assert_eq!(loaded.machine_fingerprint, data.machine_fingerprint);
    }

    #[tokio::test]
    async fn test_load_nonexistent_license() {
        let (storage, _temp) = create_test_storage().await;

        let result = storage.load_license("nonexistent_product").await;
        assert!(result.is_ok());
        assert!(result.unwrap().is_none());
    }

    #[tokio::test]
    async fn test_delete_license() {
        let (storage, _temp) = create_test_storage().await;
        let product_id = "prod_to_delete";
        let data = create_test_cached_data(product_id);

        // Save the license
        storage.save_license(product_id, &data).await.unwrap();

        // Verify it exists
        let loaded = storage.load_license(product_id).await.unwrap();
        assert!(loaded.is_some());

        // Delete it
        let result = storage.delete_license(product_id).await;
        assert!(result.is_ok());

        // Verify it's gone
        let loaded = storage.load_license(product_id).await.unwrap();
        assert!(loaded.is_none());
    }

    #[tokio::test]
    async fn test_delete_nonexistent_license() {
        let (storage, _temp) = create_test_storage().await;

        // Should not error when deleting a nonexistent file
        let result = storage.delete_license("nonexistent").await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_needs_refresh() {
        let storage = LicenseStorage::with_base_dir(PathBuf::from("/tmp"));
        let now = current_time_millis();

        // Fresh cache (refresh_at is in the future)
        let fresh = CachedLicenseData {
            license_key: "key".to_string(),
            cached_at: now,
            refresh_at: now + 3600000, // 1 hour from now
            product_id: "prod".to_string(),
            machine_fingerprint: "fp".to_string(),
        };
        assert!(!storage.needs_refresh(&fresh));

        // Stale cache (refresh_at is in the past)
        let stale = CachedLicenseData {
            license_key: "key".to_string(),
            cached_at: now - 90000000, // 25 hours ago
            refresh_at: now - 3600000, // 1 hour ago
            product_id: "prod".to_string(),
            machine_fingerprint: "fp".to_string(),
        };
        assert!(storage.needs_refresh(&stale));
    }

    #[tokio::test]
    async fn test_save_license_key() {
        let (storage, _temp) = create_test_storage().await;
        let product_id = "prod_save_key";

        let result = storage
            .save_license_key(product_id, "my-license-key", "my-fingerprint")
            .await;
        assert!(result.is_ok());

        let loaded = storage.load_license(product_id).await.unwrap().unwrap();
        assert_eq!(loaded.license_key, "my-license-key");
        assert_eq!(loaded.machine_fingerprint, "my-fingerprint");
        assert!(loaded.refresh_at > loaded.cached_at);

        // Check refresh interval is 24 hours
        let expected_refresh = loaded.cached_at + CACHE_REFRESH_MS;
        assert_eq!(loaded.refresh_at, expected_refresh);
    }

    #[tokio::test]
    async fn test_clear_all() {
        let (storage, temp) = create_test_storage().await;

        // Save multiple licenses
        for i in 0..3 {
            let product_id = format!("prod_{}", i);
            let data = create_test_cached_data(&product_id);
            storage.save_license(&product_id, &data).await.unwrap();
        }

        // Verify they exist
        let entries: Vec<_> = std_fs::read_dir(temp.path())
            .unwrap()
            .filter_map(|e| e.ok())
            .collect();
        assert_eq!(entries.len(), 3);

        // Clear all
        let result = storage.clear_all().await;
        assert!(result.is_ok());

        // Verify they're gone
        let entries: Vec<_> = std_fs::read_dir(temp.path())
            .unwrap()
            .filter_map(|e| e.ok())
            .collect();
        assert_eq!(entries.len(), 0);
    }

    #[tokio::test]
    async fn test_ensure_storage_dir_creates_directory() {
        let temp = TempDir::new().expect("Failed to create temp dir");
        let nested_path = temp.path().join("nested/deep/path");
        let storage = LicenseStorage::with_base_dir(nested_path.clone());

        assert!(!nested_path.exists());

        storage.ensure_storage_dir().await.unwrap();

        assert!(nested_path.exists());
    }

    #[test]
    fn test_sync_save_and_load() {
        let temp_dir = TempDir::new().unwrap();
        let storage = LicenseStorage::with_base_dir(temp_dir.path().to_path_buf());
        let product_id = "prod_sync_test";
        let data = create_test_cached_data(product_id);

        // Save
        storage.save_license_sync(product_id, &data).unwrap();

        // Load
        let loaded = storage.load_license_sync(product_id).unwrap().unwrap();
        assert_eq!(loaded.license_key, data.license_key);
    }

    #[test]
    fn test_exists() {
        let temp_dir = TempDir::new().unwrap();
        let storage = LicenseStorage::with_base_dir(temp_dir.path().to_path_buf());
        let product_id = "prod_exists_test";

        assert!(!storage.exists(product_id));

        let data = create_test_cached_data(product_id);
        storage.save_license_sync(product_id, &data).unwrap();

        assert!(storage.exists(product_id));
    }
}

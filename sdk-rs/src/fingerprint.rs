//! Machine fingerprinting for license binding
//!
//! Generates a stable machine fingerprint based on hostname, username,
//! platform, and architecture. This fingerprint is used to bind licenses
//! to specific machines.
//!
//! The fingerprint format matches the TypeScript SDK:
//! `SHA256(hostname + ":" + username + ":" + platform + ":" + arch)`

use sha2::{Digest, Sha256};
use std::sync::OnceLock;
use tracing::debug;

/// Generate a machine fingerprint as a SHA256 hex string.
///
/// The fingerprint is computed from: `hostname:username:platform:arch`
///
/// This function collects system information and hashes it to create
/// a stable identifier for the current machine. The fingerprint will
/// remain consistent across restarts as long as the hostname and username
/// don't change.
///
/// # Returns
///
/// A 64-character lowercase hex string representing the SHA256 hash.
///
/// # Example
///
/// ```rust
/// use tuish::fingerprint::get_machine_fingerprint;
///
/// let fingerprint = get_machine_fingerprint();
/// println!("Machine ID: {}", fingerprint);
/// // Output: "a1b2c3d4e5f6..." (64 hex characters)
/// ```
pub fn get_machine_fingerprint() -> String {
    let components = collect_fingerprint_components();
    hash_fingerprint(&components)
}

/// Synchronous version of `get_machine_fingerprint`.
///
/// This is identical to `get_machine_fingerprint` since all operations
/// are synchronous. Provided for API consistency with the TypeScript SDK.
pub fn get_machine_fingerprint_sync() -> String {
    get_machine_fingerprint()
}

/// Get a cached machine fingerprint.
///
/// This caches the fingerprint to avoid recalculating it on every call.
/// The fingerprint is computed once and stored for the lifetime of the process.
///
/// # Returns
///
/// A reference to the cached fingerprint string.
pub fn get_machine_fingerprint_cached() -> &'static str {
    static FINGERPRINT: OnceLock<String> = OnceLock::new();
    FINGERPRINT.get_or_init(get_machine_fingerprint)
}

/// Collect the components used for fingerprinting.
///
/// Returns a string in the format: `hostname:username:platform:arch`
/// This matches the TypeScript SDK format exactly.
fn collect_fingerprint_components() -> String {
    let hostname = whoami::fallible::hostname().unwrap_or_else(|_| "unknown".to_string());
    let username = whoami::username();
    let platform = get_platform_string();
    let arch = get_arch_string();

    let components = format!("{}:{}:{}:{}", hostname, username, platform, arch);
    debug!(components = %components, "Collected fingerprint components");
    components
}

/// Hash the fingerprint components using SHA256.
fn hash_fingerprint(components: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(components.as_bytes());
    let result = hasher.finalize();

    // Convert to lowercase hex string
    let fingerprint: String = result.iter().map(|b| format!("{:02x}", b)).collect();
    debug!(fingerprint = %fingerprint, "Generated machine fingerprint");
    fingerprint
}

/// Get the platform string matching the TypeScript SDK format.
///
/// The TypeScript SDK uses Node.js `os.platform()` which returns:
/// - "darwin" for macOS
/// - "linux" for Linux
/// - "win32" for Windows
///
/// We use std::env::consts for portability.
fn get_platform_string() -> &'static str {
    match std::env::consts::OS {
        "macos" => "darwin",
        "linux" => "linux",
        "windows" => "win32",
        "freebsd" => "freebsd",
        "netbsd" => "netbsd",
        "openbsd" => "openbsd",
        other => other,
    }
}

/// Get the architecture string matching the TypeScript SDK format.
///
/// The TypeScript SDK uses Node.js `os.arch()` which returns:
/// - "x64" for x86_64
/// - "arm64" for aarch64
/// - "arm" for arm
/// - "ia32" for x86
fn get_arch_string() -> &'static str {
    match std::env::consts::ARCH {
        "x86_64" => "x64",
        "aarch64" => "arm64",
        "arm" => "arm",
        "x86" => "ia32",
        other => other,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fingerprint_is_consistent() {
        let fp1 = get_machine_fingerprint();
        let fp2 = get_machine_fingerprint();
        assert_eq!(fp1, fp2, "Fingerprint should be consistent across calls");
    }

    #[test]
    fn test_fingerprint_sync_matches() {
        let fp_async = get_machine_fingerprint();
        let fp_sync = get_machine_fingerprint_sync();
        assert_eq!(fp_async, fp_sync, "Sync and async versions should match");
    }

    #[test]
    fn test_fingerprint_is_valid_hex() {
        let fp = get_machine_fingerprint();
        assert_eq!(fp.len(), 64, "SHA256 hex should be 64 characters");
        assert!(
            fp.chars().all(|c| c.is_ascii_hexdigit()),
            "Fingerprint should only contain hex characters"
        );
    }

    #[test]
    fn test_fingerprint_is_lowercase() {
        let fp = get_machine_fingerprint();
        assert_eq!(
            fp,
            fp.to_lowercase(),
            "Fingerprint should be lowercase hex"
        );
    }

    #[test]
    fn test_cached_fingerprint() {
        let fp1 = get_machine_fingerprint_cached();
        let fp2 = get_machine_fingerprint_cached();
        assert_eq!(fp1, fp2);
        // Should be the same pointer since it's cached
        assert!(std::ptr::eq(fp1, fp2));
    }

    #[test]
    fn test_hash_fingerprint() {
        // Known test vector
        let components = "testhost:testuser:linux:x64";
        let hash = hash_fingerprint(components);
        assert_eq!(hash.len(), 64);

        // Same input should produce same output
        let hash2 = hash_fingerprint(components);
        assert_eq!(hash, hash2);

        // Different input should produce different output
        let different = hash_fingerprint("different:input:values:here");
        assert_ne!(hash, different);
    }

    #[test]
    fn test_collect_fingerprint_components() {
        let components = collect_fingerprint_components();

        // Should have 4 parts separated by colons
        let parts: Vec<&str> = components.split(':').collect();
        assert_eq!(parts.len(), 4, "Should have 4 components");

        // Each part should be non-empty
        for (i, part) in parts.iter().enumerate() {
            assert!(!part.is_empty(), "Component {} should not be empty", i);
        }
    }

    #[test]
    fn test_platform_string_valid() {
        let platform = get_platform_string();
        let valid_platforms = [
            "linux", "darwin", "win32", "freebsd", "netbsd", "openbsd", "sunos", "redox", "unknown",
        ];
        assert!(
            valid_platforms.contains(&platform),
            "Platform '{}' should be a known value",
            platform
        );
    }

    #[test]
    fn test_arch_string_valid() {
        let arch = get_arch_string();
        let valid_arches = ["x64", "arm64", "arm", "ia32", "unknown"];
        assert!(
            valid_arches.contains(&arch),
            "Architecture '{}' should be a known value",
            arch
        );
    }
}

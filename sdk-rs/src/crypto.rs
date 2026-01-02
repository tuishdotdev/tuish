//! Cryptographic operations for license verification
//!
//! This module provides Ed25519 signature verification for Tuish licenses.
//! Licenses are formatted as `header.payload.signature` where each part
//! is base64url encoded.

use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use tracing::{debug, trace};

use crate::error::TuishError;
use crate::types::{LicenseHeader, LicensePayload};

/// Size of a raw Ed25519 public key in bytes
const ED25519_PUBLIC_KEY_SIZE: usize = 32;

/// Size of an SPKI-formatted Ed25519 public key in bytes
const SPKI_ED25519_SIZE: usize = 44;

/// SPKI header for Ed25519 keys (12 bytes)
const SPKI_HEADER_SIZE: usize = 12;

// ============================================================================
// Public API
// ============================================================================

/// Verify a license signature and check expiration and machine binding.
///
/// This function performs complete offline verification of a license:
/// 1. Parses the license string into header, payload, and signature
/// 2. Verifies the Ed25519 signature over "header.payload"
/// 3. Checks if the license has expired
/// 4. Checks if the license is bound to the correct machine (if provided)
///
/// # Arguments
///
/// * `license_key` - The full license string (base64url: header.payload.signature)
/// * `public_key` - The Ed25519 public key (SPKI base64 or 64-char hex)
/// * `machine_id` - Optional machine ID to verify binding
///
/// # Returns
///
/// Returns the verified `LicensePayload` if valid.
///
/// # Errors
///
/// * `TuishError::InvalidLicense` - License format is invalid
/// * `TuishError::InvalidPublicKey` - Public key format is invalid
/// * `TuishError::InvalidSignature` - Signature verification failed
/// * `TuishError::ExpiredLicense` - License has expired
/// * `TuishError::InvalidMachineId` - License is bound to a different machine
///
/// # Example
///
/// ```rust,no_run
/// use tuish::verify_license;
///
/// let license = "eyJhbGciOiJlZDI1NTE5IiwidmVyIjoxfQ.eyJsaWQiOiJsaWNfMTIzIn0.sig";
/// let public_key = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
///
/// match verify_license(license, public_key, None) {
///     Ok(payload) => println!("License valid for product: {}", payload.pid),
///     Err(e) => eprintln!("Verification failed: {}", e),
/// }
/// ```
pub fn verify_license(
    license_key: &str,
    public_key: &str,
    machine_id: Option<&str>,
) -> Result<LicensePayload, TuishError> {
    debug!("Verifying license");

    // Parse the license
    let (_header, payload, signature_bytes) = parse_license(license_key)?;
    trace!(license_id = %payload.lid, "Parsed license");

    // Verify signature
    let parts: Vec<&str> = license_key.split('.').collect();
    if parts.len() != 3 {
        return Err(TuishError::InvalidLicense(
            "license must have exactly 3 parts".to_string(),
        ));
    }

    let message = format!("{}.{}", parts[0], parts[1]);
    verify_signature(public_key, &message, &signature_bytes)?;
    trace!("Signature verified");

    // Check expiration
    if let Some(exp) = payload.exp {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis() as i64)
            .unwrap_or(0);

        if exp < now {
            debug!(expiration = exp, now = now, "License expired");
            return Err(TuishError::ExpiredLicense);
        }
    }

    // Check machine ID if provided and license is bound
    if let (Some(required_mid), Some(license_mid)) = (machine_id, &payload.mid) {
        if required_mid != license_mid {
            debug!(
                expected = required_mid,
                actual = license_mid,
                "Machine ID mismatch"
            );
            return Err(TuishError::InvalidMachineId);
        }
    }

    debug!(license_id = %payload.lid, "License verified successfully");
    Ok(payload)
}

/// Parse a license string into its components without verifying the signature.
///
/// This is useful for extracting license information for display purposes
/// before performing full verification.
///
/// # Arguments
///
/// * `license_key` - The full license string (base64url: header.payload.signature)
///
/// # Returns
///
/// Returns a tuple of (header, payload, signature_bytes).
///
/// # Errors
///
/// Returns `TuishError::InvalidLicense` if the format is invalid.
pub fn parse_license(
    license_key: &str,
) -> Result<(LicenseHeader, LicensePayload, Vec<u8>), TuishError> {
    let parts: Vec<&str> = license_key.split('.').collect();

    if parts.len() != 3 {
        return Err(TuishError::InvalidLicense(format!(
            "expected 3 parts, got {}",
            parts.len()
        )));
    }

    let header_b64 = parts[0];
    let payload_b64 = parts[1];
    let signature_b64 = parts[2];

    if header_b64.is_empty() || payload_b64.is_empty() || signature_b64.is_empty() {
        return Err(TuishError::InvalidLicense(
            "empty part in license".to_string(),
        ));
    }

    // Decode header
    let header_bytes = URL_SAFE_NO_PAD
        .decode(header_b64)
        .map_err(|e| TuishError::InvalidLicense(format!("invalid header base64: {}", e)))?;

    let header: LicenseHeader = serde_json::from_slice(&header_bytes)
        .map_err(|e| TuishError::InvalidLicense(format!("invalid header JSON: {}", e)))?;

    // Validate header
    if header.alg != "ed25519" {
        return Err(TuishError::InvalidLicense(format!(
            "unsupported algorithm: {}",
            header.alg
        )));
    }

    // Decode payload
    let payload_bytes = URL_SAFE_NO_PAD
        .decode(payload_b64)
        .map_err(|e| TuishError::InvalidLicense(format!("invalid payload base64: {}", e)))?;

    let payload: LicensePayload = serde_json::from_slice(&payload_bytes)
        .map_err(|e| TuishError::InvalidLicense(format!("invalid payload JSON: {}", e)))?;

    // Decode signature
    let signature_bytes = URL_SAFE_NO_PAD
        .decode(signature_b64)
        .map_err(|e| TuishError::InvalidLicense(format!("invalid signature base64: {}", e)))?;

    Ok((header, payload, signature_bytes))
}

/// Verify an Ed25519 signature over a message.
///
/// # Arguments
///
/// * `public_key` - The Ed25519 public key (SPKI base64 or 64-char hex)
/// * `message` - The message that was signed
/// * `signature` - The signature bytes
///
/// # Errors
///
/// * `TuishError::InvalidPublicKey` - Public key format is invalid
/// * `TuishError::InvalidSignature` - Signature verification failed
pub fn verify_signature(
    public_key: &str,
    message: &str,
    signature: &[u8],
) -> Result<(), TuishError> {
    let key_bytes = parse_public_key(public_key)?;

    let verifying_key = VerifyingKey::from_bytes(&key_bytes).map_err(|e| {
        TuishError::InvalidPublicKey(format!("failed to create verifying key: {}", e))
    })?;

    let signature = Signature::from_slice(signature)?;

    verifying_key
        .verify(message.as_bytes(), &signature)
        .map_err(|_| TuishError::InvalidSignature)?;

    Ok(())
}

/// Check if a license string has a valid format (without signature verification).
///
/// This performs quick structural validation without cryptographic verification.
pub fn is_valid_license_format(license_key: &str) -> bool {
    parse_license(license_key).is_ok()
}

/// Extract the payload from a license without verification.
///
/// **Warning**: This does not verify the signature! Only use for display
/// purposes or when you will verify separately.
pub fn extract_license_payload(license_key: &str) -> Option<LicensePayload> {
    parse_license(license_key)
        .ok()
        .map(|(_, payload, _)| payload)
}

/// Check if a license is expired based on payload (without signature verification).
///
/// Returns `true` if the license is expired or if the format is invalid.
pub fn is_license_expired(license_key: &str) -> bool {
    match extract_license_payload(license_key) {
        Some(payload) => payload.is_expired(),
        None => true,
    }
}

/// Get time until license expires in milliseconds.
///
/// Returns `None` if the license is perpetual or if the format is invalid.
/// Returns a negative value if the license is expired.
pub fn get_license_time_remaining(license_key: &str) -> Option<i64> {
    extract_license_payload(license_key).and_then(|p| p.time_remaining())
}

// ============================================================================
// Internal Functions
// ============================================================================

/// Parse a public key from SPKI base64 or hex format.
///
/// Supports:
/// - SPKI base64 format (44 bytes when decoded, 12-byte header + 32-byte key)
/// - Raw hex format (64 characters = 32 bytes)
fn parse_public_key(public_key: &str) -> Result<[u8; ED25519_PUBLIC_KEY_SIZE], TuishError> {
    // Try SPKI base64 format first (starts with MC4C for Ed25519)
    if public_key.starts_with("MC4C") || public_key.starts_with("MCow") {
        return parse_spki_public_key(public_key);
    }

    // Try hex format (64 hex characters = 32 bytes)
    if public_key.len() == 64 && public_key.chars().all(|c| c.is_ascii_hexdigit()) {
        return parse_hex_public_key(public_key);
    }

    // Try raw base64 (might be SPKI without standard prefix)
    if let Ok(decoded) = URL_SAFE_NO_PAD.decode(public_key) {
        if decoded.len() == SPKI_ED25519_SIZE {
            // SPKI format
            let key_bytes: [u8; ED25519_PUBLIC_KEY_SIZE] =
                decoded[SPKI_HEADER_SIZE..].try_into().map_err(|_| {
                    TuishError::InvalidPublicKey("invalid SPKI key length".to_string())
                })?;
            return Ok(key_bytes);
        }

        if decoded.len() == ED25519_PUBLIC_KEY_SIZE {
            // Raw 32-byte key in base64
            let key_bytes: [u8; ED25519_PUBLIC_KEY_SIZE] = decoded
                .try_into()
                .map_err(|_| TuishError::InvalidPublicKey("invalid raw key length".to_string()))?;
            return Ok(key_bytes);
        }
    }

    Err(TuishError::InvalidPublicKey(format!(
        "unrecognized public key format (length: {})",
        public_key.len()
    )))
}

/// Parse an SPKI-formatted Ed25519 public key.
fn parse_spki_public_key(public_key: &str) -> Result<[u8; ED25519_PUBLIC_KEY_SIZE], TuishError> {
    // Decode base64 (standard base64, not URL-safe)
    let decoded = base64::engine::general_purpose::STANDARD
        .decode(public_key)
        .map_err(|e| TuishError::InvalidPublicKey(format!("invalid SPKI base64: {}", e)))?;

    if decoded.len() != SPKI_ED25519_SIZE {
        return Err(TuishError::InvalidPublicKey(format!(
            "expected {} bytes for SPKI key, got {}",
            SPKI_ED25519_SIZE,
            decoded.len()
        )));
    }

    // Extract the raw key (skip 12-byte SPKI header)
    let key_bytes: [u8; ED25519_PUBLIC_KEY_SIZE] = decoded[SPKI_HEADER_SIZE..]
        .try_into()
        .map_err(|_| TuishError::InvalidPublicKey("failed to extract key from SPKI".to_string()))?;

    Ok(key_bytes)
}

/// Parse a hex-encoded Ed25519 public key.
fn parse_hex_public_key(hex: &str) -> Result<[u8; ED25519_PUBLIC_KEY_SIZE], TuishError> {
    if hex.len() != 64 {
        return Err(TuishError::InvalidPublicKey(format!(
            "expected 64 hex characters, got {}",
            hex.len()
        )));
    }

    let mut bytes = [0u8; ED25519_PUBLIC_KEY_SIZE];
    for (i, chunk) in hex.as_bytes().chunks(2).enumerate() {
        let hex_str = std::str::from_utf8(chunk)
            .map_err(|_| TuishError::InvalidPublicKey("invalid hex characters".to_string()))?;
        bytes[i] = u8::from_str_radix(hex_str, 16)
            .map_err(|e| TuishError::InvalidPublicKey(format!("invalid hex: {}", e)))?;
    }

    Ok(bytes)
}

/// Encode bytes as base64url (no padding).
#[allow(dead_code)]
pub(crate) fn to_base64url(bytes: &[u8]) -> String {
    URL_SAFE_NO_PAD.encode(bytes)
}

/// Decode base64url string to bytes.
#[allow(dead_code)]
pub(crate) fn from_base64url(s: &str) -> Result<Vec<u8>, TuishError> {
    URL_SAFE_NO_PAD
        .decode(s)
        .map_err(|e| TuishError::ParseError(format!("invalid base64url: {}", e)))
}

/// Convert bytes to hex string.
#[allow(dead_code)]
pub(crate) fn bytes_to_hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{:02x}", b)).collect()
}

/// Convert hex string to bytes.
#[allow(dead_code)]
pub(crate) fn hex_to_bytes(hex: &str) -> Result<Vec<u8>, TuishError> {
    if !hex.len().is_multiple_of(2) {
        return Err(TuishError::ParseError(
            "hex string must have even length".to_string(),
        ));
    }

    (0..hex.len())
        .step_by(2)
        .map(|i| {
            u8::from_str_radix(&hex[i..i + 2], 16)
                .map_err(|e| TuishError::ParseError(format!("invalid hex: {}", e)))
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    // Test key pair generated for testing purposes
    // Private key (PKCS8): MC4CAQAwBQYDK2VwBCIEIPMrmRQ5jnPY7gHDw8MlHLn3Wdm3Rqnj9I+9AW9N2VKa
    // Public key (SPKI): MCowBQYDK2VwAyEAz3HnN8J8O+kCNz4h1HoKLLQGpMZ9Pu7xH7c7N4KNQN4=
    // Public key (hex): cf71e737c27c3be902373e21d47a0a2cb406a4c67d3eeef11fb73b37828d40de
    const TEST_PUBLIC_KEY_HEX: &str =
        "cf71e737c27c3be902373e21d47a0a2cb406a4c67d3eeef11fb73b37828d40de";
    const TEST_PUBLIC_KEY_SPKI: &str =
        "MCowBQYDK2VwAyEAz3HnN8J8O+kCNz4h1HoKLLQGpMZ9Pu7xH7c7N4KNQN4=";

    #[test]
    fn test_parse_hex_public_key() {
        let result = parse_hex_public_key(TEST_PUBLIC_KEY_HEX);
        assert!(result.is_ok());
        let bytes = result.unwrap();
        assert_eq!(bytes.len(), 32);
    }

    #[test]
    fn test_parse_spki_public_key() {
        let result = parse_spki_public_key(TEST_PUBLIC_KEY_SPKI);
        assert!(result.is_ok());
        let bytes = result.unwrap();
        assert_eq!(bytes.len(), 32);
    }

    #[test]
    fn test_parse_public_key_hex() {
        let result = parse_public_key(TEST_PUBLIC_KEY_HEX);
        assert!(result.is_ok());
    }

    #[test]
    fn test_parse_public_key_spki() {
        let result = parse_public_key(TEST_PUBLIC_KEY_SPKI);
        assert!(result.is_ok());
    }

    #[test]
    fn test_parse_public_key_invalid() {
        // Too short
        assert!(parse_public_key("abc123").is_err());

        // Invalid hex characters
        assert!(parse_public_key(
            "gg71e737c27c3be902373e21d47a0a2cb406a4c67d3eeef11fb73b37828d40de"
        )
        .is_err());
    }

    #[test]
    fn test_base64url_roundtrip() {
        let original = b"hello world";
        let encoded = to_base64url(original);
        let decoded = from_base64url(&encoded).unwrap();
        assert_eq!(original.as_slice(), decoded.as_slice());
    }

    #[test]
    fn test_hex_roundtrip() {
        let original = vec![0x12, 0x34, 0xab, 0xcd];
        let hex = bytes_to_hex(&original);
        assert_eq!(hex, "1234abcd");
        let decoded = hex_to_bytes(&hex).unwrap();
        assert_eq!(original, decoded);
    }

    #[test]
    fn test_parse_license_valid_format() {
        // Create a sample license structure
        let header = r#"{"alg":"ed25519","ver":1}"#;
        let payload = r#"{"lid":"lic_123","pid":"prod_456","cid":"cus_789","did":"dev_012","features":["pro"],"iat":1704067200000,"exp":null,"mid":null}"#;

        let header_b64 = to_base64url(header.as_bytes());
        let payload_b64 = to_base64url(payload.as_bytes());
        let signature_b64 = to_base64url(&[0u8; 64]); // Fake signature

        let license = format!("{}.{}.{}", header_b64, payload_b64, signature_b64);

        let result = parse_license(&license);
        assert!(result.is_ok());

        let (header, payload, sig) = result.unwrap();
        assert_eq!(header.alg, "ed25519");
        assert_eq!(header.ver, 1);
        assert_eq!(payload.lid, "lic_123");
        assert_eq!(payload.pid, "prod_456");
        assert!(payload.features.contains(&"pro".to_string()));
        assert_eq!(sig.len(), 64);
    }

    #[test]
    fn test_parse_license_invalid_parts() {
        assert!(parse_license("only.two").is_err());
        assert!(parse_license("too.many.parts.here").is_err());
        assert!(parse_license("").is_err());
    }

    #[test]
    fn test_parse_license_invalid_header() {
        let bad_header = to_base64url(b"not json");
        let payload = to_base64url(b"{}");
        let sig = to_base64url(&[0u8; 64]);

        let license = format!("{}.{}.{}", bad_header, payload, sig);
        assert!(parse_license(&license).is_err());
    }

    #[test]
    fn test_parse_license_wrong_algorithm() {
        let header = to_base64url(br#"{"alg":"rsa","ver":1}"#);
        let payload = to_base64url(br#"{"lid":"x","pid":"y","cid":"z","did":"w","features":[],"iat":0,"exp":null,"mid":null}"#);
        let sig = to_base64url(&[0u8; 64]);

        let license = format!("{}.{}.{}", header, payload, sig);
        let result = parse_license(&license);
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("unsupported algorithm"));
    }

    #[test]
    fn test_is_valid_license_format() {
        let header = to_base64url(br#"{"alg":"ed25519","ver":1}"#);
        let payload = to_base64url(br#"{"lid":"x","pid":"y","cid":"z","did":"w","features":[],"iat":0,"exp":null,"mid":null}"#);
        let sig = to_base64url(&[0u8; 64]);

        let valid = format!("{}.{}.{}", header, payload, sig);
        assert!(is_valid_license_format(&valid));

        assert!(!is_valid_license_format("invalid"));
        assert!(!is_valid_license_format("a.b"));
    }

    #[test]
    fn test_extract_license_payload() {
        let header = to_base64url(br#"{"alg":"ed25519","ver":1}"#);
        let payload = to_base64url(br#"{"lid":"lic_test","pid":"prod_test","cid":"cus_test","did":"dev_test","features":["basic"],"iat":1000,"exp":2000,"mid":"machine123"}"#);
        let sig = to_base64url(&[0u8; 64]);

        let license = format!("{}.{}.{}", header, payload, sig);
        let extracted = extract_license_payload(&license);

        assert!(extracted.is_some());
        let p = extracted.unwrap();
        assert_eq!(p.lid, "lic_test");
        assert_eq!(p.pid, "prod_test");
        assert_eq!(p.exp, Some(2000));
        assert_eq!(p.mid, Some("machine123".to_string()));
    }

    #[test]
    fn test_is_license_expired() {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as i64;

        let header = to_base64url(br#"{"alg":"ed25519","ver":1}"#);
        let sig = to_base64url(&[0u8; 64]);

        // Expired license
        let expired_payload = format!(
            r#"{{"lid":"x","pid":"y","cid":"z","did":"w","features":[],"iat":{},"exp":{},"mid":null}}"#,
            now - 10000,
            now - 5000
        );
        let expired = format!(
            "{}.{}.{}",
            header,
            to_base64url(expired_payload.as_bytes()),
            sig
        );
        assert!(is_license_expired(&expired));

        // Valid license
        let valid_payload = format!(
            r#"{{"lid":"x","pid":"y","cid":"z","did":"w","features":[],"iat":{},"exp":{},"mid":null}}"#,
            now - 10000,
            now + 86400000
        );
        let valid = format!(
            "{}.{}.{}",
            header,
            to_base64url(valid_payload.as_bytes()),
            sig
        );
        assert!(!is_license_expired(&valid));

        // Perpetual license
        let perpetual_payload = format!(
            r#"{{"lid":"x","pid":"y","cid":"z","did":"w","features":[],"iat":{},"exp":null,"mid":null}}"#,
            now - 10000
        );
        let perpetual = format!(
            "{}.{}.{}",
            header,
            to_base64url(perpetual_payload.as_bytes()),
            sig
        );
        assert!(!is_license_expired(&perpetual));

        // Invalid format
        assert!(is_license_expired("invalid"));
    }

    #[test]
    fn test_get_license_time_remaining() {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as i64;

        let header = to_base64url(br#"{"alg":"ed25519","ver":1}"#);
        let sig = to_base64url(&[0u8; 64]);

        // License expiring in 1 hour
        let future_exp = now + 3600000;
        let valid_payload = format!(
            r#"{{"lid":"x","pid":"y","cid":"z","did":"w","features":[],"iat":{},"exp":{},"mid":null}}"#,
            now - 10000,
            future_exp
        );
        let valid = format!(
            "{}.{}.{}",
            header,
            to_base64url(valid_payload.as_bytes()),
            sig
        );

        let remaining = get_license_time_remaining(&valid);
        assert!(remaining.is_some());
        // Should be roughly 1 hour (allowing for test execution time)
        let rem = remaining.unwrap();
        assert!(rem > 3599000 && rem <= 3600000);

        // Perpetual license
        let perpetual_payload = format!(
            r#"{{"lid":"x","pid":"y","cid":"z","did":"w","features":[],"iat":{},"exp":null,"mid":null}}"#,
            now
        );
        let perpetual = format!(
            "{}.{}.{}",
            header,
            to_base64url(perpetual_payload.as_bytes()),
            sig
        );
        assert!(get_license_time_remaining(&perpetual).is_none());

        // Invalid format
        assert!(get_license_time_remaining("invalid").is_none());
    }
}

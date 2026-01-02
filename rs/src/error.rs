//! Error types for the Tuish SDK

use std::fmt;
use thiserror::Error;

/// All errors that can occur in the Tuish SDK
#[derive(Error, Debug, Clone)]
pub enum TuishError {
    /// License format is invalid (not a valid base64url JWT-like structure)
    #[error("invalid license format: {0}")]
    InvalidLicense(String),

    /// License has expired (exp timestamp is in the past)
    #[error("license has expired")]
    ExpiredLicense,

    /// License signature verification failed
    #[error("invalid license signature")]
    InvalidSignature,

    /// License is bound to a different machine
    #[error("license is bound to a different machine")]
    InvalidMachineId,

    /// Network request failed
    #[error("network error: {0}")]
    NetworkError(String),

    /// Failed to read or write license storage
    #[error("storage error: {0}")]
    StorageError(String),

    /// API returned an error response
    #[error("API error (status {status}): {message}")]
    ApiError {
        /// HTTP status code
        status: u16,
        /// Error message from API
        message: String,
    },

    /// Failed to parse data (JSON, base64, etc.)
    #[error("parse error: {0}")]
    ParseError(String),

    /// Public key format is invalid
    #[error("invalid public key format: {0}")]
    InvalidPublicKey(String),

    /// Feature not available (e.g., http feature not enabled)
    #[error("feature not available: {0}")]
    FeatureNotAvailable(String),
}

/// Reason why a license is invalid
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LicenseInvalidReason {
    /// License string format is invalid
    InvalidFormat,
    /// Ed25519 signature verification failed
    InvalidSignature,
    /// License has expired
    Expired,
    /// License is bound to a different machine
    MachineMismatch,
    /// License was not found (API validation)
    NotFound,
    /// License was revoked (API validation)
    Revoked,
    /// Network error during validation
    NetworkError,
}

impl fmt::Display for LicenseInvalidReason {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidFormat => write!(f, "invalid_format"),
            Self::InvalidSignature => write!(f, "invalid_signature"),
            Self::Expired => write!(f, "expired"),
            Self::MachineMismatch => write!(f, "machine_mismatch"),
            Self::NotFound => write!(f, "not_found"),
            Self::Revoked => write!(f, "revoked"),
            Self::NetworkError => write!(f, "network_error"),
        }
    }
}

impl From<serde_json::Error> for TuishError {
    fn from(err: serde_json::Error) -> Self {
        TuishError::ParseError(err.to_string())
    }
}

impl From<base64::DecodeError> for TuishError {
    fn from(err: base64::DecodeError) -> Self {
        TuishError::ParseError(format!("base64 decode error: {}", err))
    }
}

impl From<ed25519_dalek::SignatureError> for TuishError {
    fn from(_err: ed25519_dalek::SignatureError) -> Self {
        TuishError::InvalidSignature
    }
}

#[cfg(feature = "http")]
impl From<reqwest::Error> for TuishError {
    fn from(err: reqwest::Error) -> Self {
        TuishError::NetworkError(err.to_string())
    }
}

impl From<std::io::Error> for TuishError {
    fn from(err: std::io::Error) -> Self {
        TuishError::StorageError(err.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_display() {
        let error = TuishError::InvalidLicense("missing signature".to_string());
        assert_eq!(
            error.to_string(),
            "invalid license format: missing signature"
        );

        let error = TuishError::ExpiredLicense;
        assert_eq!(error.to_string(), "license has expired");

        let error = TuishError::ApiError {
            status: 401,
            message: "unauthorized".to_string(),
        };
        assert_eq!(error.to_string(), "API error (status 401): unauthorized");
    }

    #[test]
    fn test_license_invalid_reason_display() {
        assert_eq!(
            LicenseInvalidReason::InvalidFormat.to_string(),
            "invalid_format"
        );
        assert_eq!(LicenseInvalidReason::Expired.to_string(), "expired");
        assert_eq!(
            LicenseInvalidReason::MachineMismatch.to_string(),
            "machine_mismatch"
        );
    }
}

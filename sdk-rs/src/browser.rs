//! Browser integration for opening URLs
//!
//! This module provides functionality for opening URLs in the user's
//! default web browser. Used primarily for the browser checkout flow.

use crate::error::TuishError;
use tracing::debug;

/// Open a URL in the default web browser
///
/// This function opens the specified URL in the user's default browser
/// and waits for the browser process to exit.
///
/// # Arguments
///
/// * `url` - The URL to open
///
/// # Returns
///
/// Returns `Ok(())` on success, or an error if the browser could not be opened.
///
/// # Example
///
/// ```rust,no_run
/// use tuish::browser::open_url;
///
/// # fn main() -> Result<(), tuish::TuishError> {
/// open_url("https://checkout.tuish.dev/session/abc123")?;
/// println!("Browser opened successfully");
/// # Ok(())
/// # }
/// ```
#[cfg(feature = "browser")]
pub fn open_url(url: &str) -> Result<(), TuishError> {
    debug!(url = %url, "Opening URL in browser");

    open::that(url).map_err(|e| {
        TuishError::StorageError(format!("failed to open browser: {}", e))
    })?;

    debug!("Browser opened successfully");
    Ok(())
}

/// Open a URL in the default web browser without blocking
///
/// This function opens the specified URL in the user's default browser
/// and returns immediately without waiting for the browser to exit.
///
/// # Arguments
///
/// * `url` - The URL to open
///
/// # Returns
///
/// Returns `Ok(())` on success, or an error if the browser could not be opened.
///
/// # Example
///
/// ```rust,no_run
/// use tuish::browser::open_url_detached;
///
/// # fn main() -> Result<(), tuish::TuishError> {
/// open_url_detached("https://checkout.tuish.dev/session/abc123")?;
/// println!("Browser launched, continuing with other work...");
/// # Ok(())
/// # }
/// ```
#[cfg(feature = "browser")]
pub fn open_url_detached(url: &str) -> Result<(), TuishError> {
    debug!(url = %url, "Opening URL in browser (detached)");

    // The `open` crate spawns the browser in a detached process by default
    // on most platforms. We use `that_detached` for explicit detachment.
    open::that_detached(url).map_err(|e| {
        TuishError::StorageError(format!("failed to open browser: {}", e))
    })?;

    debug!("Browser launched successfully (detached)");
    Ok(())
}

/// Open a URL using a specific browser application
///
/// # Arguments
///
/// * `url` - The URL to open
/// * `browser` - The browser application path or name
///
/// # Example
///
/// ```rust,no_run
/// use tuish::browser::open_url_with;
///
/// # fn main() -> Result<(), tuish::TuishError> {
/// // Open with a specific browser
/// open_url_with("https://checkout.tuish.dev", "firefox")?;
/// # Ok(())
/// # }
/// ```
#[cfg(feature = "browser")]
pub fn open_url_with(url: &str, browser: &str) -> Result<(), TuishError> {
    debug!(url = %url, browser = %browser, "Opening URL with specific browser");

    open::with(url, browser).map_err(|e| {
        TuishError::StorageError(format!("failed to open browser '{}': {}", browser, e))
    })?;

    debug!("Browser opened successfully");
    Ok(())
}

/// Check if the browser feature is available
///
/// Returns `true` if the browser feature is enabled and browser
/// opening functionality is available.
pub const fn is_available() -> bool {
    cfg!(feature = "browser")
}

#[cfg(not(feature = "browser"))]
pub fn open_url(_url: &str) -> Result<(), TuishError> {
    Err(TuishError::FeatureNotAvailable(
        "browser feature not enabled".to_string(),
    ))
}

#[cfg(not(feature = "browser"))]
pub fn open_url_detached(_url: &str) -> Result<(), TuishError> {
    Err(TuishError::FeatureNotAvailable(
        "browser feature not enabled".to_string(),
    ))
}

#[cfg(not(feature = "browser"))]
pub fn open_url_with(_url: &str, _browser: &str) -> Result<(), TuishError> {
    Err(TuishError::FeatureNotAvailable(
        "browser feature not enabled".to_string(),
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_available() {
        // This test verifies the feature detection works
        let available = is_available();

        #[cfg(feature = "browser")]
        assert!(available);

        #[cfg(not(feature = "browser"))]
        assert!(!available);
    }

    #[test]
    #[cfg(not(feature = "browser"))]
    fn test_disabled_returns_error() {
        let result = open_url("https://example.com");
        assert!(result.is_err());

        let result = open_url_detached("https://example.com");
        assert!(result.is_err());
    }

    // Note: We don't test actual browser opening in unit tests as it would
    // open a browser window. Integration tests could use a mock browser or
    // verify the URL is properly formatted.
}

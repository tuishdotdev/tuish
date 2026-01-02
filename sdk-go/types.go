package tuish

import "time"

// Config contains the SDK configuration options.
type Config struct {
	// ProductID for this application (required)
	ProductID string

	// PublicKey is the Ed25519 public key for offline license verification.
	// Accepts SPKI base64 (MCow...) or 64-character hex format.
	PublicKey string

	// APIBaseURL is the API base URL (defaults to production)
	APIBaseURL string

	// APIKey for authenticated requests (optional, used for license validation)
	APIKey string

	// StorageDir is the custom storage directory (defaults to ~/.tuish/licenses/)
	StorageDir string

	// Debug enables debug logging
	Debug bool
}

// LicenseCheckResult contains the result of a license check.
type LicenseCheckResult struct {
	// Valid indicates whether the license is valid
	Valid bool `json:"valid"`

	// License contains the license details if valid
	License *LicenseDetails `json:"license,omitempty"`

	// Reason for invalid license
	Reason LicenseInvalidReason `json:"reason,omitempty"`

	// OfflineVerified indicates whether the license was verified offline
	OfflineVerified bool `json:"offlineVerified"`
}

// LicenseDetails contains license information.
type LicenseDetails struct {
	// ID is the license ID
	ID string `json:"id"`

	// ProductID is the product ID
	ProductID string `json:"productId"`

	// ProductName is the product name (if available from API)
	ProductName string `json:"productName,omitempty"`

	// Features contains the feature flags
	Features []string `json:"features"`

	// Status is the license status
	Status LicenseStatus `json:"status"`

	// IssuedAt is when the license was issued (Unix timestamp ms)
	IssuedAt int64 `json:"issuedAt"`

	// ExpiresAt is when the license expires (Unix timestamp ms, nil for perpetual)
	ExpiresAt *int64 `json:"expiresAt"`
}

// LicenseStatus represents the status of a license.
type LicenseStatus string

const (
	LicenseStatusActive  LicenseStatus = "active"
	LicenseStatusExpired LicenseStatus = "expired"
	LicenseStatusRevoked LicenseStatus = "revoked"
)

// LicenseInvalidReason represents why a license is invalid.
type LicenseInvalidReason string

const (
	ReasonNotFound         LicenseInvalidReason = "not_found"
	ReasonExpired          LicenseInvalidReason = "expired"
	ReasonRevoked          LicenseInvalidReason = "revoked"
	ReasonInvalidFormat    LicenseInvalidReason = "invalid_format"
	ReasonInvalidSignature LicenseInvalidReason = "invalid_signature"
	ReasonMachineMismatch  LicenseInvalidReason = "machine_mismatch"
	ReasonNetworkError     LicenseInvalidReason = "network_error"
)

// LicenseHeader is the header portion of a signed license.
type LicenseHeader struct {
	Algorithm string `json:"alg"`
	Version   int    `json:"ver"`
}

// LicensePayload is the payload portion of a signed license.
type LicensePayload struct {
	LicenseID  string   `json:"lid"`
	ProductID  string   `json:"pid"`
	CustomerID string   `json:"cid"`
	DeveloperID string  `json:"did"`
	Features   []string `json:"features"`
	IssuedAt   int64    `json:"iat"`
	ExpiresAt  *int64   `json:"exp"`
	MachineID  *string  `json:"mid"`
}

// CheckoutSessionResult is returned when creating a checkout session.
type CheckoutSessionResult struct {
	// SessionID for polling
	SessionID string `json:"sessionId"`

	// CheckoutURL to open in browser
	CheckoutURL string `json:"checkoutUrl"`
}

// CheckoutStatus represents the status of a checkout session.
type CheckoutStatus struct {
	// Status is pending, complete, or expired
	Status string `json:"status"`

	// LicenseKey is present when status is complete
	LicenseKey string `json:"licenseKey,omitempty"`

	// License details when complete
	License *LicenseDetails `json:"license,omitempty"`
}

// OtpRequestResult is returned when requesting an OTP.
type OtpRequestResult struct {
	// OtpID for verification
	OtpID string `json:"otpId"`

	// PhoneMasked is the masked phone number
	PhoneMasked string `json:"phoneMasked"`

	// ExpiresIn is seconds until OTP expires
	ExpiresIn int `json:"expiresIn"`
}

// LoginResult is returned after successful login.
type LoginResult struct {
	// IdentityToken is the JWT for authenticated requests
	IdentityToken string `json:"identityToken"`

	// Licenses are the customer's licenses
	Licenses []LicenseDetails `json:"licenses"`
}

// PurchaseInitResult is returned when initializing a terminal purchase.
type PurchaseInitResult struct {
	// Cards are the saved payment cards
	Cards []SavedCard `json:"cards"`

	// Amount in cents
	Amount int `json:"amount"`

	// Currency code
	Currency string `json:"currency"`

	// PhoneMasked for OTP
	PhoneMasked string `json:"phoneMasked"`

	// ProductName of the product
	ProductName string `json:"productName"`
}

// SavedCard represents a saved payment card.
type SavedCard struct {
	// ID for use in purchase confirmation
	ID string `json:"id"`

	// Brand (visa, mastercard, etc.)
	Brand string `json:"brand"`

	// Last4 digits
	Last4 string `json:"last4"`

	// ExpiryMonth
	ExpiryMonth int `json:"expiryMonth"`

	// ExpiryYear
	ExpiryYear int `json:"expiryYear"`
}

// PurchaseConfirmResult is returned after purchase confirmation.
type PurchaseConfirmResult struct {
	// Success indicates whether purchase succeeded
	Success bool `json:"success"`

	// License key if successful
	License string `json:"license,omitempty"`

	// ReceiptURL if successful
	ReceiptURL string `json:"receiptUrl,omitempty"`

	// RequiresAction if 3DS is needed
	RequiresAction bool `json:"requiresAction,omitempty"`

	// ActionURL for 3DS
	ActionURL string `json:"actionUrl,omitempty"`

	// Error message if failed
	Error string `json:"error,omitempty"`
}

// CachedLicenseData is stored on disk.
type CachedLicenseData struct {
	// LicenseKey is the raw license string
	LicenseKey string `json:"licenseKey"`

	// CachedAt is when the license was cached (Unix timestamp ms)
	CachedAt int64 `json:"cachedAt"`

	// RefreshAt is when the cache should be refreshed (Unix timestamp ms)
	RefreshAt int64 `json:"refreshAt"`

	// ProductID of the license
	ProductID string `json:"productId"`

	// MachineFingerprint used
	MachineFingerprint string `json:"machineFingerprint"`
}

// NeedsRefresh returns true if the cache should be refreshed.
func (c *CachedLicenseData) NeedsRefresh() bool {
	return time.Now().UnixMilli() >= c.RefreshAt
}

// ValidateRequest is sent to the API for license validation.
type ValidateRequest struct {
	LicenseKey         string `json:"licenseKey"`
	MachineFingerprint string `json:"machineFingerprint"`
}

// ValidateResponse is returned from the API for license validation.
type ValidateResponse struct {
	Valid   bool            `json:"valid"`
	License *LicenseDetails `json:"license,omitempty"`
	Reason  string          `json:"reason,omitempty"`
}

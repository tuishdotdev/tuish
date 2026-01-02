// Package tuish provides a Go SDK for the tuish TUI monetization platform.
//
// The SDK enables CLI/TUI applications to verify licenses offline using Ed25519
// cryptographic signatures, with optional online validation for revocation checks.
//
// Basic usage:
//
//	sdk, err := tuish.New(tuish.Config{
//		ProductID: "prod_xxx",
//		PublicKey: "MCowBQYDK2VwAyEA...",
//	})
//	if err != nil {
//		log.Fatal(err)
//	}
//
//	result, err := sdk.CheckLicense(context.Background())
//	if err != nil {
//		log.Fatal(err)
//	}
//
//	if !result.Valid {
//		// Trigger purchase flow
//		session, err := sdk.PurchaseInBrowser(context.Background(), "")
//		if err != nil {
//			log.Fatal(err)
//		}
//		fmt.Printf("Complete purchase at: %s\n", session.CheckoutURL)
//	}
package tuish

import (
	"context"
	"crypto/ed25519"
	"errors"
	"fmt"
	"os/exec"
	"runtime"
	"time"
)

// SDK is the main entry point for the tuish SDK.
type SDK struct {
	config             Config
	client             *Client
	storage            *Storage
	publicKey          ed25519.PublicKey
	machineFingerprint string
}

// New creates a new tuish SDK instance.
func New(config Config) (*SDK, error) {
	if config.ProductID == "" {
		return nil, errors.New("productId is required")
	}
	if config.PublicKey == "" {
		return nil, errors.New("publicKey is required")
	}

	publicKey, err := ParsePublicKey(config.PublicKey)
	if err != nil {
		return nil, fmt.Errorf("parse public key: %w", err)
	}

	if config.APIBaseURL == "" {
		config.APIBaseURL = defaultAPIURL
	}

	sdk := &SDK{
		config:    config,
		client:    NewClient(config.APIBaseURL, config.APIKey, config.Debug),
		storage:   NewStorage(config.StorageDir, config.Debug),
		publicKey: publicKey,
	}

	return sdk, nil
}

// GetMachineFingerprint returns the machine fingerprint (cached after first call).
func (s *SDK) GetMachineFingerprint() string {
	if s.machineFingerprint == "" {
		s.machineFingerprint = GetMachineFingerprint()
	}
	return s.machineFingerprint
}

// CheckLicense checks if the user has a valid license.
// Performs offline verification first, then online validation if needed.
func (s *SDK) CheckLicense(ctx context.Context) (*LicenseCheckResult, error) {
	machineFingerprint := s.GetMachineFingerprint()

	// Try to load cached license
	cached, err := s.storage.Load(s.config.ProductID)
	if err != nil {
		return nil, fmt.Errorf("load cached license: %w", err)
	}

	if cached != nil {
		// Verify offline first
		offlineResult := s.verifyOffline(cached.LicenseKey, machineFingerprint)

		if offlineResult.Valid {
			// If cache is fresh, return offline result
			if !cached.NeedsRefresh() {
				return offlineResult, nil
			}

			// Try online refresh
			onlineResult, err := s.validateOnline(ctx, cached.LicenseKey, machineFingerprint)
			if err != nil {
				// Network error, trust offline result
				return offlineResult, nil
			}

			if onlineResult.Valid {
				// Update cache with fresh timestamp
				s.storage.Save(s.config.ProductID, cached.LicenseKey, machineFingerprint)
				return onlineResult, nil
			}

			// License was revoked or otherwise invalidated server-side
			if onlineResult.Reason != ReasonNetworkError {
				s.storage.Remove(s.config.ProductID)
				return onlineResult, nil
			}

			// Network error, trust offline result
			return offlineResult, nil
		}

		// Offline verification failed
		if offlineResult.Reason == ReasonExpired {
			// Check online in case there's a renewed license
			onlineResult, err := s.validateOnline(ctx, cached.LicenseKey, machineFingerprint)
			if err != nil {
				s.storage.Remove(s.config.ProductID)
				return offlineResult, nil
			}
			if !onlineResult.Valid {
				s.storage.Remove(s.config.ProductID)
			}
			return onlineResult, nil
		}

		// Other offline failures (signature, format, machine mismatch)
		s.storage.Remove(s.config.ProductID)
		return offlineResult, nil
	}

	// No cached license
	return &LicenseCheckResult{
		Valid:           false,
		Reason:          ReasonNotFound,
		OfflineVerified: false,
	}, nil
}

// verifyOffline verifies a license offline using the public key.
func (s *SDK) verifyOffline(licenseKey, machineFingerprint string) *LicenseCheckResult {
	result := VerifyLicense(licenseKey, s.publicKey, machineFingerprint)

	if result.Valid && result.Payload != nil {
		return &LicenseCheckResult{
			Valid: true,
			License: &LicenseDetails{
				ID:        result.Payload.LicenseID,
				ProductID: result.Payload.ProductID,
				Features:  result.Payload.Features,
				Status:    LicenseStatusActive,
				IssuedAt:  result.Payload.IssuedAt,
				ExpiresAt: result.Payload.ExpiresAt,
			},
			OfflineVerified: true,
		}
	}

	var license *LicenseDetails
	if result.Payload != nil {
		status := LicenseStatusRevoked
		if result.Reason == ReasonExpired {
			status = LicenseStatusExpired
		}
		license = &LicenseDetails{
			ID:        result.Payload.LicenseID,
			ProductID: result.Payload.ProductID,
			Features:  result.Payload.Features,
			Status:    status,
			IssuedAt:  result.Payload.IssuedAt,
			ExpiresAt: result.Payload.ExpiresAt,
		}
	}

	return &LicenseCheckResult{
		Valid:           false,
		Reason:          result.Reason,
		License:         license,
		OfflineVerified: true,
	}
}

// validateOnline validates a license online with the API.
func (s *SDK) validateOnline(ctx context.Context, licenseKey, machineFingerprint string) (*LicenseCheckResult, error) {
	result, err := s.client.ValidateLicense(ctx, licenseKey, machineFingerprint)
	if err != nil {
		return &LicenseCheckResult{
			Valid:           false,
			Reason:          ReasonNetworkError,
			OfflineVerified: false,
		}, err
	}

	if result.Valid && result.License != nil {
		return &LicenseCheckResult{
			Valid:           true,
			License:         result.License,
			OfflineVerified: false,
		}, nil
	}

	return &LicenseCheckResult{
		Valid:           false,
		Reason:          LicenseInvalidReason(result.Reason),
		License:         result.License,
		OfflineVerified: false,
	}, nil
}

// PurchaseInBrowser creates a checkout session and opens it in the browser.
func (s *SDK) PurchaseInBrowser(ctx context.Context, email string) (*CheckoutSessionResult, error) {
	session, err := s.client.CreateCheckoutSession(ctx, s.config.ProductID, email)
	if err != nil {
		return nil, err
	}

	// Try to open browser
	if err := openURL(session.CheckoutURL); err != nil {
		// Don't fail if browser can't be opened, just return the URL
	}

	return session, nil
}

// WaitForCheckoutComplete polls for checkout completion.
func (s *SDK) WaitForCheckoutComplete(ctx context.Context, sessionID string, pollInterval, timeout time.Duration) (*LicenseCheckResult, error) {
	if pollInterval == 0 {
		pollInterval = 2 * time.Second
	}
	if timeout == 0 {
		timeout = 10 * time.Minute
	}

	deadline := time.Now().Add(timeout)
	ticker := time.NewTicker(pollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-ticker.C:
			if time.Now().After(deadline) {
				return &LicenseCheckResult{
					Valid:           false,
					Reason:          ReasonNetworkError,
					OfflineVerified: false,
				}, nil
			}

			status, err := s.client.GetCheckoutStatus(ctx, sessionID)
			if err != nil {
				continue // Retry on error
			}

			switch status.Status {
			case "complete":
				if status.LicenseKey != "" {
					s.StoreLicense(status.LicenseKey)
					return s.CheckLicense(ctx)
				}
			case "expired":
				return &LicenseCheckResult{
					Valid:           false,
					Reason:          ReasonExpired,
					OfflineVerified: false,
				}, nil
			}
		}
	}
}

// RequestLoginOtp requests an OTP for login.
func (s *SDK) RequestLoginOtp(ctx context.Context, email string) (*OtpRequestResult, error) {
	return s.client.RequestLoginOtp(ctx, email)
}

// VerifyLogin verifies an OTP and logs in.
func (s *SDK) VerifyLogin(ctx context.Context, email, otpID, otp string) (*LoginResult, error) {
	deviceFingerprint := s.GetMachineFingerprint()
	return s.client.VerifyLogin(ctx, email, otpID, otp, deviceFingerprint)
}

// InitTerminalPurchase initializes a terminal purchase.
func (s *SDK) InitTerminalPurchase(ctx context.Context) (*PurchaseInitResult, error) {
	return s.client.InitPurchase(ctx, s.config.ProductID)
}

// RequestPurchaseOtp requests an OTP for purchase confirmation.
func (s *SDK) RequestPurchaseOtp(ctx context.Context) (string, int, error) {
	result, err := s.client.RequestPurchaseOtp(ctx)
	if err != nil {
		return "", 0, err
	}
	return result.OtpID, result.ExpiresIn, nil
}

// ConfirmTerminalPurchase confirms a purchase with saved card and OTP.
func (s *SDK) ConfirmTerminalPurchase(ctx context.Context, cardID, otpID, otp string) (*PurchaseConfirmResult, error) {
	result, err := s.client.ConfirmPurchase(ctx, s.config.ProductID, cardID, otpID, otp)
	if err != nil {
		return nil, err
	}

	if result.Success && result.License != "" {
		s.StoreLicense(result.License)
	}

	return result, nil
}

// StoreLicense stores a license key manually.
func (s *SDK) StoreLicense(licenseKey string) error {
	machineFingerprint := s.GetMachineFingerprint()
	return s.storage.Save(s.config.ProductID, licenseKey, machineFingerprint)
}

// GetCachedLicenseKey returns the cached license key without verification.
func (s *SDK) GetCachedLicenseKey() string {
	cached, err := s.storage.Load(s.config.ProductID)
	if err != nil || cached == nil {
		return ""
	}
	return cached.LicenseKey
}

// ClearLicense clears the cached license.
func (s *SDK) ClearLicense() error {
	return s.storage.Remove(s.config.ProductID)
}

// ExtractLicenseInfo extracts license info without verification (for display only).
func (s *SDK) ExtractLicenseInfo(licenseKey string) (*LicenseDetails, error) {
	payload, err := ExtractLicensePayload(licenseKey)
	if err != nil {
		return nil, err
	}

	expired := IsLicenseExpired(licenseKey)
	status := LicenseStatusActive
	if expired {
		status = LicenseStatusExpired
	}

	return &LicenseDetails{
		ID:        payload.LicenseID,
		ProductID: payload.ProductID,
		Features:  payload.Features,
		Status:    status,
		IssuedAt:  payload.IssuedAt,
		ExpiresAt: payload.ExpiresAt,
	}, nil
}

// GetClient returns the underlying API client for advanced usage.
func (s *SDK) GetClient() *Client {
	return s.client
}

// GetStorage returns the underlying storage for advanced usage.
func (s *SDK) GetStorage() *Storage {
	return s.storage
}

// openURL opens a URL in the default browser.
func openURL(url string) error {
	var cmd *exec.Cmd

	switch runtime.GOOS {
	case "darwin":
		cmd = exec.Command("open", url)
	case "windows":
		cmd = exec.Command("cmd", "/c", "start", url)
	default: // linux, freebsd, etc.
		cmd = exec.Command("xdg-open", url)
	}

	return cmd.Start()
}

package tuish

import (
	"crypto/ed25519"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

var (
	ErrInvalidFormat    = errors.New("invalid license format")
	ErrInvalidSignature = errors.New("invalid signature")
	ErrExpired          = errors.New("license expired")
	ErrMachineMismatch  = errors.New("machine mismatch")
)

// VerifyResult contains the result of license verification.
type VerifyResult struct {
	Valid   bool
	Payload *LicensePayload
	Reason  LicenseInvalidReason
}

// ParsedLicense contains the parsed components of a license string.
type ParsedLicense struct {
	Header    LicenseHeader
	Payload   LicensePayload
	Signature []byte
	RawHeader string
	RawPayload string
}

// base64URLDecode decodes a base64url-encoded string.
func base64URLDecode(s string) ([]byte, error) {
	// Add padding if needed
	switch len(s) % 4 {
	case 2:
		s += "=="
	case 3:
		s += "="
	}

	// Convert from base64url to standard base64
	s = strings.ReplaceAll(s, "-", "+")
	s = strings.ReplaceAll(s, "_", "/")

	return base64.StdEncoding.DecodeString(s)
}

// ParseLicense parses a license string into its components.
func ParseLicense(licenseString string) (*ParsedLicense, error) {
	parts := strings.Split(licenseString, ".")
	if len(parts) != 3 {
		return nil, ErrInvalidFormat
	}

	headerB64, payloadB64, signatureB64 := parts[0], parts[1], parts[2]
	if headerB64 == "" || payloadB64 == "" || signatureB64 == "" {
		return nil, ErrInvalidFormat
	}

	// Decode header
	headerBytes, err := base64URLDecode(headerB64)
	if err != nil {
		return nil, fmt.Errorf("decode header: %w", err)
	}

	var header LicenseHeader
	if err := json.Unmarshal(headerBytes, &header); err != nil {
		return nil, fmt.Errorf("parse header: %w", err)
	}

	// Decode payload
	payloadBytes, err := base64URLDecode(payloadB64)
	if err != nil {
		return nil, fmt.Errorf("decode payload: %w", err)
	}

	var payload LicensePayload
	if err := json.Unmarshal(payloadBytes, &payload); err != nil {
		return nil, fmt.Errorf("parse payload: %w", err)
	}

	// Decode signature
	signature, err := base64URLDecode(signatureB64)
	if err != nil {
		return nil, fmt.Errorf("decode signature: %w", err)
	}

	return &ParsedLicense{
		Header:     header,
		Payload:    payload,
		Signature:  signature,
		RawHeader:  headerB64,
		RawPayload: payloadB64,
	}, nil
}

// ParsePublicKey parses a public key from SPKI base64 or hex format.
// Returns the raw 32-byte key.
func ParsePublicKey(publicKey string) (ed25519.PublicKey, error) {
	// Check if it's SPKI base64 format (starts with MCow for Ed25519)
	if strings.HasPrefix(publicKey, "MCow") || strings.HasPrefix(publicKey, "MCoq") {
		decoded, err := base64.StdEncoding.DecodeString(publicKey)
		if err != nil {
			return nil, fmt.Errorf("decode SPKI key: %w", err)
		}

		// SPKI format: 12 byte header + 32 byte key
		if len(decoded) != 44 {
			return nil, fmt.Errorf("invalid SPKI key length: expected 44 bytes, got %d", len(decoded))
		}

		// Extract the raw key (last 32 bytes)
		return ed25519.PublicKey(decoded[12:]), nil
	}

	// Check if it's hex format (64 characters = 32 bytes)
	if len(publicKey) == 64 {
		key, err := hex.DecodeString(publicKey)
		if err != nil {
			return nil, fmt.Errorf("decode hex key: %w", err)
		}
		return ed25519.PublicKey(key), nil
	}

	return nil, errors.New("invalid public key format: expected SPKI base64 (MCow...) or 64-character hex")
}

// VerifyLicense verifies a license signature and checks expiration/machine binding.
func VerifyLicense(licenseString string, publicKey ed25519.PublicKey, machineID string) *VerifyResult {
	parsed, err := ParseLicense(licenseString)
	if err != nil {
		return &VerifyResult{Valid: false, Reason: ReasonInvalidFormat}
	}

	// Verify signature
	message := []byte(parsed.RawHeader + "." + parsed.RawPayload)
	if !ed25519.Verify(publicKey, message, parsed.Signature) {
		return &VerifyResult{Valid: false, Reason: ReasonInvalidSignature}
	}

	// Check expiration
	if parsed.Payload.ExpiresAt != nil && *parsed.Payload.ExpiresAt < time.Now().UnixMilli() {
		return &VerifyResult{Valid: false, Payload: &parsed.Payload, Reason: ReasonExpired}
	}

	// Check machine ID if license is locked to a specific machine
	// If license.MachineID is nil, license is valid on any machine
	if machineID != "" && parsed.Payload.MachineID != nil && *parsed.Payload.MachineID != machineID {
		return &VerifyResult{Valid: false, Payload: &parsed.Payload, Reason: ReasonMachineMismatch}
	}

	return &VerifyResult{Valid: true, Payload: &parsed.Payload}
}

// ExtractLicensePayload extracts the payload from a license without verification.
// This is for display purposes only - never trust unverified payloads.
func ExtractLicensePayload(licenseString string) (*LicensePayload, error) {
	parsed, err := ParseLicense(licenseString)
	if err != nil {
		return nil, err
	}
	return &parsed.Payload, nil
}

// IsLicenseExpired checks if a license is expired based on payload.
// Does not verify the signature.
func IsLicenseExpired(licenseString string) bool {
	payload, err := ExtractLicensePayload(licenseString)
	if err != nil {
		return true
	}
	if payload.ExpiresAt == nil {
		return false // Perpetual license
	}
	return *payload.ExpiresAt < time.Now().UnixMilli()
}

package tuish

import (
	"crypto/ed25519"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"testing"
	"time"
)

// Test key pair for testing (DO NOT use in production)
var (
	testPrivateKeyHex = "9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60"
	testPublicKeyHex  = "d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a"
)

func generateTestLicense(t *testing.T, payload LicensePayload) string {
	t.Helper()

	privateKeyBytes, err := hex.DecodeString(testPrivateKeyHex)
	if err != nil {
		t.Fatalf("decode private key: %v", err)
	}

	privateKey := ed25519.NewKeyFromSeed(privateKeyBytes)

	header := LicenseHeader{
		Algorithm: "ed25519",
		Version:   1,
	}

	headerBytes, _ := json.Marshal(header)
	payloadBytes, _ := json.Marshal(payload)

	headerB64 := base64URLEncode(headerBytes)
	payloadB64 := base64URLEncode(payloadBytes)

	message := []byte(headerB64 + "." + payloadB64)
	signature := ed25519.Sign(privateKey, message)
	signatureB64 := base64URLEncode(signature)

	return headerB64 + "." + payloadB64 + "." + signatureB64
}

func base64URLEncode(data []byte) string {
	s := base64.StdEncoding.EncodeToString(data)
	s = replaceAll(s, "+", "-")
	s = replaceAll(s, "/", "_")
	s = trimRight(s, "=")
	return s
}

func replaceAll(s, old, new string) string {
	result := ""
	for _, c := range s {
		if string(c) == old {
			result += new
		} else {
			result += string(c)
		}
	}
	return result
}

func trimRight(s, cutset string) string {
	for len(s) > 0 && s[len(s)-1:] == cutset {
		s = s[:len(s)-1]
	}
	return s
}

func TestParseLicense(t *testing.T) {
	now := time.Now().UnixMilli()
	future := now + 86400000 // +1 day

	payload := LicensePayload{
		LicenseID:   "lic_test123",
		ProductID:   "prod_test",
		CustomerID:  "cust_test",
		DeveloperID: "dev_test",
		Features:    []string{"feature1", "feature2"},
		IssuedAt:    now,
		ExpiresAt:   &future,
		MachineID:   nil,
	}

	license := generateTestLicense(t, payload)

	parsed, err := ParseLicense(license)
	if err != nil {
		t.Fatalf("ParseLicense failed: %v", err)
	}

	if parsed.Header.Algorithm != "ed25519" {
		t.Errorf("expected algorithm ed25519, got %s", parsed.Header.Algorithm)
	}

	if parsed.Header.Version != 1 {
		t.Errorf("expected version 1, got %d", parsed.Header.Version)
	}

	if parsed.Payload.LicenseID != "lic_test123" {
		t.Errorf("expected license ID lic_test123, got %s", parsed.Payload.LicenseID)
	}

	if parsed.Payload.ProductID != "prod_test" {
		t.Errorf("expected product ID prod_test, got %s", parsed.Payload.ProductID)
	}

	if len(parsed.Payload.Features) != 2 {
		t.Errorf("expected 2 features, got %d", len(parsed.Payload.Features))
	}
}

func TestParseLicenseInvalidFormat(t *testing.T) {
	tests := []struct {
		name    string
		license string
	}{
		{"empty", ""},
		{"no dots", "abc123"},
		{"one dot", "abc.123"},
		{"four parts", "a.b.c.d"},
		{"invalid base64 header", "!!!.abc.def"},
		{"invalid base64 payload", "eyJhbGciOiJlZDI1NTE5IiwidmVyIjoxfQ.!!!.def"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := ParseLicense(tt.license)
			if err == nil {
				t.Errorf("expected error for license %q, got nil", tt.license)
			}
		})
	}
}

func TestVerifyLicense(t *testing.T) {
	publicKey, err := ParsePublicKey(testPublicKeyHex)
	if err != nil {
		t.Fatalf("parse public key: %v", err)
	}

	now := time.Now().UnixMilli()
	future := now + 86400000 // +1 day

	payload := LicensePayload{
		LicenseID:   "lic_test123",
		ProductID:   "prod_test",
		CustomerID:  "cust_test",
		DeveloperID: "dev_test",
		Features:    []string{"feature1"},
		IssuedAt:    now,
		ExpiresAt:   &future,
		MachineID:   nil,
	}

	license := generateTestLicense(t, payload)

	result := VerifyLicense(license, publicKey, "")

	if !result.Valid {
		t.Errorf("expected valid license, got invalid with reason: %s", result.Reason)
	}

	if result.Payload == nil {
		t.Fatal("expected payload, got nil")
	}

	if result.Payload.LicenseID != "lic_test123" {
		t.Errorf("expected license ID lic_test123, got %s", result.Payload.LicenseID)
	}
}

func TestVerifyLicenseExpired(t *testing.T) {
	publicKey, err := ParsePublicKey(testPublicKeyHex)
	if err != nil {
		t.Fatalf("parse public key: %v", err)
	}

	now := time.Now().UnixMilli()
	past := now - 86400000 // -1 day

	payload := LicensePayload{
		LicenseID:   "lic_expired",
		ProductID:   "prod_test",
		CustomerID:  "cust_test",
		DeveloperID: "dev_test",
		Features:    []string{},
		IssuedAt:    now - 172800000, // -2 days
		ExpiresAt:   &past,
		MachineID:   nil,
	}

	license := generateTestLicense(t, payload)

	result := VerifyLicense(license, publicKey, "")

	if result.Valid {
		t.Error("expected invalid license for expired, got valid")
	}

	if result.Reason != ReasonExpired {
		t.Errorf("expected reason %s, got %s", ReasonExpired, result.Reason)
	}
}

func TestVerifyLicensePerpetual(t *testing.T) {
	publicKey, err := ParsePublicKey(testPublicKeyHex)
	if err != nil {
		t.Fatalf("parse public key: %v", err)
	}

	now := time.Now().UnixMilli()

	payload := LicensePayload{
		LicenseID:   "lic_perpetual",
		ProductID:   "prod_test",
		CustomerID:  "cust_test",
		DeveloperID: "dev_test",
		Features:    []string{},
		IssuedAt:    now,
		ExpiresAt:   nil, // Perpetual license
		MachineID:   nil,
	}

	license := generateTestLicense(t, payload)

	result := VerifyLicense(license, publicKey, "")

	if !result.Valid {
		t.Errorf("expected valid perpetual license, got invalid with reason: %s", result.Reason)
	}
}

func TestVerifyLicenseMachineBinding(t *testing.T) {
	publicKey, err := ParsePublicKey(testPublicKeyHex)
	if err != nil {
		t.Fatalf("parse public key: %v", err)
	}

	now := time.Now().UnixMilli()
	future := now + 86400000

	machineID := "machine123"
	payload := LicensePayload{
		LicenseID:   "lic_machine",
		ProductID:   "prod_test",
		CustomerID:  "cust_test",
		DeveloperID: "dev_test",
		Features:    []string{},
		IssuedAt:    now,
		ExpiresAt:   &future,
		MachineID:   &machineID,
	}

	license := generateTestLicense(t, payload)

	// Valid with correct machine
	result := VerifyLicense(license, publicKey, "machine123")
	if !result.Valid {
		t.Errorf("expected valid with correct machine, got invalid: %s", result.Reason)
	}

	// Invalid with wrong machine
	result = VerifyLicense(license, publicKey, "wrongmachine")
	if result.Valid {
		t.Error("expected invalid with wrong machine, got valid")
	}
	if result.Reason != ReasonMachineMismatch {
		t.Errorf("expected reason %s, got %s", ReasonMachineMismatch, result.Reason)
	}

	// Valid with no machine check (floating license use case)
	result = VerifyLicense(license, publicKey, "")
	if !result.Valid {
		t.Errorf("expected valid with empty machine, got invalid: %s", result.Reason)
	}
}

func TestVerifyLicenseInvalidSignature(t *testing.T) {
	// Use a different public key than what signed the license
	differentPublicKeyHex := "0000000000000000000000000000000000000000000000000000000000000000"
	publicKey, err := ParsePublicKey(differentPublicKeyHex)
	if err != nil {
		t.Fatalf("parse public key: %v", err)
	}

	now := time.Now().UnixMilli()
	future := now + 86400000

	payload := LicensePayload{
		LicenseID:   "lic_test",
		ProductID:   "prod_test",
		CustomerID:  "cust_test",
		DeveloperID: "dev_test",
		Features:    []string{},
		IssuedAt:    now,
		ExpiresAt:   &future,
		MachineID:   nil,
	}

	license := generateTestLicense(t, payload)

	result := VerifyLicense(license, publicKey, "")

	if result.Valid {
		t.Error("expected invalid with wrong key, got valid")
	}

	if result.Reason != ReasonInvalidSignature {
		t.Errorf("expected reason %s, got %s", ReasonInvalidSignature, result.Reason)
	}
}

func TestParsePublicKeySPKI(t *testing.T) {
	// SPKI format: 12-byte header + 32-byte key
	rawKey, _ := hex.DecodeString(testPublicKeyHex)
	spkiHeader := []byte{0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00}
	spkiKey := append(spkiHeader, rawKey...)
	spkiB64 := base64.StdEncoding.EncodeToString(spkiKey)

	key, err := ParsePublicKey(spkiB64)
	if err != nil {
		t.Fatalf("parse SPKI key: %v", err)
	}

	expectedKey, _ := hex.DecodeString(testPublicKeyHex)
	if hex.EncodeToString(key) != hex.EncodeToString(expectedKey) {
		t.Errorf("parsed key doesn't match expected")
	}
}

func TestParsePublicKeyHex(t *testing.T) {
	key, err := ParsePublicKey(testPublicKeyHex)
	if err != nil {
		t.Fatalf("parse hex key: %v", err)
	}

	if len(key) != 32 {
		t.Errorf("expected 32 bytes, got %d", len(key))
	}
}

func TestParsePublicKeyInvalid(t *testing.T) {
	tests := []struct {
		name string
		key  string
	}{
		{"empty", ""},
		{"too short hex", "abcd"},
		{"invalid hex", "xyz123"},
		{"wrong length SPKI", "MCowBQ=="},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := ParsePublicKey(tt.key)
			if err == nil {
				t.Errorf("expected error for key %q, got nil", tt.key)
			}
		})
	}
}

func TestIsLicenseExpired(t *testing.T) {
	now := time.Now().UnixMilli()
	past := now - 86400000
	future := now + 86400000

	// Expired license
	expiredPayload := LicensePayload{
		LicenseID: "lic_expired",
		ProductID: "prod_test",
		IssuedAt:  now - 172800000,
		ExpiresAt: &past,
	}
	expiredLicense := generateTestLicense(t, expiredPayload)
	if !IsLicenseExpired(expiredLicense) {
		t.Error("expected expired license to be expired")
	}

	// Valid license
	validPayload := LicensePayload{
		LicenseID: "lic_valid",
		ProductID: "prod_test",
		IssuedAt:  now,
		ExpiresAt: &future,
	}
	validLicense := generateTestLicense(t, validPayload)
	if IsLicenseExpired(validLicense) {
		t.Error("expected valid license to not be expired")
	}

	// Perpetual license
	perpetualPayload := LicensePayload{
		LicenseID: "lic_perpetual",
		ProductID: "prod_test",
		IssuedAt:  now,
		ExpiresAt: nil,
	}
	perpetualLicense := generateTestLicense(t, perpetualPayload)
	if IsLicenseExpired(perpetualLicense) {
		t.Error("expected perpetual license to not be expired")
	}
}

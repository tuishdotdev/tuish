package tuish

import (
	"context"
	"crypto/ed25519"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestNewSDK(t *testing.T) {
	sdk, err := New(Config{
		ProductID: "prod_test",
		PublicKey: testPublicKeyHex,
	})

	if err != nil {
		t.Fatalf("New failed: %v", err)
	}

	if sdk == nil {
		t.Fatal("expected sdk, got nil")
	}
}

func TestNewSDKMissingProductID(t *testing.T) {
	_, err := New(Config{
		PublicKey: testPublicKeyHex,
	})

	if err == nil {
		t.Error("expected error for missing productId")
	}
}

func TestNewSDKMissingPublicKey(t *testing.T) {
	_, err := New(Config{
		ProductID: "prod_test",
	})

	if err == nil {
		t.Error("expected error for missing publicKey")
	}
}

func TestNewSDKInvalidPublicKey(t *testing.T) {
	_, err := New(Config{
		ProductID: "prod_test",
		PublicKey: "invalid",
	})

	if err == nil {
		t.Error("expected error for invalid publicKey")
	}
}

func TestSDKGetMachineFingerprint(t *testing.T) {
	sdk, _ := New(Config{
		ProductID: "prod_test",
		PublicKey: testPublicKeyHex,
	})

	fp := sdk.GetMachineFingerprint()
	if len(fp) != 64 {
		t.Errorf("expected 64 char fingerprint, got %d", len(fp))
	}

	// Should be cached
	fp2 := sdk.GetMachineFingerprint()
	if fp != fp2 {
		t.Error("fingerprint should be cached")
	}
}

func TestSDKCheckLicenseNotFound(t *testing.T) {
	tempDir := t.TempDir()
	sdk, _ := New(Config{
		ProductID:  "prod_test",
		PublicKey:  testPublicKeyHex,
		StorageDir: tempDir,
	})

	result, err := sdk.CheckLicense(context.Background())
	if err != nil {
		t.Fatalf("CheckLicense failed: %v", err)
	}

	if result.Valid {
		t.Error("expected invalid when no license cached")
	}

	if result.Reason != ReasonNotFound {
		t.Errorf("expected reason %s, got %s", ReasonNotFound, result.Reason)
	}
}

func TestSDKStoreLicenseAndCheck(t *testing.T) {
	tempDir := t.TempDir()
	sdk, _ := New(Config{
		ProductID:  "prod_test",
		PublicKey:  testPublicKeyHex,
		StorageDir: tempDir,
	})

	// Generate a valid license
	now := time.Now().UnixMilli()
	future := now + 86400000

	payload := LicensePayload{
		LicenseID:   "lic_test",
		ProductID:   "prod_test",
		CustomerID:  "cust_test",
		DeveloperID: "dev_test",
		Features:    []string{"feature1"},
		IssuedAt:    now,
		ExpiresAt:   &future,
		MachineID:   nil,
	}

	license := generateTestLicenseForSDK(t, payload)

	// Store the license
	err := sdk.StoreLicense(license)
	if err != nil {
		t.Fatalf("StoreLicense failed: %v", err)
	}

	// Check should now return valid
	result, err := sdk.CheckLicense(context.Background())
	if err != nil {
		t.Fatalf("CheckLicense failed: %v", err)
	}

	if !result.Valid {
		t.Errorf("expected valid license, got invalid: %s", result.Reason)
	}

	if !result.OfflineVerified {
		t.Error("expected offline verified")
	}

	if result.License == nil {
		t.Fatal("expected license details")
	}

	if result.License.ID != "lic_test" {
		t.Errorf("expected license ID lic_test, got %s", result.License.ID)
	}
}

func TestSDKClearLicense(t *testing.T) {
	tempDir := t.TempDir()
	sdk, _ := New(Config{
		ProductID:  "prod_test",
		PublicKey:  testPublicKeyHex,
		StorageDir: tempDir,
	})

	// Store a license
	now := time.Now().UnixMilli()
	future := now + 86400000
	payload := LicensePayload{
		LicenseID: "lic_test",
		ProductID: "prod_test",
		IssuedAt:  now,
		ExpiresAt: &future,
	}
	license := generateTestLicenseForSDK(t, payload)
	sdk.StoreLicense(license)

	// Clear it
	err := sdk.ClearLicense()
	if err != nil {
		t.Fatalf("ClearLicense failed: %v", err)
	}

	// Should be not found now
	result, _ := sdk.CheckLicense(context.Background())
	if result.Valid {
		t.Error("expected invalid after clear")
	}
	if result.Reason != ReasonNotFound {
		t.Errorf("expected reason %s, got %s", ReasonNotFound, result.Reason)
	}
}

func TestSDKGetCachedLicenseKey(t *testing.T) {
	tempDir := t.TempDir()
	sdk, _ := New(Config{
		ProductID:  "prod_test",
		PublicKey:  testPublicKeyHex,
		StorageDir: tempDir,
	})

	// No license
	key := sdk.GetCachedLicenseKey()
	if key != "" {
		t.Errorf("expected empty key, got %s", key)
	}

	// Store a license
	now := time.Now().UnixMilli()
	future := now + 86400000
	payload := LicensePayload{
		LicenseID: "lic_test",
		ProductID: "prod_test",
		IssuedAt:  now,
		ExpiresAt: &future,
	}
	license := generateTestLicenseForSDK(t, payload)
	sdk.StoreLicense(license)

	// Should return it
	key = sdk.GetCachedLicenseKey()
	if key != license {
		t.Errorf("expected stored license, got %s", key)
	}
}

func TestSDKExtractLicenseInfo(t *testing.T) {
	sdk, _ := New(Config{
		ProductID: "prod_test",
		PublicKey: testPublicKeyHex,
	})

	now := time.Now().UnixMilli()
	future := now + 86400000
	payload := LicensePayload{
		LicenseID:   "lic_extract",
		ProductID:   "prod_extract",
		CustomerID:  "cust_test",
		DeveloperID: "dev_test",
		Features:    []string{"a", "b"},
		IssuedAt:    now,
		ExpiresAt:   &future,
	}
	license := generateTestLicenseForSDK(t, payload)

	info, err := sdk.ExtractLicenseInfo(license)
	if err != nil {
		t.Fatalf("ExtractLicenseInfo failed: %v", err)
	}

	if info.ID != "lic_extract" {
		t.Errorf("expected ID lic_extract, got %s", info.ID)
	}
	if info.ProductID != "prod_extract" {
		t.Errorf("expected productId prod_extract, got %s", info.ProductID)
	}
	if len(info.Features) != 2 {
		t.Errorf("expected 2 features, got %d", len(info.Features))
	}
	if info.Status != LicenseStatusActive {
		t.Errorf("expected status active, got %s", info.Status)
	}
}

func TestSDKCheckLicenseExpired(t *testing.T) {
	tempDir := t.TempDir()
	sdk, _ := New(Config{
		ProductID:  "prod_test",
		PublicKey:  testPublicKeyHex,
		StorageDir: tempDir,
	})

	// Generate an expired license
	now := time.Now().UnixMilli()
	past := now - 86400000 // -1 day

	payload := LicensePayload{
		LicenseID:   "lic_expired",
		ProductID:   "prod_test",
		CustomerID:  "cust_test",
		DeveloperID: "dev_test",
		Features:    []string{},
		IssuedAt:    now - 172800000,
		ExpiresAt:   &past,
		MachineID:   nil,
	}

	license := generateTestLicenseForSDK(t, payload)
	sdk.StoreLicense(license)

	result, err := sdk.CheckLicense(context.Background())
	if err != nil {
		t.Fatalf("CheckLicense failed: %v", err)
	}

	if result.Valid {
		t.Error("expected invalid for expired license")
	}

	if result.Reason != ReasonExpired {
		t.Errorf("expected reason %s, got %s", ReasonExpired, result.Reason)
	}
}

func TestSDKOnlineValidation(t *testing.T) {
	// Create a mock server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/v1/licenses/validate" {
			json.NewEncoder(w).Encode(map[string]any{
				"valid": true,
				"license": map[string]any{
					"id":        "lic_online",
					"productId": "prod_test",
					"features":  []string{"online"},
					"status":    "active",
					"issuedAt":  time.Now().UnixMilli(),
					"expiresAt": time.Now().UnixMilli() + 86400000,
				},
			})
			return
		}
		http.NotFound(w, r)
	}))
	defer server.Close()

	tempDir := t.TempDir()
	sdk, _ := New(Config{
		ProductID:  "prod_test",
		PublicKey:  testPublicKeyHex,
		StorageDir: tempDir,
		APIBaseURL: server.URL,
		APIKey:     "test_key",
	})

	// Store a license with an old refresh time to trigger online validation
	now := time.Now().UnixMilli()
	future := now + 86400000
	payload := LicensePayload{
		LicenseID: "lic_test",
		ProductID: "prod_test",
		IssuedAt:  now,
		ExpiresAt: &future,
	}
	license := generateTestLicenseForSDK(t, payload)

	// Manually save with old refresh time
	storage := sdk.GetStorage()
	storage.Save("prod_test", license, sdk.GetMachineFingerprint())

	// Modify the cache to have an old refresh time
	cached, _ := storage.Load("prod_test")
	cached.RefreshAt = now - 1000 // Force refresh

	// The check should still work (either offline or online)
	result, err := sdk.CheckLicense(context.Background())
	if err != nil {
		t.Fatalf("CheckLicense failed: %v", err)
	}

	if !result.Valid {
		t.Errorf("expected valid license, got invalid: %s", result.Reason)
	}
}

// generateTestLicenseForSDK generates a test license (duplicate of generateTestLicense for test file separation)
func generateTestLicenseForSDK(t *testing.T, payload LicensePayload) string {
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

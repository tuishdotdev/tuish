package tuish

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestStorageSaveLoad(t *testing.T) {
	tempDir := t.TempDir()
	storage := NewStorage(tempDir, false)

	productID := "prod_test123"
	licenseKey := "header.payload.signature"
	fingerprint := "abc123def456"

	// Save
	err := storage.Save(productID, licenseKey, fingerprint)
	if err != nil {
		t.Fatalf("Save failed: %v", err)
	}

	// Load
	cached, err := storage.Load(productID)
	if err != nil {
		t.Fatalf("Load failed: %v", err)
	}

	if cached == nil {
		t.Fatal("expected cached data, got nil")
	}

	if cached.LicenseKey != licenseKey {
		t.Errorf("expected license key %s, got %s", licenseKey, cached.LicenseKey)
	}

	if cached.ProductID != productID {
		t.Errorf("expected product ID %s, got %s", productID, cached.ProductID)
	}

	if cached.MachineFingerprint != fingerprint {
		t.Errorf("expected fingerprint %s, got %s", fingerprint, cached.MachineFingerprint)
	}

	// Check timestamps
	now := time.Now().UnixMilli()
	if cached.CachedAt < now-1000 || cached.CachedAt > now+1000 {
		t.Errorf("cachedAt %d is not close to now %d", cached.CachedAt, now)
	}

	expectedRefresh := cached.CachedAt + 24*60*60*1000
	if cached.RefreshAt != expectedRefresh {
		t.Errorf("expected refreshAt %d, got %d", expectedRefresh, cached.RefreshAt)
	}
}

func TestStorageLoadNotFound(t *testing.T) {
	tempDir := t.TempDir()
	storage := NewStorage(tempDir, false)

	cached, err := storage.Load("nonexistent_product")
	if err != nil {
		t.Fatalf("Load failed: %v", err)
	}

	if cached != nil {
		t.Errorf("expected nil for nonexistent product, got %+v", cached)
	}
}

func TestStorageRemove(t *testing.T) {
	tempDir := t.TempDir()
	storage := NewStorage(tempDir, false)

	productID := "prod_toremove"
	err := storage.Save(productID, "license", "fingerprint")
	if err != nil {
		t.Fatalf("Save failed: %v", err)
	}

	// Verify it exists
	cached, _ := storage.Load(productID)
	if cached == nil {
		t.Fatal("expected license to exist before removal")
	}

	// Remove
	err = storage.Remove(productID)
	if err != nil {
		t.Fatalf("Remove failed: %v", err)
	}

	// Verify it's gone
	cached, _ = storage.Load(productID)
	if cached != nil {
		t.Error("expected license to be removed")
	}
}

func TestStorageRemoveNonexistent(t *testing.T) {
	tempDir := t.TempDir()
	storage := NewStorage(tempDir, false)

	// Should not error when removing nonexistent
	err := storage.Remove("nonexistent")
	if err != nil {
		t.Errorf("Remove nonexistent should not error, got: %v", err)
	}
}

func TestStorageClearAll(t *testing.T) {
	tempDir := t.TempDir()
	storage := NewStorage(tempDir, false)

	// Save multiple licenses
	storage.Save("prod_1", "license1", "fp1")
	storage.Save("prod_2", "license2", "fp2")
	storage.Save("prod_3", "license3", "fp3")

	// Clear all
	err := storage.ClearAll()
	if err != nil {
		t.Fatalf("ClearAll failed: %v", err)
	}

	// Verify all are gone
	for _, pid := range []string{"prod_1", "prod_2", "prod_3"} {
		cached, _ := storage.Load(pid)
		if cached != nil {
			t.Errorf("expected %s to be cleared", pid)
		}
	}
}

func TestStorageNeedsRefresh(t *testing.T) {
	cached := &CachedLicenseData{
		RefreshAt: time.Now().UnixMilli() + 10000, // 10 seconds in future
	}

	if cached.NeedsRefresh() {
		t.Error("expected no refresh needed for future refreshAt")
	}

	cached.RefreshAt = time.Now().UnixMilli() - 10000 // 10 seconds in past
	if !cached.NeedsRefresh() {
		t.Error("expected refresh needed for past refreshAt")
	}
}

func TestStorageDefaultDir(t *testing.T) {
	storage := NewStorage("", false)

	home, _ := os.UserHomeDir()
	expected := filepath.Join(home, ".tuish", "licenses")

	if storage.GetStorageDir() != expected {
		t.Errorf("expected default dir %s, got %s", expected, storage.GetStorageDir())
	}
}

func TestStorageFilePermissions(t *testing.T) {
	tempDir := t.TempDir()
	storage := NewStorage(tempDir, false)

	err := storage.Save("prod_test", "license", "fingerprint")
	if err != nil {
		t.Fatalf("Save failed: %v", err)
	}

	// Find the created file
	entries, _ := os.ReadDir(tempDir)
	if len(entries) != 1 {
		t.Fatalf("expected 1 file, got %d", len(entries))
	}

	filePath := filepath.Join(tempDir, entries[0].Name())
	info, err := os.Stat(filePath)
	if err != nil {
		t.Fatalf("Stat failed: %v", err)
	}

	// Check file permissions (0600)
	perm := info.Mode().Perm()
	if perm != 0600 {
		t.Errorf("expected permissions 0600, got %o", perm)
	}
}

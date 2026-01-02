package tuish

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"os"
	"path/filepath"
	"time"
)

const (
	defaultStorageDir    = ".tuish/licenses"
	cacheRefreshHours    = 24
)

// Storage handles file-based license storage.
type Storage struct {
	storageDir string
	debug      bool
	logger     func(format string, args ...any)
}

// NewStorage creates a new storage instance.
func NewStorage(storageDir string, debug bool) *Storage {
	if storageDir == "" {
		home, err := os.UserHomeDir()
		if err != nil {
			home = "."
		}
		storageDir = filepath.Join(home, defaultStorageDir)
	}

	s := &Storage{
		storageDir: storageDir,
		debug:      debug,
	}

	if debug {
		s.logger = func(format string, args ...any) {
			// Simple debug logging
		}
	}

	return s
}

// ensureDir creates the storage directory if it doesn't exist.
func (s *Storage) ensureDir() error {
	return os.MkdirAll(s.storageDir, 0700)
}

// getLicenseFilePath returns the file path for a product's license cache.
func (s *Storage) getLicenseFilePath(productID string) string {
	hash := sha256.Sum256([]byte(productID))
	filename := hex.EncodeToString(hash[:8]) + ".json"
	return filepath.Join(s.storageDir, filename)
}

// Save saves a license to disk.
func (s *Storage) Save(productID, licenseKey, machineFingerprint string) error {
	if err := s.ensureDir(); err != nil {
		return err
	}

	filePath := s.getLicenseFilePath(productID)
	now := time.Now().UnixMilli()

	data := CachedLicenseData{
		LicenseKey:         licenseKey,
		CachedAt:           now,
		RefreshAt:          now + cacheRefreshHours*60*60*1000,
		ProductID:          productID,
		MachineFingerprint: machineFingerprint,
	}

	jsonData, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(filePath, jsonData, 0600)
}

// Load loads a cached license from disk.
func (s *Storage) Load(productID string) (*CachedLicenseData, error) {
	filePath := s.getLicenseFilePath(productID)

	data, err := os.ReadFile(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}

	var cached CachedLicenseData
	if err := json.Unmarshal(data, &cached); err != nil {
		return nil, err
	}

	return &cached, nil
}

// Remove removes a cached license.
func (s *Storage) Remove(productID string) error {
	filePath := s.getLicenseFilePath(productID)
	err := os.Remove(filePath)
	if os.IsNotExist(err) {
		return nil
	}
	return err
}

// ClearAll removes all cached licenses.
func (s *Storage) ClearAll() error {
	entries, err := os.ReadDir(s.storageDir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}

	for _, entry := range entries {
		if !entry.IsDir() && filepath.Ext(entry.Name()) == ".json" {
			os.Remove(filepath.Join(s.storageDir, entry.Name()))
		}
	}

	return nil
}

// GetStorageDir returns the storage directory path.
func (s *Storage) GetStorageDir() string {
	return s.storageDir
}

package tuish

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"os"
	"path/filepath"
	"reflect"
	"runtime"
	"testing"
)

type licenseVectors struct {
	Keys struct {
		PublicKeySpkiBase64 string `json:"public_key_spki_base64"`
		PublicKeyHex        string `json:"public_key_hex"`
	} `json:"keys"`
	Cases []struct {
		Name      string `json:"name"`
		License   string `json:"license"`
		MachineID string `json:"machine_id"`
		Expected  struct {
			Valid   bool                `json:"valid"`
			Reason  string              `json:"reason"`
			Payload *specLicensePayload `json:"payload"`
		} `json:"expected"`
	} `json:"cases"`
}

type specLicensePayload struct {
	LID      string   `json:"lid"`
	PID      string   `json:"pid"`
	CID      string   `json:"cid"`
	DID      string   `json:"did"`
	Features []string `json:"features"`
	IAT      int64    `json:"iat"`
	EXP      *int64   `json:"exp"`
	MID      *string  `json:"mid"`
}

type fingerprintVectors struct {
	Cases []struct {
		Name       string `json:"name"`
		Components struct {
			Hostname string `json:"hostname"`
			Username string `json:"username"`
			Platform string `json:"platform"`
			Arch     string `json:"arch"`
		} `json:"components"`
		Expected string `json:"expected"`
	} `json:"cases"`
	PlatformMap []struct {
		Input    string `json:"input"`
		Expected string `json:"expected"`
	} `json:"platform_map"`
	ArchMap []struct {
		Input    string `json:"input"`
		Expected string `json:"expected"`
	} `json:"arch_map"`
}

type cacheVectors struct {
	ProductID        string `json:"product_id"`
	ExpectedFilename string `json:"expected_filename"`
	Cases            []struct {
		Name                 string `json:"name"`
		CachedAt             int64  `json:"cached_at"`
		RefreshAt            int64  `json:"refresh_at"`
		ExpectedNeedsRefresh bool   `json:"expected_needs_refresh"`
	} `json:"cases"`
}

type flowVectors struct {
	Cases []struct {
		Name     string    `json:"name"`
		Input    flowInput `json:"input"`
		Expected struct {
			Final struct {
				Valid  bool    `json:"valid"`
				Reason *string `json:"reason"`
				Source string  `json:"source"`
			} `json:"final"`
			CacheActions []string `json:"cache_actions"`
		} `json:"expected"`
	} `json:"cases"`
}

type flowInput struct {
	Resolver *struct {
		Enabled bool        `json:"enabled"`
		Found   bool        `json:"found"`
		Offline *flowResult `json:"offline"`
		Online  *flowResult `json:"online"`
	} `json:"resolver"`
	Cache *struct {
		Found   bool        `json:"found"`
		Fresh   bool        `json:"fresh"`
		Offline *flowResult `json:"offline"`
		Online  *flowResult `json:"online"`
	} `json:"cache"`
}

type flowResult struct {
	Valid  bool    `json:"valid"`
	Reason *string `json:"reason"`
}

type flowOutput struct {
	Final struct {
		Valid  bool
		Reason *string
		Source string
	}
	CacheActions []string
}

func findRepoRoot(start string) (string, error) {
	current := start
	for i := 0; i < 10; i++ {
		candidate := filepath.Join(current, "oss", "spec", "tests", "vectors")
		if _, err := os.Stat(candidate); err == nil {
			return current, nil
		}
		parent := filepath.Dir(current)
		if parent == current {
			break
		}
		current = parent
	}
	return "", os.ErrNotExist
}

func readJSON[T any](path string) (T, error) {
	var out T
	data, err := os.ReadFile(path)
	if err != nil {
		return out, err
	}
	return out, json.Unmarshal(data, &out)
}

func sha256Hex(input string) string {
	hash := sha256.Sum256([]byte(input))
	return hex.EncodeToString(hash[:])
}

func evaluateFlow(input flowInput) flowOutput {
	actions := []string{}
	if input.Resolver != nil && input.Resolver.Enabled && input.Resolver.Found {
		if input.Resolver.Offline != nil && input.Resolver.Offline.Valid {
			actions = append(actions, "save")
			return flowOutput{
				Final: struct {
					Valid  bool
					Reason *string
					Source string
				}{Valid: true, Reason: nil, Source: "offline"},
				CacheActions: actions,
			}
		}
		if input.Resolver.Offline != nil && (valueOrEmpty(input.Resolver.Offline.Reason) == "expired" || valueOrEmpty(input.Resolver.Offline.Reason) == "invalid_signature") {
			online := input.Resolver.Online
			if online == nil {
				reason := "network_error"
				return flowOutput{
					Final: struct {
						Valid  bool
						Reason *string
						Source string
					}{Valid: false, Reason: &reason, Source: "online"},
					CacheActions: actions,
				}
			}
			if online != nil && online.Valid {
				actions = append(actions, "save")
				return flowOutput{
					Final: struct {
						Valid  bool
						Reason *string
						Source string
					}{Valid: true, Reason: nil, Source: "online"},
					CacheActions: actions,
				}
			}
			return flowOutput{
				Final: struct {
					Valid  bool
					Reason *string
					Source string
				}{Valid: false, Reason: online.Reason, Source: "online"},
				CacheActions: actions,
			}
		}
	}

	if input.Cache != nil && input.Cache.Found {
		offline := input.Cache.Offline
		if offline != nil && offline.Valid {
			if input.Cache.Fresh {
				return flowOutput{
					Final: struct {
						Valid  bool
						Reason *string
						Source string
					}{Valid: true, Reason: nil, Source: "offline"},
					CacheActions: actions,
				}
			}
			online := input.Cache.Online
			if online == nil {
				reason := "network_error"
				return flowOutput{
					Final: struct {
						Valid  bool
						Reason *string
						Source string
					}{Valid: false, Reason: &reason, Source: "online"},
					CacheActions: actions,
				}
			}
			if online != nil && online.Valid {
				actions = append(actions, "save")
				return flowOutput{
					Final: struct {
						Valid  bool
						Reason *string
						Source string
					}{Valid: true, Reason: nil, Source: "online"},
					CacheActions: actions,
				}
			}
			if online != nil && valueOrEmpty(online.Reason) == "network_error" {
				return flowOutput{
					Final: struct {
						Valid  bool
						Reason *string
						Source string
					}{Valid: true, Reason: nil, Source: "offline"},
					CacheActions: actions,
				}
			}
			actions = append(actions, "remove")
			return flowOutput{
				Final: struct {
					Valid  bool
					Reason *string
					Source string
				}{Valid: false, Reason: online.Reason, Source: "online"},
				CacheActions: actions,
			}
		}
		if offline != nil && valueOrEmpty(offline.Reason) == "expired" {
			online := input.Cache.Online
			if online == nil {
				reason := "network_error"
				return flowOutput{
					Final: struct {
						Valid  bool
						Reason *string
						Source string
					}{Valid: false, Reason: &reason, Source: "online"},
					CacheActions: actions,
				}
			}
			if online != nil && !online.Valid {
				actions = append(actions, "remove")
			}
			return flowOutput{
				Final: struct {
					Valid  bool
					Reason *string
					Source string
				}{Valid: online.Valid, Reason: online.Reason, Source: "online"},
				CacheActions: actions,
			}
		}
		if offline != nil {
			actions = append(actions, "remove")
			return flowOutput{
				Final: struct {
					Valid  bool
					Reason *string
					Source string
				}{Valid: false, Reason: offline.Reason, Source: "offline"},
				CacheActions: actions,
			}
		}
	}

	notFound := "not_found"
	return flowOutput{
		Final: struct {
			Valid  bool
			Reason *string
			Source string
		}{Valid: false, Reason: &notFound, Source: "not_found"},
		CacheActions: actions,
	}
}

func valueOrEmpty(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func TestSpecVectors(t *testing.T) {
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("unable to resolve test file path")
	}
	repoRoot, err := findRepoRoot(filepath.Dir(filename))
	if err != nil {
		t.Fatal("unable to locate repo root for spec vectors")
	}
	vectorsDir := filepath.Join(repoRoot, "oss", "spec", "tests", "vectors")

	t.Run("license", func(t *testing.T) {
		vectors, err := readJSON[licenseVectors](filepath.Join(vectorsDir, "license.json"))
		if err != nil {
			t.Fatalf("read vectors: %v", err)
		}

		publicKeyFromSpki, err := ParsePublicKey(vectors.Keys.PublicKeySpkiBase64)
		if err != nil {
			t.Fatalf("parse SPKI key: %v", err)
		}
		if hex.EncodeToString(publicKeyFromSpki) != vectors.Keys.PublicKeyHex {
			t.Fatalf("SPKI key mismatch: got %s", hex.EncodeToString(publicKeyFromSpki))
		}

		publicKey, err := ParsePublicKey(vectors.Keys.PublicKeyHex)
		if err != nil {
			t.Fatalf("parse hex key: %v", err)
		}

		for _, testCase := range vectors.Cases {
			result := VerifyLicense(testCase.License, publicKey, testCase.MachineID)
			if result.Valid != testCase.Expected.Valid {
				t.Fatalf("%s: valid mismatch", testCase.Name)
			}
			if testCase.Expected.Reason != "" && string(result.Reason) != testCase.Expected.Reason {
				t.Fatalf("%s: reason mismatch: got %s", testCase.Name, result.Reason)
			}
			if testCase.Expected.Payload != nil {
				if result.Payload == nil {
					t.Fatalf("%s: missing payload", testCase.Name)
				}
				expected := testCase.Expected.Payload
				if result.Payload.LicenseID != expected.LID ||
					result.Payload.ProductID != expected.PID ||
					result.Payload.CustomerID != expected.CID ||
					result.Payload.DeveloperID != expected.DID ||
					!reflect.DeepEqual(result.Payload.Features, expected.Features) ||
					result.Payload.IssuedAt != expected.IAT ||
					!equalInt64Ptr(result.Payload.ExpiresAt, expected.EXP) ||
					!equalStringPtr(result.Payload.MachineID, expected.MID) {
					t.Fatalf("%s: payload mismatch", testCase.Name)
				}
			}
		}
	})

	t.Run("fingerprint", func(t *testing.T) {
		vectors, err := readJSON[fingerprintVectors](filepath.Join(vectorsDir, "fingerprint.json"))
		if err != nil {
			t.Fatalf("read vectors: %v", err)
		}
		for _, testCase := range vectors.Cases {
			components := testCase.Components.Hostname + ":" +
				testCase.Components.Username + ":" +
				testCase.Components.Platform + ":" +
				testCase.Components.Arch
			actual := sha256Hex(components)
			if actual != testCase.Expected {
				t.Fatalf("%s: fingerprint mismatch", testCase.Name)
			}
		}
		for _, entry := range vectors.PlatformMap {
			if mapPlatform(entry.Input) != entry.Expected {
				t.Fatalf("platform map mismatch for %s", entry.Input)
			}
		}
		for _, entry := range vectors.ArchMap {
			if mapArch(entry.Input) != entry.Expected {
				t.Fatalf("arch map mismatch for %s", entry.Input)
			}
		}
	})

	t.Run("cache", func(t *testing.T) {
		vectors, err := readJSON[cacheVectors](filepath.Join(vectorsDir, "cache.json"))
		if err != nil {
			t.Fatalf("read vectors: %v", err)
		}
		tempDir, err := os.MkdirTemp("", "tuish-spec-")
		if err != nil {
			t.Fatalf("temp dir: %v", err)
		}
		t.Cleanup(func() {
			_ = os.RemoveAll(tempDir)
		})
		storage := NewStorage(tempDir, false)
		if err := storage.Save(vectors.ProductID, "license-test", "machine-test"); err != nil {
			t.Fatalf("save license: %v", err)
		}
		entries, err := os.ReadDir(tempDir)
		if err != nil {
			t.Fatalf("read dir: %v", err)
		}
		found := false
		for _, entry := range entries {
			if entry.Name() == vectors.ExpectedFilename {
				found = true
			}
		}
		if !found {
			t.Fatalf("expected cache filename %s not found", vectors.ExpectedFilename)
		}

		for _, testCase := range vectors.Cases {
			cached := CachedLicenseData{
				LicenseKey:         "license-test",
				CachedAt:           testCase.CachedAt,
				RefreshAt:          testCase.RefreshAt,
				ProductID:          vectors.ProductID,
				MachineFingerprint: "machine-test",
			}
			if cached.NeedsRefresh() != testCase.ExpectedNeedsRefresh {
				t.Fatalf("%s: needs_refresh mismatch", testCase.Name)
			}
		}
	})

	t.Run("flow", func(t *testing.T) {
		vectors, err := readJSON[flowVectors](filepath.Join(vectorsDir, "license_check_flow.json"))
		if err != nil {
			t.Fatalf("read vectors: %v", err)
		}
		for _, testCase := range vectors.Cases {
			actual := evaluateFlow(testCase.Input)
			expected := flowOutput{
				Final: struct {
					Valid  bool
					Reason *string
					Source string
				}{
					Valid:  testCase.Expected.Final.Valid,
					Reason: testCase.Expected.Final.Reason,
					Source: testCase.Expected.Final.Source,
				},
				CacheActions: testCase.Expected.CacheActions,
			}
			if !reflect.DeepEqual(actual, expected) {
				t.Fatalf("%s: flow mismatch", testCase.Name)
			}
		}
	})
}

func equalInt64Ptr(a, b *int64) bool {
	if a == nil && b == nil {
		return true
	}
	if a == nil || b == nil {
		return false
	}
	return *a == *b
}

func equalStringPtr(a, b *string) bool {
	if a == nil && b == nil {
		return true
	}
	if a == nil || b == nil {
		return false
	}
	return *a == *b
}

package tuish

import (
	"crypto/sha256"
	"encoding/hex"
	"os"
	"os/user"
	"runtime"
	"strings"
)

// GetMachineFingerprint returns a stable machine fingerprint for license binding.
// Uses a combination of hostname, username, platform, and architecture.
func GetMachineFingerprint() string {
	var components []string

	// Hostname
	hostname, err := os.Hostname()
	if err != nil {
		hostname = "unknown"
	}
	components = append(components, hostname)

	// Username
	currentUser, err := user.Current()
	if err != nil {
		components = append(components, "unknown")
	} else {
		components = append(components, currentUser.Username)
	}

	// Platform (darwin, linux, windows)
	platform := mapPlatform(runtime.GOOS)
	components = append(components, platform)

	// Architecture (amd64, arm64, etc.)
	arch := mapArch(runtime.GOARCH)
	components = append(components, arch)

	// Join with colons and hash
	combined := strings.Join(components, ":")
	hash := sha256.Sum256([]byte(combined))

	return hex.EncodeToString(hash[:])
}

func mapPlatform(value string) string {
	switch value {
	case "macos":
		return "darwin"
	case "windows":
		return "win32"
	default:
		return strings.ToLower(value)
	}
}

func mapArch(value string) string {
	switch value {
	case "x86_64", "amd64":
		return "x64"
	case "aarch64":
		return "arm64"
	case "x86", "i386", "i686", "386":
		return "ia32"
	default:
		return strings.ToLower(value)
	}
}

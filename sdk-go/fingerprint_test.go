package tuish

import (
	"encoding/hex"
	"testing"
)

func TestGetMachineFingerprint(t *testing.T) {
	fp := GetMachineFingerprint()

	// Should be a 64-character hex string (SHA256)
	if len(fp) != 64 {
		t.Errorf("expected 64 character fingerprint, got %d", len(fp))
	}

	// Should be valid hex
	_, err := hex.DecodeString(fp)
	if err != nil {
		t.Errorf("fingerprint is not valid hex: %v", err)
	}
}

func TestGetMachineFingerprintConsistent(t *testing.T) {
	fp1 := GetMachineFingerprint()
	fp2 := GetMachineFingerprint()

	if fp1 != fp2 {
		t.Errorf("fingerprint should be consistent, got %s and %s", fp1, fp2)
	}
}

func TestGetMachineFingerprintNotEmpty(t *testing.T) {
	fp := GetMachineFingerprint()

	if fp == "" {
		t.Error("fingerprint should not be empty")
	}

	// Should not be all zeros
	allZeros := true
	for _, c := range fp {
		if c != '0' {
			allZeros = false
			break
		}
	}
	if allZeros {
		t.Error("fingerprint should not be all zeros")
	}
}

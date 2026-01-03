package tuish

import (
	"bytes"
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

type cliVectors struct {
	Cases []cliCase `json:"cases"`
}

type cliCase struct {
	Name   string    `json:"name"`
	Args   []string  `json:"args"`
	Expect cliExpect `json:"expect"`
}

type cliExpect struct {
	ExitCode int             `json:"exit_code"`
	Stdout   json.RawMessage `json:"stdout"`
	Stderr   json.RawMessage `json:"stderr"`
}

func TestCliVectors(t *testing.T) {
	vectorsPath := filepath.Join("..", "spec", "tests", "vectors", "cli.json")
	data, err := os.ReadFile(vectorsPath)
	if err != nil {
		t.Fatalf("read vectors: %v", err)
	}

	var vectors cliVectors
	if err := json.Unmarshal(data, &vectors); err != nil {
		t.Fatalf("parse vectors: %v", err)
	}

	bin := buildCLIBinary(t)

	for _, testCase := range vectors.Cases {
		testCase := testCase
		t.Run(testCase.Name, func(t *testing.T) {
			tempDir := t.TempDir()
			configPath := filepath.Join(tempDir, "config.json")
			args := append([]string{"--config", configPath, "--json"}, testCase.Args...)

			stdout, stderr, exitCode := runCLI(t, bin, args)

			if exitCode != testCase.Expect.ExitCode {
				t.Fatalf("exit code: got %d want %d", exitCode, testCase.Expect.ExitCode)
			}

			if len(testCase.Expect.Stdout) > 0 {
				compareJSON(t, stdout, testCase.Expect.Stdout)
			}

			if len(testCase.Expect.Stderr) > 0 {
				compareJSON(t, stderr, testCase.Expect.Stderr)
			}
		})
	}
}

func buildCLIBinary(t *testing.T) string {
	t.Helper()
	tempDir := t.TempDir()
	binPath := filepath.Join(tempDir, "tuish-cli")
	cmd := exec.Command("go", "build", "-o", binPath, ".")
	cmd.Dir = filepath.Join(".", "cli")
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		t.Fatalf("build cli: %v (%s)", err, strings.TrimSpace(stderr.String()))
	}
	return binPath
}

func runCLI(t *testing.T, bin string, args []string) (string, string, int) {
	t.Helper()
	cmd := exec.Command(bin, args...)
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	err := cmd.Run()

	exitCode := 0
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			exitCode = exitErr.ExitCode()
		} else {
			t.Fatalf("run cli: %v", err)
		}
	}
	return stdout.String(), stderr.String(), exitCode
}

func compareJSON(t *testing.T, output string, expected json.RawMessage) {
	t.Helper()
	var gotValue any
	if err := json.Unmarshal([]byte(strings.TrimSpace(output)), &gotValue); err != nil {
		t.Fatalf("parse output json: %v (%s)", err, strings.TrimSpace(output))
	}

	var expectedValue any
	if err := json.Unmarshal(expected, &expectedValue); err != nil {
		t.Fatalf("parse expected json: %v (%s)", err, strings.TrimSpace(string(expected)))
	}

	if !deepEqualJSON(gotValue, expectedValue) {
		gotBytes, _ := json.MarshalIndent(gotValue, "", "  ")
		expBytes, _ := json.MarshalIndent(expectedValue, "", "  ")
		t.Fatalf("json mismatch:\n%s\n!=\n%s", string(gotBytes), string(expBytes))
	}
}

func deepEqualJSON(a, b any) bool {
	return reflect.DeepEqual(a, b)
}

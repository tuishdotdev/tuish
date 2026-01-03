package cmd

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
)

type Config struct {
	APIKey     string `json:"apiKey,omitempty"`
	APIBaseURL string `json:"apiBaseUrl,omitempty"`
}

func resolveConfigPath() (string, error) {
	if configPath != "" {
		return configPath, nil
	}
	if env := os.Getenv("TUISH_CONFIG"); env != "" {
		return env, nil
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".tuish", "config.json"), nil
}

func loadConfig() (Config, string, error) {
	path, err := resolveConfigPath()
	if err != nil {
		return Config{}, "", err
	}
	data, err := os.ReadFile(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return Config{}, path, nil
		}
		return Config{}, path, err
	}

	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return Config{}, path, err
	}
	return cfg, path, nil
}

func saveConfig(cfg Config) (string, error) {
	path, err := resolveConfigPath()
	if err != nil {
		return "", err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return path, err
	}
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return path, err
	}
	return path, os.WriteFile(path, data, 0o600)
}

func deleteConfig() (string, error) {
	path, err := resolveConfigPath()
	if err != nil {
		return "", err
	}
	if err := os.Remove(path); err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return path, nil
		}
		return path, err
	}
	return path, nil
}

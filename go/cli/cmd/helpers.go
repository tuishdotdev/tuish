package cmd

import (
	"errors"
	"fmt"
)

func requireAPIKey() (Config, error) {
	cfg, _, err := loadConfig()
	if err != nil {
		return Config{}, err
	}
	if cfg.APIKey == "" {
		return Config{}, errors.New("No API key found; run tuish login")
	}
	return cfg, nil
}

func printPlaceholder(title, detail string) {
	if outputJSON {
		writeJSONNotImplemented(title, detail)
		return
	}
	fmt.Println(titleStyle.Render(title))
	fmt.Println(warnStyle.Render("Not implemented yet"))
	if detail != "" {
		fmt.Println(mutedStyle.Render(detail))
	}
}

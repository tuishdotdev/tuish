package cmd

import (
	"errors"
	"fmt"

	"github.com/spf13/cobra"
)

var keysCmd = &cobra.Command{
	Use:   "keys",
	Short: "Show stored API credentials",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg, _, err := loadConfig()
		if err != nil {
			return err
		}
		if cfg.APIKey == "" {
			return errors.New("No API key found; run tuish login")
		}

		if outputJSON {
			payload := map[string]string{
				"apiKey": cfg.APIKey,
			}
			if cfg.APIBaseURL != "" {
				payload["apiBaseUrl"] = cfg.APIBaseURL
			}
			return writeJSON(cmd.OutOrStdout(), payload)
		}

		fmt.Println(titleStyle.Render("API Key"))
		fmt.Println(cfg.APIKey)
		if cfg.APIBaseURL != "" {
			fmt.Println()
			fmt.Println(titleStyle.Render("API Base URL"))
			fmt.Println(cfg.APIBaseURL)
		}
		return nil
	},
}

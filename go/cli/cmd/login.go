package cmd

import (
	"bufio"
	"errors"
	"fmt"
	"os"
	"strings"

	"github.com/spf13/cobra"
)

const defaultAPIBaseURL = "https://api.tuish.dev"

var loginAPIKey string

var loginCmd = &cobra.Command{
	Use:   "login",
	Short: "Store your Tuish API key",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg, _, err := loadConfig()
		if err != nil {
			return err
		}

		apiKey := strings.TrimSpace(loginAPIKey)
		if apiKey == "" && outputJSON {
			return errors.New("API key is required")
		}
		if apiKey == "" {
			fmt.Print("Enter your Tuish API key: ")
			reader := bufio.NewReader(os.Stdin)
			input, readErr := reader.ReadString('\n')
			if readErr != nil {
				return readErr
			}
			apiKey = strings.TrimSpace(input)
		}

		if apiKey == "" {
			return errors.New("API key is required")
		}

		cfg.APIKey = apiKey
		if apiBaseURL != "" {
			cfg.APIBaseURL = apiBaseURL
		} else if cfg.APIBaseURL == "" {
			cfg.APIBaseURL = defaultAPIBaseURL
		}

		path, err := saveConfig(cfg)
		if err != nil {
			return err
		}

		if outputJSON {
			return writeJSONSuccess("API key stored successfully")
		}

		fmt.Println(successStyle.Render("Saved credentials."))
		fmt.Println(mutedStyle.Render(fmt.Sprintf("Config: %s", path)))
		return nil
	},
}

func init() {
	loginCmd.Flags().StringVar(&loginAPIKey, "api-key", "", "API key to store")
}

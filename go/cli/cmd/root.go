package cmd

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

var (
	configPath string
	apiBaseURL string
	outputJSON bool
)

var rootCmd = &cobra.Command{
	Use:           "tuish",
	Short:         "Tuish developer CLI",
	SilenceUsage:  true,
	SilenceErrors: true,
}

func Execute() {
	if err := rootCmd.Execute(); err != nil {
		if outputJSON {
			writeJSONError(err)
		} else {
			_, _ = fmt.Fprintln(os.Stderr, err)
		}
		os.Exit(1)
	}
}

func init() {
	rootCmd.PersistentFlags().StringVar(&configPath, "config", "", "Path to config file")
	rootCmd.PersistentFlags().StringVar(&apiBaseURL, "api-url", "", "Override API base URL")
	rootCmd.PersistentFlags().BoolVarP(&outputJSON, "json", "j", false, "Output JSON (headless mode for scripting)")

	rootCmd.AddCommand(
		loginCmd,
		logoutCmd,
		productsCmd,
		customersCmd,
		keysCmd,
		analyticsCmd,
		demoCmd,
	)
}

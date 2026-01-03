package cmd

import (
	"fmt"

	"github.com/spf13/cobra"
)

var logoutCmd = &cobra.Command{
	Use:   "logout",
	Short: "Clear local Tuish credentials",
	RunE: func(cmd *cobra.Command, args []string) error {
		path, err := deleteConfig()
		if err != nil {
			return err
		}
		if outputJSON {
			return writeJSONSuccess("Logged out successfully")
		}
		fmt.Println(successStyle.Render("Credentials cleared."))
		fmt.Println(mutedStyle.Render(fmt.Sprintf("Config: %s", path)))
		return nil
	},
}

package cmd

import "github.com/spf13/cobra"

var analyticsPeriod string

var analyticsCmd = &cobra.Command{
	Use:   "analytics",
	Short: "View revenue analytics",
	RunE: func(cmd *cobra.Command, args []string) error {
		if _, err := requireAPIKey(); err != nil {
			return err
		}
		detail := "Analytics will be added once the API is available."
		if analyticsPeriod != "" {
			detail = "Analytics period: " + analyticsPeriod
		}
		printPlaceholder("Analytics", detail)
		return nil
	},
}

func init() {
	analyticsCmd.Flags().StringVar(&analyticsPeriod, "period", "", "Time window (e.g. 7d, 30d)")
}

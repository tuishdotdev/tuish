package cmd

import "github.com/spf13/cobra"

var customersCmd = &cobra.Command{
	Use:   "customers",
	Short: "Manage customers",
	RunE: func(cmd *cobra.Command, args []string) error {
		return runCustomersList()
	},
}

var customersListCmd = &cobra.Command{
	Use:   "list",
	Short: "List customers",
	RunE: func(cmd *cobra.Command, args []string) error {
		return runCustomersList()
	},
}

var customersViewCmd = &cobra.Command{
	Use:   "view <id>",
	Short: "View a customer",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if _, err := requireAPIKey(); err != nil {
			return err
		}
		printPlaceholder("Customer details", "Customer lookup will be added once the API is available.")
		return nil
	},
}

var customersRevokeCmd = &cobra.Command{
	Use:   "revoke <id>",
	Short: "Revoke a customer license",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if _, err := requireAPIKey(); err != nil {
			return err
		}
		printPlaceholder("Revoke license", "License revocation will be added once the API is available.")
		return nil
	},
}

func runCustomersList() error {
	if _, err := requireAPIKey(); err != nil {
		return err
	}
	printPlaceholder("Customers", "Listing customers will be added once the API is available.")
	return nil
}

func init() {
	customersCmd.AddCommand(customersListCmd, customersViewCmd, customersRevokeCmd)
}

package cmd

import "github.com/spf13/cobra"

var productsCmd = &cobra.Command{
	Use:   "products",
	Short: "Manage products",
	RunE: func(cmd *cobra.Command, args []string) error {
		return runProductsList()
	},
}

var productsListCmd = &cobra.Command{
	Use:   "list",
	Short: "List products",
	RunE: func(cmd *cobra.Command, args []string) error {
		return runProductsList()
	},
}

var productsCreateCmd = &cobra.Command{
	Use:   "create",
	Short: "Create a product",
	RunE: func(cmd *cobra.Command, args []string) error {
		if _, err := requireAPIKey(); err != nil {
			return err
		}
		printPlaceholder("Create product", "Interactive creation will be added once the API is available.")
		return nil
	},
}

var productsUpdateCmd = &cobra.Command{
	Use:   "update <id>",
	Short: "Update a product",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if _, err := requireAPIKey(); err != nil {
			return err
		}
		printPlaceholder("Update product", "Pass product fields once the API is available.")
		return nil
	},
}

var productsDeleteCmd = &cobra.Command{
	Use:   "delete <id>",
	Short: "Delete a product",
	Args:  cobra.ExactArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		if _, err := requireAPIKey(); err != nil {
			return err
		}
		printPlaceholder("Delete product", "Deletion will be added once the API is available.")
		return nil
	},
}

func runProductsList() error {
	if _, err := requireAPIKey(); err != nil {
		return err
	}
	printPlaceholder("Products", "Listing products will be added once the API is available.")
	return nil
}

func init() {
	productsCmd.AddCommand(productsListCmd, productsCreateCmd, productsUpdateCmd, productsDeleteCmd)
}

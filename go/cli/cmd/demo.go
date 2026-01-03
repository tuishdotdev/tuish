package cmd

import (
	"fmt"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/spf13/cobra"
)

type demoModel struct {
	width  int
	height int
}

func (m demoModel) Init() tea.Cmd {
	return nil
}

func (m demoModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "q", "ctrl+c", "enter":
			return m, tea.Quit
		}
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
	}
	return m, nil
}

func (m demoModel) View() string {
	header := titleStyle.Render("Tuish Demo")
	body := "This is a placeholder for the interactive purchase flow."
	footer := mutedStyle.Render("Press q to exit.")
	content := lipgloss.JoinVertical(lipgloss.Left, header, "", body, "", footer)

	if m.width > 0 {
		return lipgloss.Place(m.width, m.height, lipgloss.Left, lipgloss.Top, content)
	}
	return content
}

var demoCmd = &cobra.Command{
	Use:   "demo",
	Short: "Preview the purchase flow experience",
	RunE: func(cmd *cobra.Command, args []string) error {
		if outputJSON {
			writeJSONNotImplemented("Tuish demo", "Interactive purchase flow demo will be added soon.")
			return nil
		}
		program := tea.NewProgram(demoModel{})
		if _, err := program.Run(); err != nil {
			return fmt.Errorf("run demo: %w", err)
		}
		return nil
	},
}

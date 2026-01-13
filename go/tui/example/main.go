// Example demonstrates the Tuish TUI components.
//
// Run with:
//
//	go run ./tui/example
package main

import (
	"fmt"
	"os"
	"strings"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/tuishdotdev/tuish/go/tui"
)

func main() {
	productID := os.Getenv("TUISH_PRODUCT_ID")
	publicKey := os.Getenv("TUISH_PUBLIC_KEY")

	if productID != "" && publicKey != "" {
		fmt.Println("Running with real SDK (credentials found)")
	}

	runInteractiveDemo()
}

// DemoModel is the main demo application
type DemoModel struct {
	styles       tui.Styles
	currentView  string
	menuIndex    int
	menuItems    []string
	licenseValid bool
	features     []string
	productName  string
	qrURL        string
	width        int
	height       int
}

func NewDemoModel() *DemoModel {
	return &DemoModel{
		styles:       tui.DefaultStyles(),
		currentView:  "menu",
		menuIndex:    0,
		menuItems:    []string{"license status", "purchase flow", "license gate", "qr code", "exit"},
		licenseValid: false,
		features:     []string{"pro", "export", "analytics"},
		productName:  "my-awesome-cli",
		qrURL:        "https://tuish.dev/checkout/demo",
	}
}

func (m *DemoModel) Init() tea.Cmd {
	return nil
}

func (m *DemoModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		return m, nil

	case tea.KeyMsg:
		switch msg.String() {
		case "ctrl+c", "q":
			if m.currentView == "menu" {
				return m, tea.Quit
			}
			m.currentView = "menu"
			return m, nil

		case "esc":
			if m.currentView != "menu" {
				m.currentView = "menu"
				return m, nil
			}

		case "up", "k":
			if m.currentView == "menu" && m.menuIndex > 0 {
				m.menuIndex--
			}

		case "down", "j":
			if m.currentView == "menu" && m.menuIndex < len(m.menuItems)-1 {
				m.menuIndex++
			}

		case "enter", " ":
			if m.currentView == "menu" {
				switch m.menuIndex {
				case 0:
					m.currentView = "status"
				case 1:
					m.currentView = "purchase"
				case 2:
					m.currentView = "gate"
				case 3:
					m.currentView = "qrcode"
				case 4:
					return m, tea.Quit
				}
			}

		case "l":
			if m.currentView == "status" || m.currentView == "gate" {
				m.licenseValid = !m.licenseValid
			}
		}
	}

	return m, nil
}

func (m *DemoModel) View() string {
	var content string

	switch m.currentView {
	case "menu":
		content = m.renderMenu()
	case "status":
		content = m.renderLicenseStatus()
	case "purchase":
		content = m.renderPurchaseFlow()
	case "gate":
		content = m.renderLicenseGate()
	case "qrcode":
		content = m.renderQRCode()
	default:
		content = m.renderMenu()
	}

	return content
}

func (m *DemoModel) renderMenu() string {
	var b strings.Builder

	// Header with prompt style
	b.WriteString(m.styles.Prompt.String())
	b.WriteString(m.styles.Title.Render("tuish") + " ")
	b.WriteString(m.styles.Muted.Render("tui components demo") + "\n\n")

	// Menu items
	for i, item := range m.menuItems {
		if i == m.menuIndex {
			b.WriteString(m.styles.Highlight.Render(tui.PointerRight+" "+item) + "\n")
		} else {
			b.WriteString(m.styles.Muted.Render("  "+item) + "\n")
		}
	}

	b.WriteString("\n")
	b.WriteString(m.styles.Muted.Render("↑↓ navigate  enter select  q quit"))

	return m.styles.Box.Render(b.String())
}

func (m *DemoModel) renderLicenseStatus() string {
	var b strings.Builder

	b.WriteString(m.styles.Prompt.String())
	b.WriteString(m.styles.Title.Render("license status") + "\n\n")

	if m.licenseValid {
		b.WriteString(m.styles.StatusValid.Render(tui.CheckMark+" valid") + "\n\n")

		// Info table style
		b.WriteString(m.styles.Muted.Render("product   ") + m.styles.Body.Render(m.productName) + "\n")
		b.WriteString(m.styles.Muted.Render("status    ") + m.styles.Success.Render("active") + "\n")
		b.WriteString(m.styles.Muted.Render("expires   ") + m.styles.Body.Render("2025-12-31") + "\n\n")

		b.WriteString(m.styles.Muted.Render("features") + "\n")
		for _, f := range m.features {
			b.WriteString("  " + m.styles.StatusValid.Render(tui.CheckMark) + " " + m.styles.Body.Render(f) + "\n")
		}
	} else {
		b.WriteString(m.styles.StatusInvalid.Render(tui.CrossMark+" no license") + "\n\n")
		b.WriteString(m.styles.Muted.Render("run ") + m.styles.Highlight.Render("tuish purchase") + m.styles.Muted.Render(" to activate"))
	}

	b.WriteString("\n\n")
	b.WriteString(m.styles.Muted.Render("l toggle  esc back"))

	boxStyle := m.styles.Box
	if m.licenseValid {
		boxStyle = m.styles.BoxSuccess
	} else {
		boxStyle = m.styles.BoxError
	}

	return boxStyle.Render(b.String())
}

func (m *DemoModel) renderPurchaseFlow() string {
	var b strings.Builder

	b.WriteString(m.styles.Prompt.String())
	b.WriteString(m.styles.Title.Render("purchase") + "\n\n")

	b.WriteString(m.styles.Body.Render("scan to complete purchase:") + "\n\n")

	// QR code
	qr := tui.RenderQRCode(m.qrURL, m.styles)
	b.WriteString(qr + "\n")

	// Status
	b.WriteString(m.styles.Muted.Render("waiting for payment...") + "\n")
	b.WriteString(tui.RenderProgressBar(0.0, 30, m.styles) + "\n\n")

	b.WriteString(m.styles.Muted.Render("esc cancel"))

	return m.styles.BoxFocused.Render(b.String())
}

func (m *DemoModel) renderLicenseGate() string {
	var b strings.Builder

	b.WriteString(m.styles.Prompt.String())
	b.WriteString(m.styles.Title.Render("license gate") + "\n\n")

	if m.licenseValid {
		// Unlocked content
		content := lipgloss.NewStyle().
			Border(lipgloss.NormalBorder()).
			BorderForeground(lipgloss.Color("#50fa7b")).
			Padding(1, 2).
			Render(
				m.styles.Success.Render("unlocked") + "\n\n" +
					m.styles.Body.Render("premium features:") + "\n" +
					m.styles.Muted.Render("  "+tui.CheckMark+" advanced analytics") + "\n" +
					m.styles.Muted.Render("  "+tui.CheckMark+" export all formats") + "\n" +
					m.styles.Muted.Render("  "+tui.CheckMark+" priority support"),
			)
		b.WriteString(content)
	} else {
		// Locked content
		content := lipgloss.NewStyle().
			Border(lipgloss.NormalBorder()).
			BorderForeground(lipgloss.Color("#44475a")).
			Padding(1, 2).
			Render(
				m.styles.Muted.Render("locked") + "\n\n" +
					m.styles.Muted.Render("premium features:") + "\n" +
					m.styles.Muted.Render("  "+tui.CrossMark+" advanced analytics") + "\n" +
					m.styles.Muted.Render("  "+tui.CrossMark+" export all formats") + "\n" +
					m.styles.Muted.Render("  "+tui.CrossMark+" priority support"),
			)
		b.WriteString(content)
	}

	b.WriteString("\n\n")
	b.WriteString(m.styles.Muted.Render("l toggle  esc back"))

	return b.String()
}

func (m *DemoModel) renderQRCode() string {
	var b strings.Builder

	b.WriteString(m.styles.Prompt.String())
	b.WriteString(m.styles.Title.Render("qr code") + "\n\n")

	qr := tui.RenderQRCode("https://github.com/tuishdotdev/tuish", m.styles)
	b.WriteString(qr + "\n")

	b.WriteString(m.styles.Muted.Render("unicode half-blocks for terminal rendering") + "\n\n")
	b.WriteString(m.styles.Muted.Render("esc back"))

	return m.styles.Box.Render(b.String())
}

func runInteractiveDemo() {
	p := tea.NewProgram(NewDemoModel(), tea.WithAltScreen())
	if _, err := p.Run(); err != nil {
		fmt.Println("error:", err)
		os.Exit(1)
	}
}

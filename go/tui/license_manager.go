package tui

import (
	"strings"
	"time"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	tuish "github.com/tuishdotdev/tuish/go"
)

// ManagerScreen represents the current screen in the license manager.
type ManagerScreen int

const (
	ScreenMenu ManagerScreen = iota
	ScreenStatus
	ScreenPurchase
	ScreenEnterKey
	ScreenConfirmClear
)

// LicenseManagerConfig contains configuration for the LicenseManager component.
type LicenseManagerConfig struct {
	// AllowManualEntry enables manual license key entry (default: true).
	AllowManualEntry bool

	// Email is pre-filled for purchase flow.
	Email string

	// OnExit is called when user exits the manager.
	OnExit func()

	// Styles allows custom styling.
	Styles *Styles
}

// DefaultLicenseManagerConfig returns the default configuration.
func DefaultLicenseManagerConfig() LicenseManagerConfig {
	return LicenseManagerConfig{
		AllowManualEntry: true,
	}
}

// MenuItem represents a menu item.
type MenuItem struct {
	Label string
	Value string
	Icon  string
}

// LicenseManager provides a complete self-service license management UI.
type LicenseManager struct {
	sdk    *tuish.SDK
	config LicenseManagerConfig
	styles Styles

	screen          ManagerScreen
	menuItems       []MenuItem
	selectedIndex   int
	licenseStatus   *LicenseStatus
	purchaseFlow    *PurchaseFlow
	manualKeyInput  string
	manualKeyError  string
	manualKeySuccess bool
	confirmSelected int // 0 = No, 1 = Yes

	result *tuish.LicenseCheckResult
}

// NewLicenseManager creates a new LicenseManager component.
func NewLicenseManager(sdk *tuish.SDK, config ...LicenseManagerConfig) *LicenseManager {
	cfg := DefaultLicenseManagerConfig()
	if len(config) > 0 {
		cfg = config[0]
	}

	styles := DefaultStyles()
	if cfg.Styles != nil {
		styles = *cfg.Styles
	}

	m := &LicenseManager{
		sdk:    sdk,
		config: cfg,
		styles: styles,
		screen: ScreenMenu,
	}

	m.licenseStatus = NewLicenseStatus(sdk, LicenseStatusConfig{Styles: &styles})

	return m
}

// Init initializes the LicenseManager.
func (m *LicenseManager) Init() tea.Cmd {
	return m.checkLicense
}

// Update handles messages for the LicenseManager.
func (m *LicenseManager) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case LicenseCheckedMsg:
		m.result = msg.Result
		m.buildMenuItems()
		return m, nil

	case LicenseStoredMsg:
		if msg.Error != nil {
			m.manualKeyError = msg.Error.Error()
		} else {
			m.manualKeySuccess = true
			m.manualKeyInput = ""
			// Return to menu after delay
			return m, tea.Tick(2*time.Second, func(t time.Time) tea.Msg {
				return NavigateMsg{Screen: "menu"}
			})
		}

	case LicenseClearedMsg:
		m.screen = ScreenMenu
		return m, m.checkLicense

	case NavigateMsg:
		switch msg.Screen {
		case "menu":
			m.screen = ScreenMenu
			m.manualKeySuccess = false
			m.manualKeyError = ""
			return m, m.checkLicense
		}

	case tea.KeyMsg:
		return m.handleKeyPress(msg)
	}

	// Pass messages to sub-components
	switch m.screen {
	case ScreenStatus:
		var cmd tea.Cmd
		_, cmd = m.licenseStatus.Update(msg)
		return m, cmd

	case ScreenPurchase:
		if m.purchaseFlow != nil {
			var cmd tea.Cmd
			_, cmd = m.purchaseFlow.Update(msg)

			// Check if purchase completed
			if m.purchaseFlow.IsSuccess() {
				return m, tea.Tick(2*time.Second, func(t time.Time) tea.Msg {
					return NavigateMsg{Screen: "menu"}
				})
			}
			return m, cmd
		}
	}

	return m, nil
}

func (m *LicenseManager) handleKeyPress(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	key := msg.String()

	switch m.screen {
	case ScreenMenu:
		return m.handleMenuKeyPress(key)

	case ScreenStatus:
		if key == KeyEscape || key == KeyQ {
			m.screen = ScreenMenu
		}

	case ScreenPurchase:
		// Handled by PurchaseFlow
		if key == KeyEscape {
			m.screen = ScreenMenu
			m.purchaseFlow = nil
		}

	case ScreenEnterKey:
		return m.handleEnterKeyKeyPress(msg)

	case ScreenConfirmClear:
		return m.handleConfirmClearKeyPress(key)
	}

	return m, nil
}

func (m *LicenseManager) handleMenuKeyPress(key string) (tea.Model, tea.Cmd) {
	switch key {
	case KeyUp:
		if m.selectedIndex > 0 {
			m.selectedIndex--
		}

	case KeyDown:
		if m.selectedIndex < len(m.menuItems)-1 {
			m.selectedIndex++
		}

	case KeyEnter:
		return m.selectMenuItem()

	case KeyQ:
		if m.config.OnExit != nil {
			m.config.OnExit()
		}
		return m, tea.Quit
	}

	return m, nil
}

func (m *LicenseManager) handleEnterKeyKeyPress(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	key := msg.String()

	switch key {
	case KeyEscape:
		m.screen = ScreenMenu
		m.manualKeyInput = ""
		m.manualKeyError = ""
		m.manualKeySuccess = false

	case KeyEnter:
		return m.submitManualKey()

	case KeyBackspace:
		if len(m.manualKeyInput) > 0 {
			m.manualKeyInput = m.manualKeyInput[:len(m.manualKeyInput)-1]
		}

	default:
		// Append printable characters
		if len(msg.String()) == 1 {
			m.manualKeyInput += msg.String()
		}
	}

	return m, nil
}

func (m *LicenseManager) handleConfirmClearKeyPress(key string) (tea.Model, tea.Cmd) {
	switch key {
	case KeyUp, KeyDown:
		m.confirmSelected = 1 - m.confirmSelected

	case KeyEnter:
		if m.confirmSelected == 1 { // Yes
			return m, func() tea.Msg {
				err := m.sdk.ClearLicense()
				return LicenseClearedMsg{Error: err}
			}
		}
		m.screen = ScreenMenu

	case KeyEscape, KeyN:
		m.screen = ScreenMenu

	case KeyY:
		return m, func() tea.Msg {
			err := m.sdk.ClearLicense()
			return LicenseClearedMsg{Error: err}
		}
	}

	return m, nil
}

func (m *LicenseManager) selectMenuItem() (tea.Model, tea.Cmd) {
	if m.selectedIndex >= len(m.menuItems) {
		return m, nil
	}

	item := m.menuItems[m.selectedIndex]

	switch item.Value {
	case "status":
		m.screen = ScreenStatus

	case "purchase":
		m.screen = ScreenPurchase
		m.purchaseFlow = NewPurchaseFlow(m.sdk, PurchaseFlowConfig{
			Email: m.config.Email,
		})
		return m, m.purchaseFlow.Init()

	case "enter-key":
		m.screen = ScreenEnterKey
		m.manualKeyInput = ""
		m.manualKeyError = ""
		m.manualKeySuccess = false

	case "clear":
		m.screen = ScreenConfirmClear
		m.confirmSelected = 0

	case "exit":
		if m.config.OnExit != nil {
			m.config.OnExit()
		}
		return m, tea.Quit
	}

	return m, nil
}

func (m *LicenseManager) submitManualKey() (tea.Model, tea.Cmd) {
	m.manualKeyError = ""
	m.manualKeySuccess = false

	key := strings.TrimSpace(m.manualKeyInput)
	if key == "" {
		m.manualKeyError = "Please enter a license key"
		return m, nil
	}

	// Validate the key format
	info, err := m.sdk.ExtractLicenseInfo(key)
	if err != nil {
		m.manualKeyError = "Invalid license key format"
		return m, nil
	}

	_ = info // We don't need the info, just validating format

	// Store the key
	return m, func() tea.Msg {
		err := m.sdk.StoreLicense(key)
		return LicenseStoredMsg{Error: err}
	}
}

// View renders the LicenseManager.
func (m *LicenseManager) View() string {
	switch m.screen {
	case ScreenMenu:
		return m.renderMenu()
	case ScreenStatus:
		return m.renderStatus()
	case ScreenPurchase:
		return m.renderPurchase()
	case ScreenEnterKey:
		return m.renderEnterKey()
	case ScreenConfirmClear:
		return m.renderConfirmClear()
	default:
		return ""
	}
}

func (m *LicenseManager) renderMenu() string {
	var sb strings.Builder

	// Title
	sb.WriteString(m.styles.Bold.Render("License Manager"))
	sb.WriteString("\n")

	// Current license status (compact)
	if m.result != nil && m.result.License != nil {
		status := RenderLicenseStatus(m.result, LicenseStatusConfig{Compact: true})
		sb.WriteString(m.styles.Muted.Render("Current: "))
		sb.WriteString(status)
		sb.WriteString("\n")
	}
	sb.WriteString("\n")

	// Menu items
	for i, item := range m.menuItems {
		cursor := "  "
		style := m.styles.Body
		if i == m.selectedIndex {
			cursor = ArrowRight + " "
			style = m.styles.Highlight
		}

		sb.WriteString(cursor)
		sb.WriteString(item.Icon + " ")
		sb.WriteString(style.Render(item.Label))
		sb.WriteString("\n")
	}
	sb.WriteString("\n")

	// Controls
	sb.WriteString(m.styles.Muted.Render("Press "))
	sb.WriteString(m.styles.KeyLabel.Render("q"))
	sb.WriteString(m.styles.Muted.Render(" to exit"))

	return sb.String()
}

func (m *LicenseManager) renderStatus() string {
	var sb strings.Builder

	sb.WriteString(m.styles.Bold.Render("License Status"))
	sb.WriteString("\n\n")

	sb.WriteString(m.licenseStatus.View())
	sb.WriteString("\n\n")

	sb.WriteString(RenderKeyHint("Esc", "go back", m.styles))

	return sb.String()
}

func (m *LicenseManager) renderPurchase() string {
	var sb strings.Builder

	sb.WriteString(m.styles.Bold.Render("Purchase License"))
	sb.WriteString("\n\n")

	if m.purchaseFlow != nil {
		sb.WriteString(m.purchaseFlow.View())
	}

	return sb.String()
}

func (m *LicenseManager) renderEnterKey() string {
	var sb strings.Builder

	sb.WriteString(m.styles.Bold.Render("Enter License Key"))
	sb.WriteString("\n")
	sb.WriteString(m.styles.Muted.Render("Paste your license key below:"))
	sb.WriteString("\n\n")

	// Input field
	inputStyle := lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(m.styles.Theme.BorderFocus).
		Padding(0, 1).
		Width(50)

	displayKey := m.manualKeyInput
	if displayKey == "" {
		displayKey = m.styles.Muted.Render("TUISH-XXXX-XXXX-XXXX...")
	}
	sb.WriteString(inputStyle.Render(displayKey))
	sb.WriteString("\n\n")

	// Error message
	if m.manualKeyError != "" {
		sb.WriteString(m.styles.CrossMark.Render("") + m.styles.Error.Render(m.manualKeyError))
		sb.WriteString("\n\n")
	}

	// Success message
	if m.manualKeySuccess {
		sb.WriteString(m.styles.CheckMark.Render("") + m.styles.Success.Render("License activated successfully!"))
		sb.WriteString("\n\n")
	}

	// Controls
	hints := [][2]string{
		{"Enter", "submit"},
		{"Esc", "cancel"},
	}
	sb.WriteString(RenderKeyHints(hints, m.styles))

	return sb.String()
}

func (m *LicenseManager) renderConfirmClear() string {
	var sb strings.Builder

	sb.WriteString(m.styles.Warning.Render("Clear License?"))
	sb.WriteString("\n\n")
	sb.WriteString(m.styles.Body.Render("This will remove your license from this device."))
	sb.WriteString("\n")
	sb.WriteString(m.styles.Muted.Render("You can re-enter it later if needed."))
	sb.WriteString("\n\n")

	// Options
	options := []string{"No, keep license", "Yes, clear license"}
	for i, opt := range options {
		cursor := "  "
		style := m.styles.Body
		if i == m.confirmSelected {
			cursor = ArrowRight + " "
			style = m.styles.Highlight
		}
		sb.WriteString(cursor)
		sb.WriteString(style.Render(opt))
		sb.WriteString("\n")
	}

	return sb.String()
}

func (m *LicenseManager) buildMenuItems() {
	m.menuItems = []MenuItem{
		{Label: "View License Status", Value: "status", Icon: Clipboard},
	}

	if m.result == nil || !m.result.Valid {
		m.menuItems = append(m.menuItems, MenuItem{
			Label: "Purchase License",
			Value: "purchase",
			Icon:  ShoppingCart,
		})
	}

	if m.config.AllowManualEntry {
		m.menuItems = append(m.menuItems, MenuItem{
			Label: "Enter License Key",
			Value: "enter-key",
			Icon:  Key,
		})
	}

	if m.result != nil && m.result.License != nil {
		m.menuItems = append(m.menuItems, MenuItem{
			Label: "Clear License",
			Value: "clear",
			Icon:  Trash,
		})
	}

	m.menuItems = append(m.menuItems, MenuItem{
		Label: "Exit",
		Value: "exit",
		Icon:  Wave,
	})

	// Reset selection if out of bounds
	if m.selectedIndex >= len(m.menuItems) {
		m.selectedIndex = 0
	}
}

func (m *LicenseManager) checkLicense() tea.Msg {
	result, err := m.sdk.CheckLicense(nil)
	return LicenseCheckedMsg{Result: result, Error: err}
}

// Screen returns the current screen.
func (m *LicenseManager) Screen() ManagerScreen {
	return m.screen
}

// Result returns the current license check result.
func (m *LicenseManager) Result() *tuish.LicenseCheckResult {
	return m.result
}
